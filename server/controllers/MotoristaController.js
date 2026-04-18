const Motorista = require('../models/Motorista');
const EvolutionService = require('../services/EvolutionService');
const MessageVariation = require('../utils/MessageVariation');

class MotoristaController {
  
  /**
   * Endpoint simulado para receber o OK de pagamento do B2B (ex: Stripe)
   * Corpo esperado: { nome: "Joao", telefone: "5511999999999" }
   */
  async webhookPagamento(req, res) {
    try {
      const { nome, telefone } = req.body;
      
      if (!nome || !telefone) {
        return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
      }

      // Garante que o telefone está no formato JID da evolução
      const phoneFormatado = telefone.includes('@s.whatsapp.net') ? telefone : `${telefone}@s.whatsapp.net`;

      // Cria ou atualiza o motorista para 'ativo'
      const [motorista, created] = await Motorista.findOrCreate({
        where: { telefone: phoneFormatado },
        defaults: {
          nome: nome,
          telefone: phoneFormatado,
          status: 'ativo'
        }
      });

      if (!created) {
        motorista.status = 'ativo';
        await motorista.save();
      }

      console.log(`[Pagamento] Motorista ${nome} (${phoneFormatado}) foi ativado com sucesso.`);

      // -------------------------------------------------------------
      // Tutorial de Boas-Vindas B2B (Disparado Privado para o Motorista)
      // -------------------------------------------------------------
      const tutorialMessage = `🚀 *BEM-VINDO À PLATAFORMA, ${nome.toUpperCase()}!*\n\nSeu pagamento foi confirmado com sucesso. Eu sou a sua nova IA de Gestão da Van Escolar.\n\nPara deixarmos tudo pronto para seus alunos hoje, você só precisa fazer *duas coisas* agora neste nosso chat privado:\n\n*1️⃣ Definir a Base (Garagem)*\nDe onde sua van sai todo dia? Mande uma mensagem assim para mim:\n👉 *garagem Sua Rua, 123, Bairro, Cidade*\n\n*2️⃣ Informar a Lotação de Cada Turno*\nQuantos alunos cabem na sua van por turno? Mande para mim:\n👉 *lotacao manha 15*\n👉 *lotacao tarde 12*\n👉 *lotacao noite 5*\n\n*(Você pode fazer um de cada vez)*\n\nPronto! Depois disso, você já pode me adicionar aos grupos do WhatsApp dos seus passageiros. Eu mesmo darei as boas-vindas a eles! 😉`;

      // Aciona o disparo via Evolution
      await EvolutionService.sendMessage(phoneFormatado, tutorialMessage);

      return res.status(200).json({ 
        message: 'Pagamento processado, motorista ativado e tutorial enviado.',
        motorista: motorista
      });

    } catch (error) {
      console.error('[MotoristaController] Erro no Webhook de Pagamento:', error);
      return res.status(500).json({ error: 'Erro interno ao processar pagamento.' });
    }
  }

}

module.exports = new MotoristaController();
