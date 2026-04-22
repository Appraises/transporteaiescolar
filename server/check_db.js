const { Passageiro } = require('./models');
const { normalizePhone } = require('./utils/phoneHelper');

async function checkPassageiro(phone) {
  try {
    const normalized = normalizePhone(phone);
    console.log('Searching for:', normalized);
    const p = await Passageiro.findOne({ where: { telefone_responsavel: normalized } });
    if (p) {
      console.log('Found Passageiro:', JSON.stringify(p, null, 2));
    } else {
      console.log('Passageiro not found.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkPassageiro('557998389263');
