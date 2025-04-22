const express = require('express');
const fs = require('fs');
const { extractFromEsaj, outputFile, errorFile, importPLimit } = require('../utils/extractFromEsaj');
const { logMessage } = require('../utils/extrairUtils');

const router = express.Router();

router.post('/', async (req, res) => {
    const processosPorEstado = req.body;

    if (!processosPorEstado || typeof processosPorEstado !== 'object') {
        return res.status(400).json({ error: 'JSON inválido. Esperado um objeto com estados e processos.' });
    }

    fs.writeFileSync(outputFile, 'Estado;Processo;Partes e Advogados;Valor da Causa;Situação Processo;Data de Distribuição;Última Movimentação\n', 'latin1');

    const limit = await importPLimit();
    const promessas = [];

    for (const [estado, processos] of Object.entries(processosPorEstado)) {
        for (const processo of processos) {
            promessas.push(limit(async () => {
                if (global.cancelProcessing) return
                const result = await extractFromEsaj(processo, estado);
                if (result) {
                    logMessage(`√ Processo ${estado} ${processo} extraído com sucesso.`);
                    const linha = `${estado};${result.processo};"${result.partesAdvogados}";"${result.valorCausa}";"${result.situacaoProcesso}";"${result.dataDistribuicao}";"${result.ultimaMovimentacao} - ${result.descricaoMovimentacao}"\n`;
                    fs.appendFileSync(outputFile, linha, 'latin1');
                } else {
                    fs.appendFileSync(errorFile, `${estado} - ${processo}\n`, 'latin1');
                }
            }));
        }
    }

    await Promise.all(promessas);

    res.json({ message: 'Processamento concluído!', downloadUrl: `http://localhost:8080/download-esaj` });

    if (global.cancelProcessing){
        logMessage("❌ Processo cancelado!")
    } else {
        logMessage("✔ Processo finalizado!")
    }
});

module.exports = router;