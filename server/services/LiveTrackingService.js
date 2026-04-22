const EvolutionService = require('./EvolutionService');
const MessageVariation = require('../utils/MessageVariation');
const { normalizePhone } = require('../utils/phoneHelper');

// Haversine (metros)
const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // raio da Terra em metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Anti-spam: guarda última notificação por passageiro_id para evitar repetir
// Map<passageiro_id, { nearby: timestamp, arriving: timestamp }>
const notificationCooldowns = new Map();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos

const RAIO_COLETA = 400; // metros - marca como recolhido

class LiveTrackingService {

  /**
   * Processa um update de localização GPS do motorista.
   * Chamado a cada ~30s pelo webhook de live location.
   */
  async processLocationUpdate(motoristaJid, lat, lng) {
    try {
      const { Motorista, Viagem, ViagemPassageiro, Passageiro, Endereco } = require('../models');
      const normalizedJid = normalizePhone(motoristaJid);
      const currentLat = Number(lat);
      const currentLng = Number(lng);

      if (!normalizedJid || Number.isNaN(currentLat) || Number.isNaN(currentLng)) {
        console.log(`[GPS] Localizacao ignorada: dados invalidos. motorista=${motoristaJid || 'N/A'} lat=${lat} lng=${lng}`);
        return;
      }

      // 1. Identifica o motorista
      const motorista = await Motorista.findOne({ where: { telefone: normalizedJid, status: 'ativo' } });
      if (!motorista) {
        console.log(`[GPS] Motorista nao encontrado ou inativo para ${normalizedJid}. Ignorando localizacao.`);
        return;
      }

      const raioNotificacao = motorista.raio_notificacao || 2500;

      // 2. Busca viagem ativa do motorista. Se a rota ja foi gerada, a primeira
      // localizacao do motorista inicia automaticamente o rastreamento.
      const hojeStr = new Date().toISOString().split('T')[0];
      let viagem = await Viagem.findOne({
        where: { motorista_id: motorista.id, data: hojeStr, status: 'em_andamento' },
        order: [['updatedAt', 'DESC']]
      });

      if (!viagem) {
        viagem = await Viagem.findOne({
          where: { motorista_id: motorista.id, data: hojeStr, status: 'rota_gerada' },
          order: [['updatedAt', 'DESC']]
        });

        if (viagem) {
          viagem.status = 'em_andamento';
          viagem.trecho_ativo = viagem.trecho_ativo || await this._inferirTrechoInicial(viagem.id, ViagemPassageiro);
          viagem.parada_atual = viagem.parada_atual || 1;
          await viagem.save();
          console.log(`[GPS] Viagem #${viagem.id} iniciada automaticamente no trecho ${viagem.trecho_ativo} pela primeira localizacao de ${motorista.nome}.`);
        }
      }

      if (!viagem) {
        console.log(`[GPS] Nenhuma viagem em andamento ou rota gerada hoje para ${motorista.nome} (${normalizedJid}).`);
        return;
      }

      if (!viagem.trecho_ativo) {
        viagem.trecho_ativo = await this._inferirTrechoInicial(viagem.id, ViagemPassageiro);
        viagem.parada_atual = viagem.parada_atual || 1;
        await viagem.save();
        console.log(`[GPS] Viagem #${viagem.id} estava sem trecho ativo; assumindo ${viagem.trecho_ativo}.`);
      }

      const trecho = viagem.trecho_ativo; // 'ida' ou 'volta'
      const statusField = trecho === 'ida' ? 'status_ida' : 'status_volta';

      // 3. Busca os passageiros da rota ordenados pela ordem_rota
      const registros = await ViagemPassageiro.findAll({
        where: { viagem_id: viagem.id },
        include: [{
          model: Passageiro,
          include: [
            { model: Endereco, as: 'enderecoIda' },
            { model: Endereco, as: 'enderecoVolta' }
          ]
        }],
        order: [['ordem_rota', 'ASC']]
      });

      // Filtra só quem confirmou nesse trecho e ainda não foi recolhido
      const passageirosOrdenados = registros
        .filter(r => r[statusField] === 'confirmado' || r[statusField] === 'em_rota')
        .filter(r => r.Passageiro && r.ordem_rota);

      if (passageirosOrdenados.length === 0) {
        // Todos recolhidos! Finaliza a rota
        await this._finalizarTrecho(viagem, trecho, registros.length, motorista);
        return;
      }

      // 4. Pega o PRIMEIRO da fila (parada atual) — fila estrita
      const paradaAtual = passageirosOrdenados[0];
      const passAtual = paradaAtual.Passageiro;
      const endAtual = trecho === 'ida' ? passAtual.enderecoIda : passAtual.enderecoVolta;
      const latPass = endAtual?.latitude || passAtual.latitude;
      const lngPass = endAtual?.longitude || passAtual.longitude;

      if (latPass === undefined || latPass === null || lngPass === undefined || lngPass === null) {
        console.log(`[GPS] Passageiro ${passAtual.nome} sem coordenadas para o trecho ${trecho}.`);
        return;
      }

      const distanciaAtual = haversineMeters(currentLat, currentLng, latPass, lngPass);

      console.log(`[GPS] Motorista ${motorista.nome} → ${passAtual.nome}: ${Math.round(distanciaAtual)}m (raio coleta: ${RAIO_COLETA}m, raio notif: ${raioNotificacao}m)`);

      // 5. Lógica de proximidade SEQUENCIAL

      // 5a. Chegou no passageiro atual (≤ 400m) → marca como recolhido
      if (distanciaAtual <= RAIO_COLETA) {
        paradaAtual[statusField] = 'recolhido';
        await paradaAtual.save();
        console.log(`[GPS] ✅ ${passAtual.nome} marcado como RECOLHIDO`);

        // Limpa cooldown desse passageiro
        notificationCooldowns.delete(passAtual.id);

        // Avança parada_atual
        viagem.parada_atual = (viagem.parada_atual || 1) + 1;
        await viagem.save();

        // Notifica o PRÓXIMO da fila (se existir)
        const proximoRegistro = passageirosOrdenados[1]; // próximo após o atual
        if (proximoRegistro) {
          const proxPass = proximoRegistro.Passageiro;
          const telefoneProx = proxPass.telefone_responsavel || proxPass.telefone;
          if (telefoneProx) {
            await this._enviarComCooldown(proxPass.id, 'arriving', telefoneProx,
              MessageVariation.rastreamento.vanChegando(proxPass.nome)
            );
          }
        } else {
          // Era o último! Finaliza trecho
          await this._finalizarTrecho(viagem, trecho, registros.filter(r => r[statusField] === 'recolhido').length + 1, motorista);
        }
        return;
      }

      // 5b. Dentro do raio de notificação → avisa "fique pronto"
      if (distanciaAtual <= raioNotificacao) {
        const telefoneAtual = passAtual.telefone_responsavel || passAtual.telefone;
        if (telefoneAtual) {
          // Marca como em_rota se ainda não estava
          if (paradaAtual[statusField] === 'confirmado') {
            paradaAtual[statusField] = 'em_rota';
            await paradaAtual.save();
          }

          await this._enviarComCooldown(passAtual.id, 'nearby', telefoneAtual,
            MessageVariation.rastreamento.vanProxima(passAtual.nome)
          );
        }
      }

      // 6. Proximidade da Escola/Faculdade (apenas no trecho IDA)
      if (trecho === 'ida' && motorista.escola_latitude && motorista.escola_longitude) {
        const distanciaEscola = haversineMeters(currentLat, currentLng, motorista.escola_latitude, motorista.escola_longitude);
        
        if (distanciaEscola <= raioNotificacao) {
          const { GrupoMotorista } = require('../models');
          const grupos = await GrupoMotorista.findAll({ where: { motorista_id: motorista.id } });
          
          const escolaNome = motorista.escola_nome || 'escola';
          const msgGrupo = MessageVariation.rastreamento.vanChegandoEscola(escolaNome);

          for (const grupo of grupos) {
            // Usa cooldown com chave especial pra não spammar o grupo
            await this._enviarComCooldown(`escola_${motorista.id}`, 'school', grupo.group_jid, msgGrupo);
          }
        }
      }

    } catch (error) {
      console.error('[LiveTracking] Erro ao processar location update:', error.message);
    }
  }

