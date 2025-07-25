const { saveErrorToFile, logMessage } = require('./extrairUtils')
const { getBrowser } = require('./browserInstance');
const fs = require('fs');

const { goError } = require('./outputFile');

let isHeadless = true

async function extractFromGo(processo) {

    const { browser, tempDir } = await getBrowser(isHeadless);
    const page = await browser.newPage();

    const stateId = "GO"

    try {

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

        await page.goto('https://projudi.tjgo.jus.br/BuscaProcesso?PaginaAtual=4&TipoConsultaProcesso=24', { waitUntil: 'domcontentloaded', timeout: 60000 });

        await page.waitForSelector('#ProcessoNumero')

        await page.type('#ProcessoNumero', processo, { delay: 200 })

        await page.waitForSelector('input[name="imgSubmeter', { visible: true });
        await page.click('input[name="imgSubmeter', { delay: 150 });

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ]);


        const status = await page.evaluate(() => {
            const divs = Array.from(document.querySelectorAll('div'));
            const statusDiv = divs.find(d => d.innerText.trim() === 'Status');
            if (!statusDiv) return null;

            let node = statusDiv.nextElementSibling;
            while (node && node.tagName !== 'SPAN') {
                node = node.nextElementSibling;
            }
            return node ? node.innerText.trim() : null;
        });

        const primeiraLinha = await page.evaluate(() => {
            const tabela = document.querySelector('#TabelaArquivos');
            if (!tabela) return null;
            const primeiraTr = tabela.querySelector('tbody tr') || tabela.querySelector('tr');
            if (!primeiraTr) return null;

            return Array.from(primeiraTr.querySelectorAll('td'))
                .map(td => td.innerText.trim())
                .join(' - ');
        });

        logMessage(`√ Processo ${stateId} ${processo} extraído com sucesso.`);

        return { processo, status, primeiraLinha }

    } catch (error) {

        await saveErrorToFile(processo, goError);
        logMessage(`⨉ Erro ao processar ${stateId} ${processo}`);
        console.log(error)
        return { error: true, message: error.message };

    } finally {
        try {
            if (page && !page.isClosed()) {
                await page.close();
            }
        } catch (err) {
            console.log('Erro ao fechar a página:', err.message);
        }

        try {
            if (browser) {
                await browser.close();
            }
        } catch (err) {
            console.log('Erro ao fechar o browser:', err.message);
        }

        if (tempDir) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }
}

module.exports = {
    extractFromGo
}
