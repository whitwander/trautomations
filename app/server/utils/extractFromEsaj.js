const { logMessage } = require('./extrairUtils');
const { getBrowser } = require('./browserInstance')
const fs = require('fs')

const URLS_POR_ESTADO = {
    SP: 'https://esaj.tjsp.jus.br/cpopg/open.do',
    MS: 'https://esaj.tjms.jus.br/cpopg5/open.do',
    AC: 'https://esaj.tjac.jus.br/cpopg/open.do',
    AL: 'https://www2.tjal.jus.br/cpopg/open.do',
    AM: 'https://consultasaj.tjam.jus.br/cpopg/open.do'
};

let isHeadless = true

async function extractFromEsaj(processo, estado) {
    if (global.cancelProcessing) return
    const url = URLS_POR_ESTADO[estado];

    if (!url) {
        logMessage(`Estado ${estado} não suportado.`);
        return null;
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

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        const regras = {
            SP: /\.8\.26\./,
            MS: /\.8\.12\./,
            AC: /\.8\.01\./,
            AL: /\.8\.02\./,
            AM: /\.8\.04\./,
        };

        let processoFormatado = processo

        if (regras[estado]) {
            processoFormatado = processo.replace(regras[estado], '');
        }

        await page.type('#numeroDigitoAnoUnificado', processoFormatado, { delay: 100 });
        await page.click('#botaoConsultarProcessos');
        await page.waitForSelector('.nomeParteEAdvogado', { timeout: 20000 });

        const data = await page.evaluate(() => {
            const partesAdvogados = Array.from(document.querySelectorAll('.nomeParteEAdvogado'))
                .map(el => el.innerText.trim()).join(' | ');
            const valorCausa = document.querySelector('#valorAcaoProcesso')?.innerText.trim() || 'Não informado';
            const dataDistribuicao = document.querySelector('#dataHoraDistribuicaoProcesso')?.innerText.trim() || 'Não informado';
            const situacaoProcesso = document.querySelector('#labelSituacaoProcesso')?.innerText.trim() || 'Não consta';
            const ultimaMovimentacao = document.querySelector('.dataMovimentacao')?.innerText.trim() || 'Não informado';
            const descricaoMovimentacao = document.querySelector('.descricaoMovimentacao')?.innerText.trim() || 'Não informado';

            return {
                partesAdvogados,
                valorCausa,
                dataDistribuicao,
                situacaoProcesso,
                ultimaMovimentacao,
                descricaoMovimentacao
            };
        });

        return { estado, processo, ...data };
    } catch (error) {
        logMessage(`Erro ao processar ${estado} ${processo}`);
        console.log(error)
        return null;
    } finally {
        await page.close();
        await browser.close();

        if (tempDir) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }
}

module.exports = {
    extractFromEsaj,
};