  async _inferirTrechoInicial(viagemId, ViagemPassageiro) {
    const registros = await ViagemPassageiro.findAll({ where: { viagem_id: viagemId } });
    const statusAtivo = new Set(['confirmado', 'em_rota']);
    const temIda = registros.some(r => statusAtivo.has(r.status_ida));
    const temVolta = registros.some(r => statusAtivo.has(r.status_volta));

    if (temIda) return 'ida';
    if (temVolta) return 'volta';
    return 'ida';
  }

  /**
   * Finaliza o trecho ativo da viagem
   */
  async _finalizarTrecho(viagem, trecho, qtdRecolhidos, motorista) {
    console.log(`[GPS] 🏁 Trecho ${trecho} finalizado para motorista ${motorista.nome}!`);
    
    viagem.status = 'finalizada';
    viagem.trecho_ativo = null;
    await viagem.save();

    await EvolutionService.sendMessage(
      motorista.telefone,
      MessageVariation.rastreamento.rotaFinalizada(trecho, qtdRecolhidos)
    );
  }

  /**
   * Envia mensagem com proteção anti-spam (cooldown de 5 min por tipo)
   */
  async _enviarComCooldown(passageiroId, tipo, telefone, mensagem) {
    const key = passageiroId;
    const agora = Date.now();

    if (!notificationCooldowns.has(key)) {
      notificationCooldowns.set(key, {});
    }

    const cooldowns = notificationCooldowns.get(key);
    const ultimoEnvio = cooldowns[tipo] || 0;

    if (agora - ultimoEnvio < COOLDOWN_MS) {
      console.log(`[GPS] Cooldown ativo para passageiro ${passageiroId} (${tipo}). Pulando notificação.`);
      return;
    }

    cooldowns[tipo] = agora;
    notificationCooldowns.set(key, cooldowns);

    await EvolutionService.sendMessage(telefone, mensagem);
    console.log(`[GPS] Notificação '${tipo}' enviada para passageiro ${passageiroId}`);
  }
}

module.exports = new LiveTrackingService();
