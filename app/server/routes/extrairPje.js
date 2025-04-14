const express = require('express');
const router = express.Router();
const fs = require('fs');
const { sanitizeCSVValue, importPLimit, outputFile, logMessage, setCancelFlag } = require('../utils/extrairUtils');
const { extractFromPje } = require('../utils/extractFromPje');

router.post('/', async (req, res) => {
    global.logs = []; // <-- limpa os logs globais no início
    setCancelFlag(false);

    const processosPorEstado = req.body;
    if (!processosPorEstado || typeof processosPorEstado !== 'object') {
        return res.status(400).json({ error: 'JSON inválido. Esperado um objeto com estados e processos.' });
    }

    fs.writeFileSync(outputFile, "Estado;Processo;Partes e Advogados;Data de Distribuição;Arquivado;Última Movimentação;Audiência\n", 'latin1');
    const limit = await importPLimit();
    const processosExecutados = [];

    for (const [estado, processos] of Object.entries(processosPorEstado)) {
        for (const processo of processos) {
            processosExecutados.push(limit(async () => {
                if (global.cancelProcessing) return;
                const resultado = await extractFromPje(processo, estado);
                if (!resultado.error) {
                    const linha = `
                        ${sanitizeCSVValue(estado)};
                        ${resultado.processo};
                        ${sanitizeCSVValue(resultado.partesAdvogados)};
                        ${sanitizeCSVValue(resultado.dataDistribuicao)};
                        Arquivado?
                        ${sanitizeCSVValue(resultado.ultimaMovimentacao)};
                        Audiência?\n`;
                    fs.appendFileSync(outputFile, linha, 'latin1');
                }
            }));
        }
    }

    await Promise.all(processosExecutados);
    res.json({ message: 'Processamento concluído!', downloadUrl: `http://localhost:8080/download-pje` });
    logMessage("✔ Processo finalizado!")
});

module.exports = router;
