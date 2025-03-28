const puppeteer = require('puppeteer');
const fs = require('fs');
const data = require('./variables.json');

const inputFile = "processos.json";
const outputFile = "resultados.txt";
const errorFile = "erros.txt";

const CONCURRENT_LIMIT = 3;

let errorProcesso = [];

async function importPLimit() {
  const pLimit = (await import('p-limit')).default;
  return pLimit(CONCURRENT_LIMIT);
}

async function readJsonFile(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(data);
    return jsonData;
  } catch (error) {
    console.error('Erro ao ler o arquivo JSON:', error);
    return {};
  }
}

async function extractFromEsaj(processo, stateId) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const stateConfig = data[stateId];

  if (!stateConfig) {
    console.log(`Estado ${stateId} não encontrado nas configurações. Pulando para o próximo estado...`);
    return null;  
  }

  const url = stateConfig.url;
  const caixaProcesso = stateConfig.caixaProcesso;
  const btnSearch = stateConfig.btnSearch;
  const tblProcessos = stateConfig.tblProcessos;
  const btnVerDetalhes = stateConfig.btnVerDetalhes;
  const divDadosProcesso = stateConfig.divDadosProcesso;
  const spanMovimentacaoProcesso = stateConfig.spanMovimentacaoProcesso;
  const poloAtivoParticipante = stateConfig.poloAtivoParticipante;

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });

    await page.waitForSelector(caixaProcesso, { timeout: 5000 });
    await page.type(caixaProcesso, processo);

    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.click(btnSearch);

    await page.waitForSelector(tblProcessos, { timeout: 10000 });

    await page.waitForSelector(btnVerDetalhes, { timeout: 5000 });
    const linkDetalhes = await page.$(btnVerDetalhes);
    if (!linkDetalhes) throw new Error('Botão "Ver Detalhes" não encontrado');

    const popupPromise = new Promise(resolve => browser.once('targetcreated', resolve));
    await linkDetalhes.click();
    const popupTarget = await popupPromise;
    const popupPage = await popupTarget.page();
    if (!popupPage) throw new Error('Erro ao abrir o pop-up');

    await popupPage.waitForSelector(divDadosProcesso, { timeout: 10000 });

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
    }, spanMovimentacaoProcesso);

    const partesAdvogados = await popupPage.evaluate((selector) => {
      return Array.from(document.querySelectorAll(selector))
        .map(el => el.innerText.trim())
        .join(' | ') || 'Não informado';
    }, poloAtivoParticipante);

    await popupPage.close();

    return { processo, partesAdvogados, dataDistribuicao, ultimaMovimentacao };

  } catch (error) {
    console.error(`Erro ao processar ${processo}:`, error);
    errorProcesso.push(processo);
    return null;
  } finally {
    await browser.close();
  }
}

async function main() {
  const processosPorEstado = await readJsonFile(inputFile);

  const estados = Object.keys(processosPorEstado);

  const limit = await importPLimit();

  for (const stateId of estados) {
    if (!data[stateId]) {
      console.log(`Estado ${stateId} não encontrado nas configurações. Pulando para o próximo estado...`);
      continue;  
    }

    console.log(`Iniciando processamento para o estado ${stateId}...`);
    const processos = processosPorEstado[stateId];

    async function processAndSave(processo) {
      const result = await extractFromEsaj(processo, stateId);
      if (result) {
        const line = `${result.processo}; Partes e Advogados: ${result.partesAdvogados}; Data de Distribuição: ${result.dataDistribuicao}; Última Movimentação: ${result.ultimaMovimentacao}`;
        fs.appendFileSync(outputFile, line + '\n', 'utf-8');
        console.log(`Processo ${processo} processado com sucesso e salvo.`);
      } else {
        fs.appendFileSync(errorFile, processo + '\n', 'utf-8');
        console.log(`Processo ${processo} apresentou erro e foi salvo em erros.`);
      }

      const remainingProcesses = processos.filter(p => p !== processo);
      processosPorEstado[stateId] = remainingProcesses;
      fs.writeFileSync(inputFile, JSON.stringify(processosPorEstado, null, 2), 'utf-8');
    }

    const promises = processos.map(processo => limit(() => processAndSave(processo)));
    await Promise.all(promises);
  }

  console.log('Extração concluída. Verifique os arquivos de saída e o arquivo de entrada atualizado.');
}

main().catch(console.error);