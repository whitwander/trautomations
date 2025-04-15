const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { logMessage } = require('../utils/extrairUtils');

const CONCURRENT_LIMIT = 2;
const URLS_POR_ESTADO = {
    SP: 'https://esaj.tjsp.jus.br/cpopg/open.do',
    MS: 'https://esaj.tjms.jus.br/cpopg5/open.do',
    // Adicione outros estados aqui se necessário
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

        if(estado == "SP"){
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
            const ultimaMovimentacao = document.querySelector('.dataMovimentacao')?.innerText.trim() || 'Não informado';
            const descricaoMovimentacao = document.querySelector('.descricaoMovimentacao')?.innerText.trim() || 'Não informado';

            return {
                partesAdvogados,
                valorCausa,
                dataDistribuicao,
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

router.post('/', async (req, res) => {
    const processosPorEstado = req.body;

    if (!processosPorEstado || typeof processosPorEstado !== 'object') {
        return res.status(400).json({ error: 'JSON inválido. Esperado um objeto com estados e processos.' });
    }

    fs.writeFileSync(outputFile, 'Estado;Processo;Partes e Advogados;Valor da Causa;Data de Distribuição;Última Movimentação\n', 'latin1');

    const limit = await importPLimit();
    const promessas = [];

    for (const [estado, processos] of Object.entries(processosPorEstado)) {
        for (const processo of processos) {
            promessas.push(limit(async () => {
                const result = await extractFromEsaj(processo, estado);
                if (result) {
                    logMessage(`√ Processo ${estado} ${processo} extraído com sucesso.`);
                    const linha = `${estado};${result.processo};"${result.partesAdvogados}";"${result.valorCausa}";"${result.dataDistribuicao}";"${result.ultimaMovimentacao} - ${result.descricaoMovimentacao}"\n`;
                    fs.appendFileSync(outputFile, linha, 'latin1');
                } else {
                    fs.appendFileSync(errorFile, `${estado} - ${processo}\n`, 'latin1');
                }
            }));
        }
    }

    await Promise.all(promessas);

    res.json({ message: 'Processamento concluído!', downloadUrl: `http://localhost:8080/download-esaj` });
    logMessage("✔ Processo finalizado!");
});

module.exports = router;
