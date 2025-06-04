const express = require('express');
const router = express.Router();
const fs = require('fs');
const {
    sanitizeCSVValue,
    logMessage,
    setCancelFlag,
    importQueue,
    clearQueues
} = require('../utils/extrairUtils');
const { extractFromPje } = require('../utils/extractFromPje');
const { extractFromRj } = require('../utils/extractFromRj');
const { pjeOutput, pjeError } = require('../utils/outputFile');

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
    const incluirPartesAdvogados = config.incluirPartesAdvogados !== false;
    const incluirDataDistribuicao = config.incluirDataDistribuicao !== false;
    const incluirArquivado = config.incluirArquivado !== false;
    const incluirUltimaMovimentacao = config.incluirUltimaMovimentacao !== false;

    let header = "Estado;Processo;";
    if (incluirPartesAdvogados) header += "Partes e Advogados;";
    if (incluirDataDistribuicao) header += "Data de Distribuição;";
    if (incluirArquivado) header += "Arquivado;";
    if (incluirUltimaMovimentacao) header += "Última Movimentação;";
    header += "Audiência\n";

    fs.writeFileSync(pjeOutput, header, 'latin1');

    const filas = [];

    for (const [estado, processos] of Object.entries(estados)) {
        const concurrency = (estado === "RJ") ? 1 : 2;
        const queue = await importQueue(estado, concurrency);
        filas.push(queue); // <== guarda a fila

        for (const processo of processos) {
            queue.add(async () => {
                if (global.cancelProcessing) return;

                let resultado;

                if (estado === "RJ") {
                    resultado = await extractFromRj(processo, estado);
                } else {
                    resultado = await extractFromPje(processo, estado);
                }

                if (!resultado.error) {
                    let linha = `${sanitizeCSVValue(estado)};${resultado.processo};`;

                    if (incluirPartesAdvogados)
                        linha += `${sanitizeCSVValue(resultado.partesAdvogados)};`;
                    if (incluirDataDistribuicao)
                        linha += `${sanitizeCSVValue(resultado.dataDistribuicao)};`;
                    if (incluirArquivado)
                        linha += `${resultado.arquivado};`;
                    if (incluirUltimaMovimentacao)
                        linha += `${sanitizeCSVValue(resultado.ultimaMovimentacao)};`;

                    linha += `${sanitizeCSVValue(resultado.audiencia)}\n`;
                    fs.appendFileSync(pjeOutput, linha, 'latin1');
                } else {
                    fs.appendFileSync(pjeError, `${estado} - ${processo}\n`, 'latin1');
                }
            });
        }
    }

    try {
        // Espera todas as filas terminarem
        await Promise.all(filas.map(queue => queue.onIdle()));

        if (global.cancelProcessing) {
            logMessage("❌ Processo cancelado!");
        } else {
            logMessage("✔ Processo finalizado!");
        }

        clearQueues()

        res.status(200).end();
    } catch (err) {
        res.status(500).json({ error: 'Erro inesperado durante o processamento.' });
    }

});

module.exports = router;
