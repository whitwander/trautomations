const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs');
const data = require('./variables.json');
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

const now = new Date();
const dateStr = now.toISOString().split('T')[0];
const outputFile = `resultados_${dateStr}.csv`;
const errorFile = `erros_${dateStr}.txt`;
const CONCURRENT_LIMIT = 2;
let errorProcesso = new Set();
let processedProcesses = new Set();

async function importPLimit() {
    const pLimit = (await import('p-limit')).default;
    return pLimit(CONCURRENT_LIMIT);
}

function sanitizeCSVValue(value) {
    if (!value) return 'Não informado';
    return value.replace(/"/g, "'").replace(/;/g, ',').replace(/\r?\n|\r/g, ' ');
}

async function extractFromEsaj(processo, stateId) {
    if (processedProcesses.has(processo)) {
        return { error: `Processo ${processo} já processado.` };
    }

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const stateConfig = data[stateId];

    if (!stateConfig) {
        await browser.close();
        return { error: `Estado ${stateId} não encontrado.` };
    }

    try {
        await page.goto(stateConfig.url, { waitUntil: 'networkidle2' });
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

        return { processo, partesAdvogados, dataDistribuicao, ultimaMovimentacao };
    } catch (error) {
        await browser.close();
        errorProcesso.add(processo);
        await saveErrorToFile(processo);
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
    const processosPorEstado = req.body;
    if (!processosPorEstado || typeof processosPorEstado !== 'object') {
        return res.status(400).json({ error: 'JSON inválido. Esperado um objeto com estados e processos.' });
    }
    
    fs.writeFileSync(outputFile, "Processo;Partes e Advogados;Data de Distribuição;Última Movimentação\n", 'utf-8');
    
    const limit = await importPLimit();
    const processosExecutados = [];
    
    for (const [estado, processos] of Object.entries(processosPorEstado)) {
        for (const processo of processos) {
            processosExecutados.push(limit(async () => {
                const resultado = await extractFromEsaj(processo, estado);
                if (!resultado.error) {
                    const linha = `${resultado.processo};"${sanitizeCSVValue(resultado.partesAdvogados)}";${sanitizeCSVValue(resultado.dataDistribuicao)};${sanitizeCSVValue(resultado.ultimaMovimentacao)}\n`;
                    fs.appendFileSync(outputFile, linha, 'utf-8');
                }
            }));
        }
    }

    await Promise.all(processosExecutados);
    res.json({ message: 'Processamento concluído!', downloadUrl: `http://localhost:${port}/download` });
});

app.get('/download', (req, res) => {
    res.download(outputFile, 'resultados.csv', (err) => {
        if (err) {
            res.status(500).send({ error: 'Erro ao baixar o arquivo' });
        }
    });
});

app.listen(port, () => {
    console.log(`API rodando em http://localhost:${port}`);
});