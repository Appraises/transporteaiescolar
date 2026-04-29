const { Op } = require('sequelize');
const Passageiro = require('../models/Passageiro');
const Viagem = require('../models/Viagem');
const ViagemPassageiro = require('../models/ViagemPassageiro');
const Motorista = require('../models/Motorista');
const RoutingService = require('../services/RoutingService');
const EvolutionService = require('../services/EvolutionService');
const MotoristaLinkService = require('../services/MotoristaLinkService');

class ViagemController {
  constructor() {
    this.calcularRotaOtima = this.calcularRotaOtima.bind(this);
    this.getViagemAtiva = this.getViagemAtiva.bind(this);
    this.avancarParada = this.avancarParada.bind(this);
    this.syncLocalizacao = this.syncLocalizacao.bind(this);
    this.finalizarViagem = this.finalizarViagem.bind(this);
  }

  async calcularRotaOtima(req, res) {
    try {
      const { turno, trecho = 'ida' } = req.body;
      const motoristaId = req.motoristaId;

      const motorista = await Motorista.findByPk(motoristaId);
      if (!motorista) {
        return res.status(404).json({ error: 'Motorista nao encontrado.' });
      }

      const coordsBase = {
        lat: motorista?.latitude || -23.55052,
        lng: motorista?.longitude || -46.633308
      };

      const Endereco = require('../models/Endereco');
      const alunosBrutos = await Passageiro.findAll({
        where: { motorista_id: motoristaId },
        include: [
          { model: Endereco, as: 'enderecoIda' },
          { model: Endereco, as: 'enderecoVolta' }
        ]
      });

      const alunosPreparados = alunosBrutos.map((aluno) => {
        let lat = aluno.latitude;
        let lng = aluno.longitude;
        let endereco = aluno.logradouro;

        if (trecho === 'ida' && aluno.enderecoIda) {
          lat = aluno.enderecoIda.latitude || lat;
          lng = aluno.enderecoIda.longitude || lng;
          endereco = aluno.enderecoIda.endereco_completo;
        } else if (trecho === 'volta' && aluno.enderecoVolta) {
          lat = aluno.enderecoVolta.latitude || lat;
          lng = aluno.enderecoVolta.longitude || lng;
          endereco = aluno.enderecoVolta.endereco_completo;
        }

        return {
          ...aluno.toJSON(),
          latitude: lat,
          longitude: lng,
          enderecoFormatado: endereco || aluno.bairro || 'Sem endereco'
        };
      });

      const alunosValidos = alunosPreparados.filter((aluno) => aluno.latitude && aluno.longitude);

      if (alunosValidos.length === 0) {
        return res.status(400).json({ error: 'Nenhum aluno com endereco geocodificado.' });
      }

      const startCalc = Date.now();
      const resultado = RoutingService.calculateOptimalRoute(alunosValidos, coordsBase);
      const calcTime = Date.now() - startCalc;

      let textRoute = `*📌 Rota Otima Gerada (${turno} - ${trecho.toUpperCase()})*\n\n1. Base (Casa do Motorista)\n`;
      resultado.orderedPath.forEach((aluno, index) => {
        textRoute += `${index + 2}. ${aluno.nome} - 📍${aluno.enderecoFormatado}\n`;
      });
      textRoute += `${resultado.orderedPath.length + 2}. Retorno (Base)`;
      textRoute = MotoristaLinkService.appendRotaAtivaLink(textRoute, motorista);

      const whatsappMotorista = motorista.telefone || '55999999999@s.whatsapp.net';
      await EvolutionService.sendMessage(whatsappMotorista, textRoute);

      return res.status(200).json({
        message: 'Rota calculada e enviada via WhatsApp.',
        pathLength: resultado.orderedPath.length,
        calculationMs: calcTime,
        routePreview: resultado.orderedPath
      });
    } catch (error) {
      console.error('[ViagemController] Falha em calcularRotaOtima:', error);
      return res.status(500).json({ error: 'Erro interno ao roteirizar.' });
    }
  }

