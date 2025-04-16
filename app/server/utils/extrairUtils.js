const fs = require('fs');
const path = require('path');

const CONCURRENT_LIMIT = 2;
global.logs = [];
global.cancelProcessing = false;

const now = new Date();
const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;

const resultsDir = path.join(__dirname, `../../resultados/PJE-${dateStr}`);
if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
}

const outputFile = path.join(resultsDir, `resultados_${dateStr}.csv`);
const errorFile = path.join(resultsDir, `erros_${dateStr}.txt`);

function logMessage(message) {
    console.log(message);
    global.logs.push(message);
}

function setCancelFlag(value) {
    global.cancelProcessing = value;
}

function sanitizeCSVValue(value) {
    if (!value) return '';
    return value
        .replace(/[\r\n]+/g, ' ')
        .replace(/;/g, ',')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, '');
}

async function importPLimit() {
    const pLimit = (await import('p-limit')).default;
    return pLimit(CONCURRENT_LIMIT);
}

async function saveErrorToFile(processo) {
    try {
        fs.appendFileSync(errorFile, `Erro no processo ${processo}\n`, 'utf-8');
    } catch (err) {
        console.error('Erro ao registrar no arquivo de erros:', err);
    }
}

module.exports = {
    saveErrorToFile,
    sanitizeCSVValue,
    importPLimit,
    resultsDir,
    outputFile,
    errorFile,
    logMessage,
    setCancelFlag
};
