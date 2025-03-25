// Importa o Puppeteer para automação de navegador e o módulo de sistema de arquivos do Node.js
const puppeteer = require('puppeteer');
const fs = require('fs');

const estadoUF = 'es'; // estado
const inputFile = 'processos_'+ estadoUF + '.txt'; // Arquivo com os números dos processos
const outputFile = 'resultados_'+ estadoUF + '.txt'; // Arquivo para salvar os resultados
const errorFile = 'erros_'+ estadoUF + '.txt'; // Arquivo para salvar os processos com erro
const url = 'https://pje.tjes.jus.br/pje/ConsultaPublica/listView.seam';
const caixaProcesso = '#fPP\\:numProcesso-inputNumeroProcessoDecoration\\:numProcesso-inputNumeroProcesso';
const btnSearch = '#fPP\\:searchProcessos';
const tblProcessos = '#fPP\\:processosTable';
const btnVerDetalhes = 'a[title="Ver Detalhes"]';
const divDadosProcesso = '#j_id140\\:processoTrfViewView\\:j_id143';
const spanMovimentacaoProcesso = 'span[id^="j_id140:processoEvento:0:j_id501"]';
const poloAtivoParticipante = '#j_id140\\:processoPartesPoloAtivoResumidoList\\:tb .text-bold';

// Define o número máximo de processos a serem executados simultaneamente
const CONCURRENT_LIMIT = 2;

// Array para armazenar os processos que deram erro
let errorProcesso = [];

// Função para importar dinamicamente o pacote 'p-limit' e aplicar o limite de concorrência
async function importPLimit() {
  const pLimit = (await import('p-limit')).default;
  return pLimit(CONCURRENT_LIMIT);
}

// Função para ler o arquivo de entrada com os números dos processos
async function readInputFile(filePath) {
  const data = fs.readFileSync(filePath, 'utf-8');
  // Retorna um array com as linhas do arquivo, removendo linhas vazias e espaços em branco
  return data.split('\n').map(line => line.trim()).filter(line => line !== '');
}

// Função principal de extração dos dados do site do TJMG via Puppeteer
async function extractFromEsaj(processo) {
  //const url = 'https://pje-consulta.tjce.jus.br/pje1grau/ConsultaPublica/listView.seam';
  const browser = await puppeteer.launch({ headless: true }); // Executa em modo invisível
  const page = await browser.newPage();

  try {
    // Acessa a página principal do sistema de consulta pública
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Aguarda o campo de número do processo aparecer e preenche com o número fornecido
    await page.waitForSelector(caixaProcesso, { timeout: 5000 });
    await page.type(caixaProcesso, processo);

    // Aguarda 1 segundo antes de clicar para pesquisar
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.click(btnSearch);

    // Aguarda a tabela de resultados aparecer
    await page.waitForSelector(tblProcessos, { timeout: 10000 });

    // Aguarda o botão "Ver Detalhes" e clica
    await page.waitForSelector(btnVerDetalhes, { timeout: 5000 });
    const linkDetalhes = await page.$(btnVerDetalhes);
    if (!linkDetalhes) throw new Error('Botão "Ver Detalhes" não encontrado');

    // Aguarda o pop-up com os detalhes ser aberto
    const popupPromise = new Promise(resolve => browser.once('targetcreated', resolve));
    await linkDetalhes.click();
    const popupTarget = await popupPromise;
    const popupPage = await popupTarget.page();
    if (!popupPage) throw new Error('Erro ao abrir o pop-up');

    // Aguarda o seletor da área onde ficam os dados principais do processo
    await popupPage.waitForSelector(divDadosProcesso, { timeout: 10000 });

    // Extrai a data da distribuição do processo
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

    // Extrai a última movimentação registrada no processo
    const ultimaMovimentacao = await popupPage.evaluate((selector) => {
      return document.querySelector(selector)?.innerText.trim() || 'Data não encontrada';
    }, spanMovimentacaoProcesso);

    // Extrai os nomes das partes e advogados do polo ativo
    const partesAdvogados = await popupPage.evaluate((selector) => {
      return Array.from(document.querySelectorAll(selector))
        .map(el => el.innerText.trim())
        .join(' | ') || 'Não informado';
    }, poloAtivoParticipante);

    // Fecha a aba do pop-up
    await popupPage.close();

    // Retorna os dados extraídos em forma de objeto
    return { processo, partesAdvogados, dataDistribuicao, ultimaMovimentacao };

  } catch (error) {
    // Em caso de erro, registra no console e salva o número do processo na lista de erros
    console.error(`Erro ao processar ${processo}:`, error);
    errorProcesso.push(processo);
    return null;
  } finally {
    // Fecha o navegador, independentemente de sucesso ou erro
    await browser.close();
  }
}

// Função principal de execução
async function main() {
  // Lê os processos pendentes do arquivo de entrada
  let pendingProcess = await readInputFile(inputFile);
  // Cria o limitador de concorrência
  const limit = await importPLimit();

  console.log(`Iniciando processamento de ${pendingProcess.length} processos...`);

  // Função que processa e salva os dados de cada processo individualmente
  async function processAndSave(processo) {
    const result = await extractFromEsaj(processo);
    if (result) {
      // Formata e salva os dados no arquivo de resultados
      const line = `${result.processo}; Partes e Advogados: ${result.partesAdvogados}; Data de Distribuição: ${result.dataDistribuicao}; Última Movimentação: ${result.ultimaMovimentacao}`;
      fs.appendFileSync(outputFile, line + '\n', 'utf-8');
      console.log(`Processo ${processo} processado com sucesso e salvo.`);
    } else {
      // Em caso de erro, salva no arquivo de erros
      fs.appendFileSync(errorFile, processo + '\n', 'utf-8');
      console.log(`Processo ${processo} apresentou erro e foi salvo em erros.`);
    }

    // Remove o processo da lista de pendentes e atualiza o arquivo de entrada
    pendingProcess = pendingProcess.filter(item => item !== processo);
    fs.writeFileSync(inputFile, pendingProcess.join('\n'), 'utf-8');
  }

  // Cria promessas controladas com limite de concorrência para todos os processos
  const promises = pendingProcess.map(processo => limit(() => processAndSave(processo)));
  await Promise.all(promises); // Aguarda o término de todos os processos

  console.log('Extração concluída. Verifique os arquivos de saída e o arquivo de entrada atualizado.');
}

// Executa a função principal, tratando qualquer erro global
main().catch(console.error);