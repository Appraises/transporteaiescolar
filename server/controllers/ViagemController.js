const Passageiro = require('../models/Passageiro');
const RoutingService = require('../services/RoutingService');
const EvolutionService = require('../services/EvolutionService');
const Motorista = require('../models/Motorista'); // Casa do motorista (base)

class ViagemController {
  
  async calcularRotaOtima(req, res) {
    try {
      const { turno, trecho = 'ida' } = req.body;
      const motoristaId = req.motoristaId;
      
      // 1. Achar a base do Motorista (Placeholder se ele n tiver lat/lng setamos mock)
      const motorista = await Motorista.findByPk(motoristaId);
      const coordsBase = { 
        lat: motorista?.latitude || -23.550520, 
        lng: motorista?.longitude || -46.633308 
      };

      // 2. Buscar todos os alunos que vão/voltam daquele turno 
      // Inclui os relacionamentos de endereço
      const Endereco = require('../models/Endereco');
      const alunosBrutos = await Passageiro.findAll({
         where: { motorista_id: motoristaId },
         include: [
            { model: Endereco, as: 'enderecoIda' },
            { model: Endereco, as: 'enderecoVolta' }
         ]
      });
      
      // Prepara os alunos com a lat/lng do endereço ativo escolhido para o trecho
      const alunosPreparados = alunosBrutos.map(a => {
         let lat = a.latitude;
         let lng = a.longitude;
         let endereco = a.logradouro;

         if (trecho === 'ida' && a.enderecoIda) {
             lat = a.enderecoIda.latitude || lat;
             lng = a.enderecoIda.longitude || lng;
             endereco = a.enderecoIda.endereco_completo;
         } else if (trecho === 'volta' && a.enderecoVolta) {
             lat = a.enderecoVolta.latitude || lat;
             lng = a.enderecoVolta.longitude || lng;
             endereco = a.enderecoVolta.endereco_completo;
         }

         return {
             ...a.toJSON(),
             latitude: lat,
             longitude: lng,
             enderecoFormatado: endereco || a.bairro || 'Sem endereço'
         };
      });

      const alunosValidos = alunosPreparados.filter(a => a.latitude && a.longitude);

      if(alunosValidos.length === 0) {
        return res.status(400).json({ error: 'Nenhum aluno com endereço geocodificado.' });
      }

      // 3. Roteirização TSP
      const startCalc = Date.now();
      const resultado = RoutingService.calculateOptimalRoute(alunosValidos, coordsBase);      
      const calcTime = Date.now() - startCalc;

      // 4. Montar a Lista para envio ao WhatsApp do Motorista
      let textRoute = `*📌 Rota Ótima Gerada (${turno} - ${trecho.toUpperCase()})*\n\n1. Base (Casa do Motorista)\n`;
      resultado.orderedPath.forEach((aluno, index) => {
        textRoute += `${index + 2}. ${aluno.nome} -📍${aluno.enderecoFormatado}\n`;
      });
      textRoute += `${resultado.orderedPath.length + 2}. Retorno (Base)`;

      // Envia pra ele (Se tiver mock, logará apenas no Console)
      const whatsappMotorista = motorista?.telefone || '55999999999@s.whatsapp.net';
      await EvolutionService.sendMessage(whatsappMotorista, textRoute);

      return res.status(200).json({
        message: 'Rota calculada e enviada via WhatsApp.',
        pathLength: resultado.orderedPath.length,
        calculationMs: calcTime,
        routePreview: resultado.orderedPath
      });

    } catch (error) {
      console.error('[ViagemController] Falha em calcularRotaOtima:', error);
      res.status(500).json({ error: 'Erro interno ao roteirizar.' });
    }
  }

}

module.exports = new ViagemController();
