const fs = require('fs');
const path = require('path');
const cors = require('cors');
const express = require('express');
const puppeteer = require('puppeteer');
const variables = require('./variables.json');

const port = 8080;
const app = express();

app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

const now = new Date();
const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;

const resultsDir = path.join(__dirname, `../../resultados/${dateStr}`);
if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
}

const outputFile = path.join(resultsDir, `resultados_${dateStr}.csv`);
const errorFile = path.join(resultsDir, `erros_${dateStr}.txt`);

const CONCURRENT_LIMIT = 2;
let errorProcesso = new Set();
let processedProcesses = new Set();
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
    if (processedProcesses.has(processo)) {
        return { error: `Processo ${processo} já processado.` };
    }

    const browser = await puppeteer.launch({ headless: true, product: 'chrome', executablePath: puppeteer.executablePath() });
    const page = await browser.newPage();
    const stateConfig = variables[stateId];

    if (!stateConfig) {
        await browser.close();
        logMessage(`Erro: Estado ${stateId} não encontrado no arquivo de configuração.`);
        return { error: `Estado ${stateId} não encontrado no arquivo de configuração.` };
    }
    
    if (stateConfig.working?.trim().toLowerCase() !== "sim") {
        await browser.close();
        logMessage(`Erro: Estado ${stateId} não está disponível para processamento.`);
        return { error: `Estado ${stateId} não está disponível para processamento.` };
    }

    try {
        page.on('dialog', async (dialog) => {
            logMessage(`Alerta detectado: "${dialog.message()}" - Clicando em OK.`);
            await dialog.accept();
        });

        await page.goto(stateConfig.url, { waitUntil: 'networkidle2' });
        if (cancelProcessing) throw new Error('Processo cancelado pelo usuário.');
        await page.waitForSelector(stateConfig.caixaProcesso, { timeout: 15000 });
        await page.type(stateConfig.caixaProcesso, processo);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.click(stateConfig.btnSearch);

        try {
            await page.waitForSelector(stateConfig.tblProcessos, { timeout: 30000 });
        } catch (error) {
            logMessage(`Nenhum resultado encontrado para o processo ${processo} ou alerta foi acionado.`);
            await browser.close();
            return { error: `Nenhum resultado encontrado para o processo ${processo}.` };
        }

        await page.waitForSelector(stateConfig.btnVerDetalhes, { timeout: 15000 });
        const linkDetalhes = await page.$(stateConfig.btnVerDetalhes);
        if (!linkDetalhes) throw new Error('Botão "Ver Detalhes" não encontrado');

        const popupPromise = new Promise(resolve => browser.once('targetcreated', resolve));
        await linkDetalhes.click();
        const popupTarget = await popupPromise;
        const popupPage = await popupTarget.page();
        if (!popupPage) throw new Error('Erro ao abrir pop-up');

        await popupPage.waitForSelector(stateConfig.divDadosProcesso, { timeout: 10000 });

        const dataDistribuicao = await popupPage.evaluate(() => {
            const elementos = document.querySelectorAll('.propertyView');
            for (let elemento of elementos) {
                const label = elemento.querySelector('.name label');
                if (label && label.innerText.trim() === 'Data da Distribuição') {
                    return elemento.querySelector('.value')?.innerText.trim() || 'Não informado';
                }
            }
            return 'Não informado';
        });

        const ultimaMovimentacao = await popupPage.evaluate((selector) => {
            return document.querySelector(selector)?.innerText.trim() || 'Data não encontrada';
        }, stateConfig.spanMovimentacaoProcesso);

        const partesAdvogados = await popupPage.evaluate((selector) => {
            return Array.from(document.querySelectorAll(selector)).map(el => el.innerText.trim()).join(' | ') || 'Não informado';
        }, stateConfig.poloAtivoParticipante);

        await popupPage.close();
        await browser.close();
        processedProcesses.add(processo);

        logMessage(`√ Processo ${stateId} ${processo} extraído com sucesso.`);
        return { processo, partesAdvogados, dataDistribuicao, ultimaMovimentacao };
    } catch (error) {
        await browser.close();
        errorProcesso.add(processo);
        await saveErrorToFile(processo);
        logMessage(`⨉ Erro ao processar ${processo}: ${error.message}`);
        return { error: `Erro ao processar ${processo}: ${error.message}` };
    }
}

async function saveErrorToFile(processo) {
    try {
        fs.appendFileSync(errorFile, `Erro no processo ${processo}\n`, 'utf-8');
    } catch (err) {
        console.error('Erro ao registrar no arquivo de erros:', err);
    }
}

app.post('/extrair', async (req, res) => {
    logs = [];
    cancelProcessing = false;
    console.log("Recebido do frontend:", JSON.stringify(req.body, null, 2));

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
                if (cancelProcessing) return;
                const resultado = await extractFromEsaj(processo, estado);
                if (!resultado.error) {
                    const linha = `${sanitizeCSVValue(estado)};${resultado.processo};"${sanitizeCSVValue(resultado.partesAdvogados)}";${sanitizeCSVValue(resultado.dataDistribuicao)};${sanitizeCSVValue(resultado.ultimaMovimentacao)}\n`;
                    fs.appendFileSync(outputFile, linha, 'utf-8');
                }
            }));
        }
    }

    await Promise.all(processosExecutados);
    res.json({ message: 'Processamento concluído!', downloadUrl: `http://localhost:${port}/download` });
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

app.post('/cancelar', (req, res) => {
    cancelProcessing = true;
    logMessage('Processamento cancelado pelo usuário.');
    res.status(200).json({ message: 'Processamento cancelado.' });
});

app.listen(port, () => {
    logMessage(`Servidor Online`);
});