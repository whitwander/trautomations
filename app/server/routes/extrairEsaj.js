const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { logMessage } = require('../utils/extrairUtils');

const url = 'https://esaj.tjsp.jus.br/cpopg/open.do';
const CONCURRENT_LIMIT = 2;
const outputFile = path.join(__dirname, '../resultados_sp.csv');
const errorFile = path.join(__dirname, '../erros_sp.txt');

async function importPLimit() {
  const pLimit = (await import('p-limit')).default;
  return pLimit(CONCURRENT_LIMIT);
}

async function extractFromEsaj(processo) {
  const digitoProcesso = "26";
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
  const { processos } = req.body;

  if (!Array.isArray(processos) || processos.length === 0) {
    return res.status(400).json({ error: 'Informe um array de processos em "processos".' });
  }

  const limit = await importPLimit();
  const resultados = [];
  const erros = [];

  // Garante que os arquivos existam
  if (!fs.existsSync(outputFile)) {
    fs.writeFileSync(outputFile, 'Processo;Partes e Advogados;Valor da Causa;Data de Distribuição;Última Movimentação\n', 'utf-8');
  }

  const processAndSave = async (processo) => {
    const result = await extractFromEsaj(processo);
    if (result) {
      const linha = `${result.processo};"${result.partesAdvogados}";"${result.valorCausa}";"${result.dataDistribuicao}";"${result.ultimaMovimentacao} - ${result.descricaoMovimentacao}"\n`;
      fs.appendFileSync(outputFile, linha, 'utf-8');
      resultados.push(result);
    } else {
      fs.appendFileSync(errorFile, processo + '\n', 'utf-8');
      erros.push(processo);
    }
  };

  const promises = processos.map(p => limit(() => processAndSave(p)));
  await Promise.all(promises);

  res.json({
    mensagem: 'Extração concluída.',
    total: processos.length,
    sucesso: resultados.length,
    erros: erros.length,
    arquivoResultado: 'http://localhost:8080/download-sp', // exemplo
  });
});

module.exports = router;
