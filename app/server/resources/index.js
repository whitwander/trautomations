const extrairPje = require('./pje');
const extrairEsaj = require('./esaj/esaj');
const extrairProjud = require('./projud');

function escolherExtrator(stateConfig) {
  const tipo = stateConfig.tipoSistema?.toLowerCase();
  
  switch (tipo) {
    case 'esaj': return extrairEsaj;
    case 'pje': return extrairPje;
    case 'projud': return extrairProjud;
    default: throw new Error(`Tipo de sistema desconhecido: ${tipo}`);
  }
}

module.exports = escolherExtrator;