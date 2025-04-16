const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { logMessage } = require('./extrairUtils');

const CONCURRENT_LIMIT = 2;
const URLS_POR_ESTADO = {
    SP: 'https://esaj.tjsp.jus.br/cpopg/open.do',
    MS: 'https://esaj.tjms.jus.br/cpopg5/open.do',
};

const now = new Date();
const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
const resultsDir = path.join(__dirname, `../../resultados/ESAJ-${dateStr}`);

if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
}

const outputFile = path.join(resultsDir, `resultados_${dateStr}.csv`);
const errorFile = path.join(resultsDir, `erros_${dateStr}.txt`);

async function importPLimit() {
    const pLimit = (await import('p-limit')).default;
    return pLimit(CONCURRENT_LIMIT);
}

async function extractFromEsaj(processo, estado) {
    const url = URLS_POR_ESTADO[estado];

    if (!url) {
        logMessage(`Estado ${estado} não suportado.`);
        return null;
    }

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        let processoFormatado;

        if (estado === "SP") {
            processoFormatado = processo.replace(/\.8\.26\./, '');
        } else {
            processoFormatado = processo.replace(/\.8\.12\./, '');
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
        logMessage(`Erro ao processar ${processo} (${estado}): ${error.message}`);
        return null;
    } finally {
        await browser.close();
    }
}

module.exports = {
    extractFromEsaj,
    outputFile,
    errorFile,
    importPLimit,
};
