const puppeteer = require('puppeteer');
const fs = require('fs');

const estadoUF = 'es'; 
const inputFile = 'processos_'+ estadoUF + '.txt'; 
const outputFile = 'resultados_'+ estadoUF + '.txt'; 
const errorFile = 'erros_'+ estadoUF + '.txt'; 
const url = 'https://pje.tjes.jus.br/pje/ConsultaPublica/listView.seam';
const caixaProcesso = '#fPP\\:numProcesso-inputNumeroProcessoDecoration\\:numProcesso-inputNumeroProcesso';
const btnSearch = '#fPP\\:searchProcessos';
const tblProcessos = '#fPP\\:processosTable';
const btnVerDetalhes = 'a[title="Ver Detalhes"]';
const divDadosProcesso = '#j_id140\\:processoTrfViewView\\:j_id143';
const spanMovimentacaoProcesso = 'span[id^="j_id140:processoEvento:0:j_id501"]';
const poloAtivoParticipante = '#j_id140\\:processoPartesPoloAtivoResumidoList\\:tb .text-bold';

const CONCURRENT_LIMIT = 2;

let errorProcesso = [];

async function importPLimit() {
  const pLimit = (await import('p-limit')).default;
  return pLimit(CONCURRENT_LIMIT);
}

async function readInputFile(filePath) {
  const data = fs.readFileSync(filePath, 'utf-8');
  return data.split('\n').map(line => line.trim()).filter(line => line !== '');
}

async function extractFromEsaj(processo) {
  const browser = await puppeteer.launch({ headless: true }); 
  const page = await browser.newPage();

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
  let pendingProcess = await readInputFile(inputFile);
  const limit = await importPLimit();

  console.log(`Iniciando processamento de ${pendingProcess.length} processos...`);

  async function processAndSave(processo) {
    const result = await extractFromEsaj(processo);
    if (result) {
      const line = `${result.processo}; Partes e Advogados: ${result.partesAdvogados}; Data de Distribuição: ${result.dataDistribuicao}; Última Movimentação: ${result.ultimaMovimentacao}`;
      fs.appendFileSync(outputFile, line + '\n', 'utf-8');
      console.log(`Processo ${processo} processado com sucesso e salvo.`);
    } else {
      fs.appendFileSync(errorFile, processo + '\n', 'utf-8');
      console.log(`Processo ${processo} apresentou erro e foi salvo em erros.`);
    }

    pendingProcess = pendingProcess.filter(item => item !== processo);
    fs.writeFileSync(inputFile, pendingProcess.join('\n'), 'utf-8');
  }

  const promises = pendingProcess.map(processo => limit(() => processAndSave(processo)));
  await Promise.all(promises); 

  console.log('Extração concluída. Verifique os arquivos de saída e o arquivo de entrada atualizado.');
}

main().catch(console.error);