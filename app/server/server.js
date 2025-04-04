const fs = require('fs');
const cors = require('cors');
const express = require('express');
const escolherExtrator = require('./resources');

const {
  log,
  getLogs,
  clearLogs,
  cancelarProcessamento,
  isCancelado,
  resetarCancelamento
} = require('./utils/logger');

const {
  criarPastaResultados,
  salvarCabecalhoCSV,
  salvarLinhaCSV,
  salvarErroTXT
} = require('./utils/fileWriter');

const variables = require('./variables.json');
const app = express();

app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

const cancelFlags = {};

app.post('/extrair', async (req, res) => {
  const processosPorEstado = req.body;

  for (const [estado, processos] of Object.entries(processosPorEstado)) {
    const config = variables[estado];
    const extrator = escolherExtrator(config);

    for (const processo of processos) {
      const result = await extrator(processo, config, {
        onLog: msg => log(msg),
        onError: err => salvarErroTXT(processo, err),
        cancelProcessing: () => cancelFlags[estado],
      });

      if (!result.error) {
        salvarLinhaCSV(result, estado);
      }
    }
  }

  res.json({ msg: 'Finalizado!' });
});

app.post('/cancelar', (req, res) => {
  cancelFlags["todos"] = true;
  res.sendStatus(200);
});

app.listen(8080, () => console.log("API no ar 🚀"));