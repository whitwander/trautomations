// browserInstance.js
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Adiciona o plugin stealth
puppeteerExtra.use(StealthPlugin());

async function getBrowser(isHeadless = true) {
  // Gera pasta temporária única
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer_profile_'));

  const browser = await puppeteerExtra.launch({
    headless: isHeadless,
    userDataDir: tempDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-infobars',
      '--disable-features=site-per-process'
    ]
  });

  // Retorna ambos
  return { browser, tempDir };
}

module.exports = { getBrowser };