  async getViagemAtiva(req, res) {
    try {
      const motoristaId = req.motoristaId;
      const viagem = await this._buscarViagemAtivaOuGerada(motoristaId);

      if (!viagem) {
        return res.status(200).json({ viagem: null });
      }

      const trechoExibicao = viagem.trecho_ativo || (await this._inferirTrechoInicial(viagem.id));

      const paradas = await ViagemPassageiro.findAll({
        where: { viagem_id: viagem.id },
        order: [['ordem_rota', 'ASC']]
      });

      if (paradas.length === 0) {
        return res.status(200).json({
          viagem: {
            ...viagem.toJSON(),
            trecho_ativo: trechoExibicao
          },
          rota: []
        });
      }

      const passageirosIds = paradas.map((parada) => parada.passageiro_id);
      const Endereco = require('../models/Endereco');
      const passageirosBase = await Passageiro.findAll({
        where: { id: passageirosIds },
        include: [
          { model: Endereco, as: 'enderecoIda' },
          { model: Endereco, as: 'enderecoVolta' }
        ]
      });

      const rota = paradas
        .map((parada) => {
          const passageiro = passageirosBase.find((item) => item.id === parada.passageiro_id);
          if (!passageiro) {
            return null;
          }

          let lat = passageiro.latitude;
          let lng = passageiro.longitude;
          let endereco = passageiro.logradouro;

          if (trechoExibicao === 'ida' && passageiro.enderecoIda) {
            lat = passageiro.enderecoIda.latitude || lat;
            lng = passageiro.enderecoIda.longitude || lng;
            endereco = passageiro.enderecoIda.endereco_completo;
          } else if (trechoExibicao === 'volta' && passageiro.enderecoVolta) {
            lat = passageiro.enderecoVolta.latitude || lat;
            lng = passageiro.enderecoVolta.longitude || lng;
            endereco = passageiro.enderecoVolta.endereco_completo;
          }

          return {
            viagemPassageiroId: parada.id,
            ordem: parada.ordem_rota,
            statusIda: parada.status_ida,
            statusVolta: parada.status_volta,
            passageiro: {
              id: passageiro.id,
              nome: passageiro.nome,
              escola: passageiro.escola,
              latitude: lat,
              longitude: lng,
              enderecoFormatado: endereco || passageiro.bairro
            }
          };
        })
        .filter(Boolean);

      const viagemData = {
        ...viagem.toJSON(),
        trecho_ativo: trechoExibicao
      };

      // Inclui dados da escola quando em fase de navegação para destino
      if (viagem.status === 'indo_para_escola') {
        const motorista = await Motorista.findByPk(motoristaId);
        if (motorista) {
          viagemData.escola = {
            nome: motorista.escola_nome || 'Escola',
            latitude: motorista.escola_latitude,
            longitude: motorista.escola_longitude
          };
        }
      }

      return res.status(200).json({
        viagem: viagemData,
        rota
      });
    } catch (error) {
      console.error('[ViagemController] Falha em getViagemAtiva:', error?.stack || error?.message || error);
      return res.status(500).json({ error: 'Erro interno ao buscar viagem ativa.' });
    }
  }

