const fs = require('fs');
const path = require('path');

const now = new Date();
const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;

const pastaPje = `N:\\resultados\\PJE-${dateStr}`;
const pastaEsaj = `N:\\resultados\\ESAJ-${dateStr}`;
const pastaRs = `N:\\resultados\\RS-${dateStr}`;

// preencher para pastas fixas
// const pastaPje = `M:\\JURIDICO\\CONSULTAS ROBÔ\\resultados-thiago\\PJE-${dateStr}`;
// const pastaEsaj = `M:\\JURIDICO\\CONSULTAS ROBÔ\\resultados-thiago\\ESAJ-${dateStr}`;

const pastas = [pastaPje, pastaEsaj, pastaRs];

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

module.exports = {
    pjeOutput,
    pjeError,
    rsOutput,
    rsError,
    esajOutput,
    esajError
};