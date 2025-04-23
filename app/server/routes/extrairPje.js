const express = require('express');
const router = express.Router();
const fs = require('fs');
const { sanitizeCSVValue, importPLimit, outputFile, logMessage, setCancelFlag } = require('../utils/extrairUtils');
const { extractFromPje } = require('../utils/extractFromPje');

router.post('/', async (req, res) => {
    global.logs = [];
    setCancelFlag(false);

    const processosPorEstado = req.body;
    if (!processosPorEstado || typeof processosPorEstado !== 'object') {
        return res.status(400).json({ error: 'JSON inválido. Esperado um objeto com estados e processos.' });
    }

    // Separa as configurações
    const { config = {}, ...estados } = processosPorEstado;
    const incluirPartesAdvogados = config.incluirPartesAdvogados !== false;
    const incluirDataDistribuicao = config.incluirDataDistribuicao !== false;
    const incluirArquivado = config.incluirArquivado !== false;
    const incluirUltimaMovimentacao = config.incluirUltimaMovimentacao !== false;

    // Monta cabeçalho CSV dinamicamente
    let header = "Estado;Processo;";
    if (incluirPartesAdvogados) header += "Partes e Advogados;";
    if (incluirDataDistribuicao) header += "Data de Distribuição;";
    if (incluirArquivado) header += "Arquivado;";
    if (incluirUltimaMovimentacao) header += "Última Movimentação;";
    header += "Audiência\n";

    fs.writeFileSync(outputFile, header, 'latin1');

    const limit = await importPLimit();
    const processosExecutados = [];

    for (const [estado, processos] of Object.entries(estados)) {
        for (const processo of processos) {
            processosExecutados.push(limit(async () => {
                if (global.cancelProcessing) return;

                const resultado = await extractFromPje(processo, estado);
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

                    linha += `${resultado.audiencia}\n`;
                    fs.appendFileSync(outputFile, linha, 'latin1');
                }
            }));
        }
    }

    await Promise.all(processosExecutados);
    res.json({ message: 'Processamento concluído!', downloadUrl: `http://localhost:8080/download-pje` });

    if (global.cancelProcessing) {
        logMessage("❌ Processo cancelado!");
    } else {
        logMessage("✔ Processo finalizado!");
    }
});

module.exports = router;
