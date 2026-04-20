/**
 * SalesService.js
 * Centraliza o funil de vendas, textos de pitch e dados de pagamento.
 */
class SalesService {
  constructor() {
    this.PIX_KEY = '79998389263';
    this.PIX_TYPE = 'Telefone';
    this.MONTHLY_VALUE = 49.90;
  }

  getPitch() {
    return `👋 *Olá! Sou o assistente de IA para Van Escolar.* 🚐💨

Você sabia que pode automatizar toda a sua logística e ainda passar mais segurança para os pais?

*O que eu faço por você:*
✅ Enquetes automáticas de presença todo dia.
✅ Rastreamento GPS em tempo real para os pais.
✅ Gestão completa de mensalidades e recibos.
✅ Notificações inteligentes de chegada na escola.

🚀 *Quer profissionalizar sua van por apenas R$ ${this.MONTHLY_VALUE.toFixed(2)}/mês?*

Responda *QUERO ASSINAR* para receber as instruções de pagamento!`;
  }

  getPaymentInstructions() {
    return `🎉 *Excelente escolha! Você está a um passo de modernizar sua van.*

Para ativar o seu acesso, realize o pagamento da primeira mensalidade:

💰 *Valor:* R$ ${this.MONTHLY_VALUE.toFixed(2)}
🔑 *Chave PIX (${this.PIX_TYPE}):* ${this.PIX_KEY}

📸 Após realizar o pagamento, **mande a foto ou PDF do comprovante aqui mesmo**.

Nossa inteligência artificial vai validar o seu pagamento em segundos e já liberar o seu bot!`;
  }

  getSuccessMessage() {
    return `✅ *PAGAMENTO CONFIRMADO!* 🎉

Parabéns! Sua assinatura está ativa.

Agora, me diga: **Qual o seu nome completo (ou nome da sua Van)?** 
_Vou usar isso para identificar suas mensagens._`;
  }
}

module.exports = new SalesService();
