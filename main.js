const puppeteer = require('puppeteer');
const fs = require('fs');
const data = require('./variables.json');

const now = new Date();
const dateStr = now.toISOString().split('T')[0];
const inputFile = `dados_processos_${dateStr}.json`;
// const inputFile = JSON.parse(process.argv[2]); 
const outputFile = `resultados_${dateStr}.csv`;
const errorFile = `erros_${dateStr}.txt`;

const CONCURRENT_LIMIT = 2;
let errorProcesso = new Set();
let processedProcesses = new Set();

async function importPLimit() {
  const pLimit = (await import('p-limit')).default;
  return pLimit(CONCURRENT_LIMIT);
}

async function readJsonFile(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler o arquivo JSON:', error);
    return {};
  }
}

function sanitizeCSVValue(value) {
  if (!value) return 'Não informado';
  return value
    .replace(/"/g, "'")  
    .replace(/;/g, ',')   
    .replace(/\r?\n|\r/g, ' '); 
}

async function extractFromEsaj(processo, stateId) {
  if (processedProcesses.has(processo)) {
    console.log(`Processo ${processo} já processado. Pulando...`);
    return null;
  }

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const stateConfig = data[stateId];

  if (!stateConfig) {
    console.log(`Estado ${stateId} não encontrado. Pulando...`);
    return null;  
  }

  try {
    await page.goto(stateConfig.url, { waitUntil: 'networkidle2' });
    await page.waitForSelector(stateConfig.caixaProcesso, { timeout: 5000 });
    await page.type(stateConfig.caixaProcesso, processo);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.click(stateConfig.btnSearch);
    await page.waitForSelector(stateConfig.tblProcessos, { timeout: 10000 });

    await page.waitForSelector(stateConfig.btnVerDetalhes, { timeout: 5000 });
    const linkDetalhes = await page.$(stateConfig.btnVerDetalhes);
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
      return Array.from(document.querySelectorAll(selector))
        .map(el => el.innerText.trim())
        .join(' | ') || 'Não informado';
    }, stateConfig.poloAtivoParticipante);

    await popupPage.close();
    processedProcesses.add(processo); 

    return { processo, partesAdvogados, dataDistribuicao, ultimaMovimentacao };

  } catch (error) {
    console.error(`Erro ao processar ${processo}:`, error);
    errorProcesso.add(processo);
    return null;
  } finally {
    await browser.close();
  }
}

async function writeCSVHeader() {
  const header = `\uFEFFProcesso;Partes e Advogados;Data de Distribuição;Última Movimentação\n`; // BOM UTF-8
  fs.writeFileSync(outputFile, header, 'utf-8');
}

async function saveToCSV(result) {
  if (!result) return;

  const line = `${result.processo};"${sanitizeCSVValue(result.partesAdvogados)}";${sanitizeCSVValue(result.dataDistribuicao)};${sanitizeCSVValue(result.ultimaMovimentacao)}\n`;
  
  fs.appendFileSync(outputFile, line, 'utf-8');
}

async function main() {
  await writeCSVHeader();
  const processosPorEstado = await readJsonFile(inputFile);
  const estados = Object.keys(processosPorEstado);
  const limit = await importPLimit();

  for (const stateId of estados) {
    if (!data[stateId]) {
      console.log(`Estado ${stateId} não encontrado. Pulando...`);
      continue;  
    }

    console.log(`Processando estado ${stateId}...`);
    const processos = processosPorEstado[stateId];

    async function processAndSave(processo) {
      const result = await extractFromEsaj(processo, stateId);
      if (result) {
        await saveToCSV(result);
        console.log(`Processo ${processo} salvo.`);
      } else {
        errorProcesso.add(processo);
        console.log(`Erro no processo ${processo}, salvo em erros.`);
      }
    }

    const promises = processos.map(processo => limit(() => processAndSave(processo)));
    await Promise.all(promises);

    processosPorEstado[stateId] = processos.filter(p => !processedProcesses.has(p));
  }

  if (errorProcesso.size > 0) {
    fs.writeFileSync(errorFile, Array.from(errorProcesso).join('\n'), 'utf-8');
  }

  fs.writeFileSync(inputFile, JSON.stringify(processosPorEstado, null, 2), 'utf-8');

  console.log('Extração concluída. Verifique os arquivos CSV e de erro.');
}

main().catch(console.error);