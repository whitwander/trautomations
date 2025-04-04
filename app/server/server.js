const fs = require('fs');
const cors = require('cors');
const express = require('express');
const escolherExtrator = require('./resources');
const { salvarCSV, salvarErro, log } = require('./utils/logger');

const path = require('path');
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
        onError: err => salvarErro(processo, err),
        cancelProcessing: () => cancelFlags[estado],
      });

      if (!result.error) {
        salvarCSV(result);
      }
    }
  }

  res.json({ msg: 'Finalizado!' });
});

app.post('/cancelar', (req, res) => {
  // define a flag por estado ou geral
  cancelFlags["todos"] = true;
  res.sendStatus(200);
});

app.listen(8080, () => console.log("API no ar 🚀"));