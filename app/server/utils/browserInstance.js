const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { executablePath } = require('puppeteer'); 

async function getBrowser(isHeadless = true) {
    const browser = await puppeteer.launch({
        headless: isHeadless,
        product: 'chrome',
        executablePath: executablePath(),
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-infobars',
            '--disable-features=site-per-process'
        ]
    });
    return browser
}

module.exports = { getBrowser };