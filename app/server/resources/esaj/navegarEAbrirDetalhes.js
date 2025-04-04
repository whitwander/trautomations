async function navegarEAbrirDetalhes(page, config, processo) {
    await page.goto(config.url, { waitUntil: 'networkidle2' });
    await page.waitForSelector(config.caixaProcesso);
    await page.type(config.caixaProcesso, processo);
    await page.waitForTimeout(1000);
    await page.click(config.btnSearch);

    await page.waitForSelector(config.tblProcessos, { timeout: 30000 });
    const btn = await page.$(config.btnVerDetalhes);
    if (!btn) throw new Error('Botão "Ver Detalhes" não encontrado');

    const [popupTarget] = await Promise.all([
        new Promise(resolve => page.browser().once('targetcreated', resolve)),
        btn.click()
    ]);
    const popupPage = await popupTarget.page();
    await popupPage.bringToFront();
    await popupPage.waitForSelector(config.divDadosProcesso);

    return popupPage;
}

module.exports = navegarEAbrirDetalhes;  