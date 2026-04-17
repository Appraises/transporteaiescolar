const Passageiro = require('../models/Passageiro');
const RoutingService = require('../services/RoutingService');
const EvolutionService = require('../services/EvolutionService');
const Motorista = require('../models/Motorista'); // Casa do motorista (base)

class ViagemController {
  
  async calcularRotaOtima(req, res) {
    try {
      const { motoristaId, turno } = req.body;
      
      // 1. Achar a base do Motorista (Placeholder se ele n tiver lat/lng setamos mock)
      const motorista = await Motorista.findByPk(motoristaId || 1);
      const coordsBase = { 
        lat: motorista?.latitude || -23.550520, 
        lng: motorista?.longitude || -46.633308 
      };

      // 2. Buscar todos os alunos que vão/voltam daquele turno 
      // (Mockando 'todos que tem GPS' na v1)
      const alunosBrutos = await Passageiro.findAll();
      const alunosValidos = alunosBrutos.filter(a => a.latitude && a.longitude);

      if(alunosValidos.length === 0) {
        return res.status(400).json({ error: 'Nenhum aluno com endereço geocodificado.' });
      }

      // 3. Roteirização TSP
      const startCalc = Date.now();
      const resultado = RoutingService.calculateOptimalRoute(alunosValidos, coordsBase);      
      const calcTime = Date.now() - startCalc;

      // 4. Montar a Lista para envio ao WhatsApp do Motorista
      let textRoute = `*📌 Rota Ótima Gerada (${turno})*\n\n1. Base (Casa do Motorista)\n`;
      resultado.orderedPath.forEach((aluno, index) => {
        textRoute += `${index + 2}. ${aluno.nome} -📍${aluno.bairro}\n`;
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
