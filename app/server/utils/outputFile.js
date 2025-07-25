const fs = require('fs');
const path = require('path');

const now = new Date();
const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;


// const pastaGeral = `N:\\resultados\\${dateStr}`;
// const pastaPje = `N:\\resultados\\${dateStr}\\PJE`;
// const pastaEsaj = `N:\\resultados\\${dateStr}\\ESAJ`;
// const pastaRs = `N:\\resultados\\${dateStr}\\RS`;
// const pastaGo = `N:\\resultados\\${dateStr}\\GO`;

// preencher para pastas fixas
const pastaGeral = `M:\\JURIDICO\\CONSULTAS ROBÔ\\resultados-thiago\\${dateStr}`;
const pastaPje = `M:\\JURIDICO\\CONSULTAS ROBÔ\\resultados-thiago\\${dateStr}\\PJE`;
const pastaEsaj = `M:\\JURIDICO\\CONSULTAS ROBÔ\\resultados-thiago\\${dateStr}\\ESAJ`;
const pastaRs = `M:\\JURIDICO\\CONSULTAS ROBÔ\\resultados-thiago\\${dateStr}\\RS`;
const pastaGo = `M:\\JURIDICO\\CONSULTAS ROBÔ\\resultados-thiago\\${dateStr}\\GO`;


const pastas = [pastaPje, pastaEsaj, pastaRs, pastaGeral, pastaGo];

pastas.forEach((pasta) => {
  if (!fs.existsSync(pasta)) {
    fs.mkdirSync(pasta, { recursive: true });
  }
});

const pjeOutput = path.join(pastaPje, `PJE_${dateStr}.csv`);
const pjeError = path.join(pastaPje, `PJE-erros_${dateStr}.txt`);

const rsOutput = path.join(pastaRs, `RS_${dateStr}.csv`)
const rsError = path.join(pastaRs, `RS-erros_${dateStr}.txt`)

const esajOutput = path.join(pastaEsaj, `ESAJ_${dateStr}.csv`);
const esajError = path.join(pastaEsaj, `ESAJ-erros_${dateStr}.txt`);

const goOutput = path.join(pastaGo, `GO_${dateStr}.csv`);
const goError = path.join(pastaGo, `GO-erros_${dateStr}.txt`);

module.exports = {
  pjeOutput,
  pjeError,
  goOutput,
  goError,
  rsOutput,
  rsError,
  esajOutput,
  esajError
};