  async avancarParada(req, res) {
    try {
      const motoristaId = req.motoristaId;
      const viagem = await this._buscarViagemAtivaOuGerada(motoristaId);

      if (!viagem) {
        return res.status(404).json({ error: 'Nenhuma viagem em andamento.' });
      }

      if (viagem.status === 'rota_gerada') {
        viagem.status = 'em_andamento';
      }

      if (!viagem.trecho_ativo) {
        viagem.trecho_ativo = await this._inferirTrechoInicial(viagem.id);
      }

      if (!viagem.parada_atual) {
        viagem.parada_atual = 1;
      }

      await viagem.save();

      const paradaAtualInfo = await ViagemPassageiro.findOne({
        where: { viagem_id: viagem.id, ordem_rota: viagem.parada_atual }
      });

      if (paradaAtualInfo) {
        const novoStatus = viagem.trecho_ativo === 'ida' ? 'recolhido' : 'entregue';
        if (viagem.trecho_ativo === 'ida') {
          paradaAtualInfo.status_ida = novoStatus;
        } else {
          paradaAtualInfo.status_volta = novoStatus;
        }
        await paradaAtualInfo.save();
      }

      viagem.parada_atual += 1;

      const totalParadas = await ViagemPassageiro.count({ where: { viagem_id: viagem.id } });
      if (viagem.parada_atual > totalParadas) {
        // Verifica se o motorista tem escola cadastrada para navegar até lá
        const motorista = await Motorista.findByPk(motoristaId);
        if (motorista && motorista.escola_latitude && motorista.escola_longitude) {
          viagem.status = 'indo_para_escola';
        } else {
          viagem.status = 'finalizada';
        }
      }

      await viagem.save();

      return res.status(200).json({
        message: 'Parada avancada com sucesso',
        novaParada: viagem.parada_atual,
        statusViagem: viagem.status
      });
    } catch (error) {
      console.error('[ViagemController] Falha em avancarParada:', error);
      return res.status(500).json({ error: 'Erro ao avancar parada.' });
    }
  }

  async syncLocalizacao(req, res) {
    try {
      const motorista = req.motorista;
      const { lat, lng } = req.body;

      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude e longitude sao obrigatorias.' });
      }

      const LiveTrackingService = require('../services/LiveTrackingService');
      LiveTrackingService.processLocationUpdate(motorista.telefone, lat, lng).catch((error) => {
        console.error('[ViagemController] Erro no LiveTrackingService:', error);
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[ViagemController] Falha no syncLocalizacao:', error);
      return res.status(500).json({ error: 'Erro ao sincronizar localizacao.' });
    }
  }

  async finalizarViagem(req, res) {
    try {
      const motoristaId = req.motoristaId;
      const viagem = await Viagem.findOne({
        where: {
          motorista_id: motoristaId,
          status: 'indo_para_escola'
        },
        order: [['updatedAt', 'DESC']]
      });

      if (!viagem) {
        return res.status(404).json({ error: 'Nenhuma viagem em fase de destino encontrada.' });
      }

      viagem.status = 'finalizada';
      viagem.trecho_ativo = null;
      await viagem.save();

      // Conta passageiros atendidos para o resumo
      const totalAtendidos = await ViagemPassageiro.count({ where: { viagem_id: viagem.id } });

      return res.status(200).json({
        message: 'Viagem finalizada com sucesso.',
        totalAtendidos
      });
    } catch (error) {
      console.error('[ViagemController] Falha em finalizarViagem:', error);
      return res.status(500).json({ error: 'Erro ao finalizar viagem.' });
    }
  }

  async _buscarViagemAtivaOuGerada(motoristaId) {
    const viagens = await Viagem.findAll({
      where: {
        motorista_id: motoristaId,
        status: {
          [Op.in]: ['em_andamento', 'rota_gerada', 'indo_para_escola']
        }
      },
      order: [['updatedAt', 'DESC']]
    });

    if (viagens.length === 0) {
      return null;
    }

    return viagens.find((viagem) => viagem.status === 'em_andamento') || viagens[0];
  }

  async _inferirTrechoInicial(viagemId) {
    const registros = await ViagemPassageiro.findAll({ where: { viagem_id: viagemId } });
    const statusAtivo = new Set(['confirmado', 'em_rota']);

    if (registros.some((registro) => statusAtivo.has(registro.status_ida))) {
      return 'ida';
    }

    if (registros.some((registro) => statusAtivo.has(registro.status_volta))) {
      return 'volta';
    }

    return 'ida';
  }
}

module.exports = new ViagemController();
