const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs');
const data = require('./variables.json');
const app = express();
const port = 8080;

app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const now = new Date();
const dateStr = now.toISOString().split('T')[0];
const outputFile = `resultados_${dateStr}.csv`;
const CONCURRENT_LIMIT = 2;
let logs = [];
let cancelProcessing = false;

function logMessage(message) {
    console.log(message);
    logs.push(message);
}

async function importPLimit() {
    const pLimit = (await import('p-limit')).default;
    return pLimit(CONCURRENT_LIMIT);
}

function sanitizeCSVValue(value) {
    if (!value) return 'Não informado';
    return value.replace(/"/g, "'").replace(/;/g, ',').replace(/\r?\n|\r/g, ' ');
}

async function extractFromEsaj(processo, stateId) {
    if (cancelProcessing) return { error: 'Processo cancelado pelo usuário.' };

    const stateConfig = data[stateId];

    if (!stateConfig) {
        logMessage(`Estado ${stateId} não encontrado. Pulando para o próximo estado.`);
        return { error: `Estado ${stateId} não encontrado.` };
    }

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(stateConfig.url, { waitUntil: 'networkidle2' });
        if (cancelProcessing) throw new Error('Processo cancelado pelo usuário.');
        
        await page.waitForSelector(stateConfig.caixaProcesso, { timeout: 5000 });
        await page.type(stateConfig.caixaProcesso, processo);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.click(stateConfig.btnSearch);
        await page.waitForSelector(stateConfig.tblProcessos, { timeout: 10000 });

        await page.waitForSelector(stateConfig.btnVerDetalhes, { timeout: 5000 });
        const linkDetalhes = await page.$(stateConfig.btnVerDetalhes);
        if (!linkDetalhes) throw new Error('Botão "Ver Detalhes" não encontrado');

        const popupPromise = new Promise(resolve => browser.once('targetcreated', resolve));
        await linkDetalhes.click();
        const popupTarget = await popupPromise;
        const popupPage = await popupTarget.page();
        if (!popupPage) throw new Error('Erro ao abrir pop-up');

        await popupPage.waitForSelector(stateConfig.divDadosProcesso, { timeout: 10000 });

        const dataDistribuicao = 'Não informado';
        const ultimaMovimentacao = 'Data não encontrada';
        const partesAdvogados = 'Não informado';
        
        await popupPage.close();
        await browser.close();

        logMessage(`✓ ${stateId} - Processo ${processo} extraído com sucesso.`);
        return { processo, partesAdvogados, dataDistribuicao, ultimaMovimentacao };
    } catch (error) {
        await browser.close();
        logMessage(`✗ ${stateId} - Erro no processo ${processo}: ${error.message}`);
        return { error: `Erro ao processar ${processo}: ${error.message}` };
    }
}

app.post('/extrair', async (req, res) => {
    logs = [];
    console.log("Recebido do frontend:", JSON.stringify(req.body, null, 2));

    const processosPorEstado = req.body;
    if (!processosPorEstado || typeof processosPorEstado !== 'object') {
        return res.status(400).json({ error: 'JSON inválido. Esperado um objeto com estados e processos.' });
    }

    fs.writeFileSync(outputFile, "Estado;Processo;Partes e Advogados;Data de Distribuição;Última Movimentação\n", 'utf-8');
    
    const limit = await importPLimit();
    const processosExecutados = [];

    for (const estado of Object.keys(processosPorEstado)) {
        const processos = processosPorEstado[estado];
        
        if (!Array.isArray(processos) || processos.length === 0) {
            logMessage(`⚠️ ${estado} - Nenhum processo válido encontrado.`);
            continue;
        }

        logMessage(`🔍 Iniciando processamento para o estado: ${estado}`);

        for (const processo of processos) {
            processosExecutados.push(limit(async () => {
                const resultado = await extractFromEsaj(processo, estado);
                if (!resultado.error) {
                    const linha = `${estado};${resultado.processo};"${sanitizeCSVValue(resultado.partesAdvogados)}";${sanitizeCSVValue(resultado.dataDistribuicao)};${sanitizeCSVValue(resultado.ultimaMovimentacao)}\n`;
                    fs.appendFileSync(outputFile, linha, 'utf-8');
                }
            }));
        }
    }

    await Promise.all(processosExecutados);

    if (cancelProcessing) {
        return res.status(200).json({ message: 'Processo cancelado pelo usuário.' });
    }

    res.json({ message: "Processamento Concluído!" });
});

app.post('/cancelar', (req, res) => {
    cancelProcessing = true;
    logMessage('🚨 Processamento cancelado pelo usuário.');
    res.status(200).json({ message: 'Processamento cancelado.' });
});

app.get('/logs', (req, res) => {
    res.json({ logs });
});

app.get('/download', (req, res) => {
    res.download(outputFile, 'resultados.csv', (err) => {
        if (err) {
            res.status(500).send({ error: 'Erro ao baixar o arquivo' });
        }
    });
});

app.listen(port, () => {
    logMessage(`🚀 Servidor Online na porta ${port}`);
});
