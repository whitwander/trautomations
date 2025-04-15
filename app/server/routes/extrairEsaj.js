const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { logMessage } = require('../utils/extrairUtils');

const url = 'https://esaj.tjsp.jus.br/cpopg/open.do';
// const url = 'https://esaj.tjms.jus.br/cpopg5/open.do';
const CONCURRENT_LIMIT = 2;

// Salva na pasta de resultados // *Fazer globalmente
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

async function extractFromEsaj(processo) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });

    const processoFormatado = processo.replace(/\.8\.26\./, ''); // remove o trecho fixo
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

    return { processo, ...data };
  } catch (error) {
    logMessage(`Erro ao processar ${processo}: ${error.message}`);
    return null;
  } finally {
    await browser.close();
  }
}

router.post('/', async (req, res) => {
  const { SP } = req.body;

  if (!Array.isArray(SP) || SP.length === 0) {
    return res.status(400).json({ error: 'Informe um array de processos dentro da chave "SP".' });
  }

  const processos = SP; // array de strings vindo do JSON

  const limit = await importPLimit();
  const resultados = [];
  const erros = [];

  if (!fs.existsSync(outputFile)) {
    fs.writeFileSync(outputFile, 'Processo;Partes e Advogados;Valor da Causa;Data de Distribuição;Última Movimentação\n', 'latin1');
  }

  const processAndSave = async (processo) => {
    const result = await extractFromEsaj(processo);
    if (result) {
      // trocar sp log quando incluir MS
      logMessage(`√ Processo SP ${processo} extraído com sucesso.`);
      const linha = `${result.processo};"${result.partesAdvogados}";"${result.valorCausa}";"${result.dataDistribuicao}";"${result.ultimaMovimentacao} - ${result.descricaoMovimentacao}"\n`;
      fs.appendFileSync(outputFile, linha, 'latin1');
      resultados.push(result);
    } else {
      fs.appendFileSync(errorFile, processo + '\n', 'latin1');
      erros.push(processo);
    }
  };

  const promises = processos.map(p => limit(() => processAndSave(p)));
  await Promise.all(promises);

  res.json({ message: 'Processamento concluído!', downloadUrl: `http://localhost:8080/download-esaj` });
  logMessage("✔ Processo finalizado!")
});


module.exports = router;
