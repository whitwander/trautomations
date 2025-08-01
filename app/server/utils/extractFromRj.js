const { saveErrorToFile, logMessage } = require('./extrairUtils')
const { getBrowser } = require('./browserInstance');
const fs = require('fs');

const variables = require('../variablesPJE.json');
const { pjeError } = require('./outputFile');
const constantesSitePje = {
    "caixaProcesso": "#fPP\\:numProcesso-inputNumeroProcessoDecoration\\:numProcesso-inputNumeroProcesso",
    "btnSearch": "#fPP\\:searchProcessos",
    "tblProcessos": "#fPP\\:processosTable",
    "btnVerDetalhes": "a[title='Ver Detalhes']"
}

let isHeadless = false

let processedProcesses = new Set();
let errorProcesso = new Set();

async function extractFromRj(processo, stateId) {
    if (global.cancelProcessing) return;
    if (processedProcesses.has(processo)) {
        return { error: `Processo ${processo} já processado.` };
    }

    const { browser, tempDir } = await getBrowser(isHeadless);
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const type = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
            req.abort();
        } else {
            req.continue();
        }
    });

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

        let newPage;

        async function consultaRj() {
            await page.waitForSelector('ul li a');

            const [newPagePromise] = await Promise.all([
                new Promise(resolve => browser.once('targetcreated', target => resolve(target.page()))),
                page.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('a'));
                    const link = links.find(a => a.textContent.trim().toLowerCase() === 'consulta processual');
                    new Promise(resolve => setTimeout(resolve, 1000));
                    if (link) link.click();
                })
            ]);

            newPage = await newPagePromise;
            await newPage.bringToFront();

            await newPage.waitForSelector(constantesSitePje.caixaProcesso, { timeout: 15000 });
            await newPage.type(constantesSitePje.caixaProcesso, processo);
            await newPage.click(constantesSitePje.btnSearch);
        }

        await consultaRj()
        await new Promise(resolve => setTimeout(resolve, 3000));
        await consultaRj();

        //Teste RJ
        try {
            await newPage.waitForSelector(constantesSitePje.tblProcessos, { timeout: 30000 });
        } catch {
            logMessage(`Nenhum resultado encontrado para o processo ${processo} ou alerta foi acionado.`);
            await browser.close();
            return { error: `${processo} sem resultado.` };
        }

        await newPage.waitForSelector(constantesSitePje.btnVerDetalhes, { timeout: 15000 });
        const linkDetalhes = await newPage.$(constantesSitePje.btnVerDetalhes);
        if (!linkDetalhes) throw new Error('Botão "Ver Detalhes" não encontrado');

        const popupPromise = new Promise(resolve => browser.once('targetcreated', resolve));
        await linkDetalhes.click();
        const popupTarget = await popupPromise;
        const popupPage = await popupTarget.page();
        if (!popupPage) throw new Error('Erro ao abrir pop-up');

        await popupPage.waitForSelector(stateConfig.divDadosProcesso, { timeout: 10000 });

        //Data de distribuição
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

        await popupPage.waitForSelector(stateConfig.tbodyMovimentacaoProcesso, {
            visible: true,
            timeout: 15000
        });
        //Última movimentação, arquivado e audiência
        const { ultimaMovimentacao, arquivado, audiencia } = await popupPage.evaluate((selector) => {
            const container = document.querySelector(selector);
            if (!container) {
                return {
                    ultimaMovimentacao: 'não foi possível verificar',
                    arquivado: 'não foi possível verificar',
                    audiencia: 'não foi possível verificar'
                };
            }

            const linhas = Array.from(container.querySelectorAll('tr'));
            if (linhas.length === 0) {
                return {
                    ultimaMovimentacao: 'Data não encontrada',
                    arquivado: 'não',
                    audiencia: 'não'
                };
            }

            const ultima = linhas[0].innerText.trim();

            const achouArquivado = linhas.some(linha =>
                linha.innerText.toLowerCase().includes('arquivado definitivamente')
            );

            const linhaAudiencia = linhas.find(linha => {
                const texto = linha.innerText.toLowerCase();
                return texto.includes('audiência') || texto.includes('audiencia');
            });

            return {
                ultimaMovimentacao: ultima,
                arquivado: achouArquivado ? 'sim' : 'não',
                audiencia: linhaAudiencia ? linhaAudiencia.innerText.trim() : 'não'
            };
        }, stateConfig.tbodyMovimentacaoProcesso);

        //Partes e advogados
        const partesAdvogados = await popupPage.evaluate((selector) => {
            return Array.from(document.querySelectorAll(selector)).map(el => el.innerText.trim()).join(' | ') || 'Não informado';
        }, stateConfig.poloAtivoParticipante);

        await newPage.close();
        await popupPage.close();
        await browser.close();
        if (tempDir) {
            fs.rmSync(tempDir, { recursive: true, force: true });
            console.log(`[Cleanup] Perfil TEMP removido: ${tempDir}`);
        }
        processedProcesses.add(processo);

        logMessage(`√ Processo ${stateId} ${processo} extraído com sucesso.`);
        return { processo, partesAdvogados, dataDistribuicao, ultimaMovimentacao, arquivado, audiencia };
    } catch (error) {
        await browser.close();
        if (tempDir) {
            fs.rmSync(tempDir, { recursive: true, force: true });
            console.log(`[Cleanup] Perfil TEMP removido: ${tempDir}`);
        }
        console.log(error)
        errorProcesso.add(processo);
        await saveErrorToFile(processo, pjeError);
        logMessage(`⨉ Erro ao processar ${stateId} ${processo}`);
        return { error: `Erro ao processar ${processo}: ${error.message}` };
    }
}

module.exports = {
    extractFromRj
}