const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

let browser = null;

async function getBrowser(isHeadless = true) {
    if (!browser || !browser.isConnected()) {
        browser = await puppeteer.launch({
            headless: isHeadless,
            product: 'chrome',
            executablePath: puppeteer.executablePath(),
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-extensions',
                '--disable-infobars',
                '--disable-features=site-per-process'
            ]
        });
    }
    return browser;
}

async function closeBrowser() {
    if (browser && browser.isConnected()) {
        await browser.close();
    }
}

module.exports = { getBrowser, closeBrowser };