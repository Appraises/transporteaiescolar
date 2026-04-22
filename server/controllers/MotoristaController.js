const Motorista = require('../models/Motorista');
const Assinatura = require('../models/Assinatura');
const SalesService = require('../services/SalesService');
const EvolutionService = require('../services/EvolutionService');
const MessageVariation = require('../utils/MessageVariation');
const { normalizePhone } = require('../utils/phoneHelper');

function resolveNextOnboardingStep(motorista) {
  if (!motorista.nome || motorista.nome === 'Aguardando') return 'AGUARDANDO_NOME';
  if (!motorista.meta_manha && !motorista.meta_tarde && !motorista.meta_noite) return 'AGUARDANDO_LOTACAO';
  if (!motorista.latitude || !motorista.longitude) return 'AGUARDANDO_GARAGEM';
  if (!motorista.escola_latitude || !motorista.escola_longitude) return 'AGUARDANDO_ESCOLA';
  if (!motorista.senha_hash) return 'AGUARDANDO_SENHA';
  return 'CONCLUIDO';
}

function buildOnboardingMessage(motorista, step) {
  if (step === 'AGUARDANDO_NOME') {
    return 'Pagamento confirmado. Vamos configurar sua van.\n\n1. Qual o seu nome completo?';
  }

  if (step === 'AGUARDANDO_LOTACAO') {
    return MessageVariation.onboardingMotorista.perguntaLotacao(motorista.nome);
  }

  if (step === 'AGUARDANDO_GARAGEM') {
    return MessageVariation.onboardingMotorista.perguntaGaragem();
  }

  if (step === 'AGUARDANDO_ESCOLA') {
    return MessageVariation.onboardingMotorista.perguntaEscola();
  }

  if (step === 'AGUARDANDO_SENHA') {
    const loginPainel = motorista.telefone.split('@')[0];
    return `Pagamento confirmado. Falta criar seu acesso ao painel VANBORA.\n\nSeu login sera seu numero: *${loginPainel}*\n\nAgora me envie a senha que voce quer usar no painel. Use pelo menos 6 caracteres.`;
  }

  return 'Pagamento confirmado. Seu cadastro ja esta completo e seu painel esta ativo.';
}

class MotoristaController {

  /**
   * Recebe confirmacao de pagamento B2B e coloca o motorista no proximo passo
   * incompleto do onboarding. Ele so vira ativo depois de criar senha do painel.
   */
  async webhookPagamento(req, res) {
    try {
      const { nome, telefone, valor_plano } = req.body;

      if (!nome || !telefone) {
        return res.status(400).json({ error: 'Nome e telefone sao obrigatorios' });
      }

      const phoneFormatado = normalizePhone(telefone);
      const [motorista, created] = await Motorista.findOrCreate({
        where: { telefone: phoneFormatado },
        defaults: {
          nome,
          telefone: phoneFormatado,
          status: 'lead',
          venda_etapa: 'AGUARDANDO_LOTACAO',
          boas_vindas_enviada: false
        }
      });

      if (!created) {
        motorista.nome = motorista.nome || nome;
        if (motorista.status !== 'ativo' || !motorista.senha_hash) {
          motorista.status = 'lead';
        }
        motorista.boas_vindas_enviada = false;
      }

      const step = resolveNextOnboardingStep(motorista);
      motorista.venda_etapa = step;
      if (step === 'CONCLUIDO') {
        motorista.status = 'ativo';
        motorista.boas_vindas_enviada = true;
      }
      await motorista.save();

      await Assinatura.findOrCreate({
        where: { motorista_id: motorista.id, status: 'ativo' },
        defaults: {
          motorista_id: motorista.id,
          valor_plano: valor_plano || SalesService.MONTHLY_VALUE,
          status: 'ativo',
          data_inicio: new Date()
        }
      });

      console.log(`[Pagamento] Motorista ${motorista.nome} (${phoneFormatado}) confirmado. Proxima etapa: ${step}.`);
      await EvolutionService.sendMessage(phoneFormatado, buildOnboardingMessage(motorista, step));

      return res.status(200).json({
        message: step === 'CONCLUIDO'
          ? 'Pagamento processado, motorista ja estava com onboarding completo.'
          : 'Pagamento processado, onboarding do motorista retomado.',
        motorista: {
          id: motorista.id,
          nome: motorista.nome,
          telefone: motorista.telefone,
          status: motorista.status,
          venda_etapa: motorista.venda_etapa
        }
      });

    } catch (error) {
      console.error('[MotoristaController] Erro no Webhook de Pagamento:', error);
      return res.status(500).json({ error: 'Erro interno ao processar pagamento.' });
    }
  }

}

module.exports = new MotoristaController();
