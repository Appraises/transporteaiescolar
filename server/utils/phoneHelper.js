/**
 * phoneHelper.js
 * Utilitário para garantir que todos os números de telefone sigam o padrão internacional
 * aceito pela Evolution API e usado no banco de dados (55 + DDD + Número + @s.whatsapp.net).
 */
module.exports = {
  normalizePhone: (phone) => {
    if (!phone) return phone;
    
    // Remove tudo que não for número e o sufixo do whatsapp se presente
    let clean = phone.split('@')[0].replace(/\D/g, '');
    
    // Lógica para números brasileiros:
    // Se tiver 10 ou 11 dígitos (ex: 79998546591), adiciona o 55
    if (clean.length === 10 || clean.length === 11) {
      clean = '55' + clean;
    }
    
    // REGRA DE OURO: Nono Dígito (Brasil)
    // No WhatsApp, JIDs podem vir com ou sem o 9 extra.
    // Padronizamos removendo o 9 se o número tiver 13 dígitos (55 + DDD + 9 + 8 digitos)
    if (clean.length === 13 && clean.startsWith('55')) {
      clean = clean.slice(0, 4) + clean.slice(5);
    }
    
    // Retorna no formato JID completo
    return `${clean}@s.whatsapp.net`;
  }
};
