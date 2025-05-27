const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    product: 'chrome',
    executablePath: puppeteer.executablePath()
  });

  const page = await browser.newPage();

  const processo = '0805385-21.2024.8.19.0010';

  await page.goto("https://tjrj.pje.jus.br/1g/ConsultaPublica/listView.seam");

  await page.waitForSelector('#fPP\\:numProcesso-inputNumeroProcessoDecoration\\:numProcesso-inputNumeroProcesso', { timeout: 15000 });
  await page.type('#fPP\\:numProcesso-inputNumeroProcessoDecoration\\:numProcesso-inputNumeroProcesso', processo);
  await page.click('#fPP\\:searchProcessos');

  async function pesquisaRj() {
    await page.waitForSelector('ul li a');

    // Detecta quando nova aba for criada
    const [newPagePromise] = await Promise.all([
      new Promise(resolve => browser.once('targetcreated', target => resolve(target.page()))),
      page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const link = links.find(a => a.textContent.trim().toLowerCase() === 'consulta processual');
        if (link) link.click();
      })
    ]);

    const newPage = await newPagePromise;
    await newPage.bringToFront(); // Garante que você está focando na nova aba

    // Espera campo de processo na nova aba
    await newPage.waitForSelector('#fPP\\:numProcesso-inputNumeroProcessoDecoration\\:numProcesso-inputNumeroProcesso', { timeout: 15000 });
    await newPage.type('#fPP\\:numProcesso-inputNumeroProcessoDecoration\\:numProcesso-inputNumeroProcesso', processo, { timeout: 1000 });
    await newPage.click('#fPP\\:searchProcessos');
  }

  await pesquisaRj()
  await new Promise(resolve => setTimeout(resolve, 5000));
})();


// teste de função
await page.waitForFunction(() => {
    return !!document.querySelector('a[title="Ver Detalhes"]');
}, { timeout: 5000 }).catch(() => {});

