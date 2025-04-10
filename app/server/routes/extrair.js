const express = require('express');
const router = express.Router();
const fs = require('fs');
const { extractFromEsaj, sanitizeCSVValue, importPLimit, outputFile, logMessage, setCancelFlag } = require('../utils/extrairUtils');

router.post('/', async (req, res) => {
    global.logs = []; // <-- limpa os logs globais no início
    setCancelFlag(false);
    logMessage("Recebido do frontend:");
    logMessage(JSON.stringify(req.body, null, 2));

    const processosPorEstado = req.body;
    if (!processosPorEstado || typeof processosPorEstado !== 'object') {
        return res.status(400).json({ error: 'JSON inválido. Esperado um objeto com estados e processos.' });
    }

    fs.writeFileSync(outputFile, "Estado;Processo;Partes e Advogados;Data de Distribuição;Última Movimentação\n", 'utf-8');
    const limit = await importPLimit();
    const processosExecutados = [];

    for (const [estado, processos] of Object.entries(processosPorEstado)) {
        for (const processo of processos) {
            processosExecutados.push(limit(async () => {
                if (global.cancelProcessing) return;
                const resultado = await extractFromEsaj(processo, estado);
                if (!resultado.error) {
                    const linha = `${sanitizeCSVValue(estado)};${resultado.processo};"${sanitizeCSVValue(resultado.partesAdvogados)}";${sanitizeCSVValue(resultado.dataDistribuicao)};${sanitizeCSVValue(resultado.ultimaMovimentacao)}\n`;
                    fs.appendFileSync(outputFile, linha, 'utf-8');
                }
            }));
        }
    }

    await Promise.all(processosExecutados);
    res.json({ message: 'Processamento concluído!', downloadUrl: `http://localhost:8080/download` });
});

module.exports = router;
