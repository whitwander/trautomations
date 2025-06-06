const express = require('express');
const fs = require('fs');
const getPQueue = require('../utils/pqueue-wrapper');
const { extractFromEsaj } = require('../utils/extractFromEsaj');
const { logMessage, sanitizeCSVValue, clearQueues } = require('../utils/extrairUtils');
const { esajOutput, esajError } = require('../utils/outputFile')
const { initProgress, incrementProgress } = require('../utils/progressManager');

const router = express.Router();

router.post('/', async (req, res) => {
    const processosPorEstado = req.body;

    if (!processosPorEstado || typeof processosPorEstado !== 'object') {
        return res.status(400).json({ error: 'JSON inválido. Esperado um objeto com estados e processos.' });
    }

    const { config = {}, ...estados } = processosPorEstado;
    const incluirPartesAdvogados = config.incluirPartesAdvogados !== false;
    const incluirDataDistribuicao = config.incluirDataDistribuicao !== false;
    const incluirArquivado = config.incluirArquivado !== false;
    const incluirUltimaMovimentacao = config.incluirUltimaMovimentacao !== false;

    let header = "Estado;Processo;Valor da Causa;";
    if (incluirPartesAdvogados) header += "Partes e Advogados;";
    if (incluirDataDistribuicao) header += "Data de Distribuição;";
    if (incluirArquivado) header += "Situação Processo;";
    if (incluirUltimaMovimentacao) header += "Última Movimentação;\n";

    fs.writeFileSync(esajOutput, header, 'latin1');

    const PQueue = await getPQueue();
    const queue = new PQueue({ concurrency: 2 });

    const totalProcessos = Object.values(estados).reduce((acc, lista) => acc + lista.length, 0);
    initProgress(totalProcessos);

    for (const [estado, processos] of Object.entries(estados)) {
        for (const processo of processos) {
            queue.add(async () => {
                if (global.cancelProcessing) return;
                const result = await extractFromEsaj(processo, estado);

                incrementProgress();

                if (result) {
                    logMessage(`√ Processo ${estado} ${processo} extraído com sucesso.`);
                    let linha = `${sanitizeCSVValue(estado)};${result.processo};${result.valorCausa};`;

                    if (incluirPartesAdvogados)
                        linha += `${sanitizeCSVValue(result.partesAdvogados)};`;
                    if (incluirDataDistribuicao)
                        linha += `${sanitizeCSVValue(result.dataDistribuicao)};`;
                    if (incluirArquivado)
                        linha += `${sanitizeCSVValue(result.situacaoProcesso)};`;
                    if (incluirUltimaMovimentacao)
                        linha += `${sanitizeCSVValue(result.ultimaMovimentacao)};`;

                    linha += "\n";
                    fs.appendFileSync(esajOutput, linha, 'latin1');
                } else {
                    fs.appendFileSync(esajError, `${estado} - ${processo}\n`, 'latin1');
                }
            });
        }
    }

    await queue.onIdle();

    if (global.cancelProcessing) {
        logMessage("❌ Processo cancelado!");
    } else {
        logMessage("✔ Processo finalizado!");
    }

    clearQueues();

    res.status(200).end();
});

module.exports = router;