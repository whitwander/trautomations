const { saveErrorToFile, logMessage } = require('../utils/extrairUtils')
const puppeteer = require('puppeteer');

const variables = require('../variablesPJE.json');
const constantesSitePje = {
    "caixaProcesso": "#fPP\\:numProcesso-inputNumeroProcessoDecoration\\:numProcesso-inputNumeroProcesso",
    "btnSearch": "#fPP\\:searchProcessos",
    "tblProcessos": "#fPP\\:processosTable",
    "btnVerDetalhes": "a[title='Ver Detalhes']"
}


let processedProcesses = new Set();
let errorProcesso = new Set();

async function extractFromPje(processo, stateId) {
    if (global.cancelProcessing) return { error: 'Processo cancelado pelo usuário.' };
    if (processedProcesses.has(processo)) {
        return { error: `Processo ${processo} já processado.` };
    }

    const browser = await puppeteer.launch({ headless: true, product: 'chrome', executablePath: puppeteer.executablePath() });
    const page = await browser.newPage();
    const stateConfig = variables[stateId];

    if (!stateConfig) {
        await browser.close();
        logMessage(`Erro: Estado ${stateId} não encontrado no arquivo de configuração.`);
        return { error: `${stateId} - não existe` };
    }

    if (stateConfig.working?.trim().toLowerCase() !== "sim") {
        await browser.close();
        logMessage(`Erro: Estado ${stateId} não está disponível para processamento.`);
        return { error: `${stateId} - ${stateId.working}` };
    }

    try {
        page.on('dialog', async (dialog) => {
            logMessage(`Alerta detectado: "${dialog.message()}" - Clicando em OK.`);
            await dialog.accept();
        });

        await page.goto(stateConfig.url, { waitUntil: 'domcontentloaded' });
        if (global.cancelProcessing) throw new Error('Processo cancelado pelo usuário.');
        await page.waitForSelector(constantesSitePje.caixaProcesso, { timeout: 15000 });
        await page.type(constantesSitePje.caixaProcesso, processo);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.click(constantesSitePje.btnSearch);

        try {
            await page.waitForSelector(constantesSitePje.tblProcessos, { timeout: 30000 });
        } catch {
            logMessage(`Nenhum resultado encontrado para o processo ${processo} ou alerta foi acionado.`);
            await browser.close();
            return { error: `${processo} sem resultado.` };
        }

        await page.waitForSelector(constantesSitePje.btnVerDetalhes, { timeout: 15000 });
        const linkDetalhes = await page.$(constantesSitePje.btnVerDetalhes);
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

module.exports = {
    extractFromPje
}