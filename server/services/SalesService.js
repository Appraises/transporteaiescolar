const MessageVariation = require('../utils/MessageVariation');

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
    return MessageVariation.vendasMotorista.pitch(this.MONTHLY_VALUE);
  }

  getPaymentInstructions() {
    return MessageVariation.vendasMotorista.instrucoesPagamento(this.MONTHLY_VALUE, this.PIX_TYPE, this.PIX_KEY);
  }

  getSuccessMessage() {
    return MessageVariation.vendasMotorista.sucessoPagamento();
  }
}
module.exports = new SalesService();
