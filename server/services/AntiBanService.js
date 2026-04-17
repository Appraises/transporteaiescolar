const MessageVariation = require('../utils/MessageVariation');

class AntiBanService {
  
  // A humanização pesada (Zero-Widths, Emojis e Sinônimos) 
  // agora é feita nativamente por debaixo dos panos pelo EvolutionService.sendMessage().
  gerarCobrancaHumanizada(nome, valorOriginal) {
    return MessageVariation.financeiro.cobranca(nome, valorOriginal);
  }
}

module.exports = new AntiBanService();
