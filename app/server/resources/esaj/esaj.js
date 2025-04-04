const puppeteer = require('puppeteer');
const { log, isCancelado } = require('../../utils/logger');
const navegarEAbrirDetalhes = require('./navegarEAbrirDetalhes');
const extrairDados = require('./extrairDados');

async function extractFromEsaj(processo, stateConfig) {
    if (isCancelado()) return { error: 'Processo cancelado pelo usuário.' };

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        log(`Iniciando extração do processo ${processo} em ${stateConfig.nome}`);

        page.on('dialog', async dialog => {
            log(`Alerta detectado: ${dialog.message()}`);
            await dialog.accept();
        });

        await navegarEAbrirDetalhes(page, stateConfig, processo);
        const dados = await extrairDados(page, stateConfig);

        await browser.close();
        return { processo, ...dados };

    } catch (error) {
        await browser.close();
        log(`Erro ao processar ${processo}: ${error.message}`);
        return { error: `Erro ao processar ${processo}: ${error.message}` };
    }
}

module.exports = extractFromEsaj;
