async function extrairDados(page, config) {
    const dataDistribuicao = await page.evaluate(() => {
        const elementos = document.querySelectorAll('.propertyView');
        for (let el of elementos) {
            const label = el.querySelector('.name label');
            if (label?.innerText.trim() === 'Data da Distribuição') {
                return el.querySelector('.value')?.innerText.trim() || 'Não informado';
            }
        }
        return 'Não informado';
    });

    const ultimaMovimentacao = await page.$eval(config.spanMovimentacaoProcesso, el => el.innerText.trim());
    const partesAdvogados = await page.$$eval(config.poloAtivoParticipante, nodes =>
        nodes.map(el => el.innerText.trim()).join(' | ')
    );

    return { dataDistribuicao, ultimaMovimentacao, partesAdvogados };
}

module.exports = extrairDados;
