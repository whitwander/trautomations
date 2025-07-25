const express = require('express');
const router = express.Router();
const fs = require('fs');
const getPQueue = require('../utils/pqueue-wrapper');
const {
    sanitizeCSVValue,
    logMessage,
    setCancelFlag,
    clearQueues
} = require('../utils/extrairUtils');
const { rsError, rsOutput } = require('../utils/outputFile');
const { extractFromRs } = require('../utils/extractFromRs')
const { initProgress, incrementProgress } = require('../utils/progressManager');

router.post('/', async (req, res) => {

    global.logs = [];
    setCancelFlag(false);

    const processosPorEstado = req.body;
    if (!processosPorEstado || typeof processosPorEstado !== 'object') {
        return res.status(400).json({
            error: 'JSON inválido. Esperado um objeto com estados e processos.'
        });
    }

    const { config = {}, ...estados } = processosPorEstado;
    let header = "Estado;Processo;Situação;Última Movimentação\n";

    fs.writeFileSync(rsOutput, header, 'latin1'); // ALTERAR PASTA

    const filas = [];

    const totalProcessos = Object.values(estados).reduce((acc, lista) => acc + lista.length, 0);
    initProgress(totalProcessos);

    for (const [estado, processos] of Object.entries(estados)) {

        const concurrency = 2
        const PQueue = await getPQueue();
        const queue = new PQueue({ concurrency });

        for (const processo of processos) {
            queue.add(async () => {
                if (global.cancelProcessing) return;

                let resultado;

                resultado = await extractFromRs(processo);

                incrementProgress();

                if (!resultado.error) {
                    let linha = `${sanitizeCSVValue(estado)};${resultado.processo};${sanitizeCSVValue(resultado.situacao)};${sanitizeCSVValue(resultado.resultadoString)}\n`;

                    fs.appendFileSync(rsOutput, linha, 'latin1');
                } else {
                    fs.appendFileSync(rsError, `${estado} - ${processo}\n`, 'latin1');
                }
            });
        }

        await queue.onIdle();
    }

    clearQueues()

    try {
        // Espera todas as filas terminarem
        await Promise.all(filas.map(queue => queue.onIdle()));

        if (global.cancelProcessing) {
            logMessage("❌ Processo cancelado!");
        } else {
            logMessage("✔ Processo finalizado!");
        }

        res.status(200).end();
    } catch (err) {
        res.status(500).json({ error: 'Erro inesperado durante o processamento.' });
    }

});

module.exports = router;
