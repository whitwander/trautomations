const { saveErrorToFile, logMessage } = require('./extrairUtils')
const { getBrowser } = require('./browserInstance');
const fs = require('fs');

const { rsError } = require('./outputFile');
let isHeadless = true

async function extractFromRs(processo) {

    const { browser, tempDir } = await getBrowser(isHeadless);
    const page = await browser.newPage();

    const stateId = "RS"

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    try {
        await page.goto('https://www.tjrs.jus.br/novo/busca/?return=proc&client=wp_index', { waitUntil: 'networkidle2' });

        const frame = page.frames().find(f => f.name() === 'iframeBusca');

        if (frame) {
            await frame.waitForSelector('input[formcontrolname="numeroProcesso"]', { visible: true });
            await frame.type('input[formcontrolname="numeroProcesso"]', processo);
            await frame.waitForSelector('button[type="submit"]', { visible: true });
            await frame.click('button[type="submit"]');

            await frame.waitForSelector('span.titulo-detalhe', {
                visible: true,
                timeout: 15000
            });

            const situacao = await frame.evaluate(() => {
                const spans = Array.from(document.querySelectorAll('span.titulo-detalhe'));
                for (const span of spans) {
                    if (span.textContent.trim() === 'Situação do Processo:') {
                        let node = span.nextSibling;
                        while (node && node.nodeType !== Node.TEXT_NODE) {
                            node = node.nextSibling;
                        }
                        return node ? node.nodeValue.trim() : null;
                    }
                }
                return null;
            });

            const primeiraLinha = await frame.evaluate(() => {
                function getTableHeaders(table) {
                    const ths = table.querySelectorAll('thead th');
                    return Array.from(ths).map(th => th.innerText.trim());
                }

                const nomesColunasEsperados = ['Evento', 'Data', 'Descrição'];
                const tabelas = Array.from(document.querySelectorAll('table'));

                for (const tabela of tabelas) {
                    const headers = getTableHeaders(tabela);

                    const bate = nomesColunasEsperados.every((nome, idx) => headers[idx] === nome);
                    if (!bate) continue;

                    const tbody = tabela.querySelector('tbody');
                    if (!tbody) continue;

                    const primeiraTr = tbody.querySelector('tr');
                    if (!primeiraTr) continue;

                    const colunas = primeiraTr.querySelectorAll('td');
                    return {
                        evento: colunas[0]?.innerText.trim() || null,
                        data: colunas[1]?.innerText.trim() || null,
                        descricao: colunas[2]?.innerText.trim() || null,
                    };
                }

                return null;
            });

            const resultadoString = primeiraLinha
                ? `${primeiraLinha.evento} | ${primeiraLinha.data} | ${primeiraLinha.descricao}`
                : 'Nenhum dado encontrado';

            logMessage(`√ Processo ${stateId} ${processo} extraído com sucesso.`);

            return { stateId, processo, situacao, resultadoString }
        }
    } catch (error) {
        await saveErrorToFile(processo, rsError);
        logMessage(`⨉ Erro ao processar ${stateId} ${processo}`);
        console.log(error)
        return error
    } finally {
        await page.close();
        await browser.close();

        if (tempDir) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }
}

module.exports = {
    extractFromRs
}