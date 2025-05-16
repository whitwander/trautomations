const CONCURRENT_LIMIT = 2;

// true para não visualizar
const noTabs = true

const fs = require('fs');

async function importPLimit() {
    const pLimit = (await import('p-limit')).default;
    return pLimit(CONCURRENT_LIMIT);
}

global.logs = [];
global.cancelProcessing = false;

function logMessage(message) {
    console.log(message);
    global.logs.push(message);
}

function setCancelFlag(value) {
    global.cancelProcessing = value;
}

async function saveErrorToFile(processo, errorFile) {
    try {
        fs.appendFileSync(errorFile, `Erro no processo ${processo}\n`, 'utf-8');
    } catch (err) {
        console.error('Erro ao registrar no arquivo de erros:', err);
    }
}

function sanitizeCSVValue(value) {
    if (!value) return '';
    return value
        .replace(/[\r\n]+/g, ' ')
        .replace(/;/g, ',')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, '');
}

module.exports = {
    sanitizeCSVValue,
    noTabs,
    saveErrorToFile,
    importPLimit,
    logMessage,
    setCancelFlag
};
