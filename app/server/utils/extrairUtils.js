const fs = require('fs');
const path = require('path');

const CONCURRENT_LIMIT = 2;
global.logs = [];
global.cancelProcessing = false;

const now = new Date();
const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;

//alterar pasta 
const pasta = `C:\\Users\\Victor Mikhael\\Desktop\\Resultados\\ResultadosPJE-${dateStr}`;

if (!fs.existsSync(pasta)) {
  fs.mkdirSync(pasta, { recursive: true });
} 

const outputFile = path.join(pasta, `PJE_${dateStr}.csv`);
const errorFile = path.join(pasta, `PJE-erros_${dateStr}.txt`);


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
    outputFile,
    errorFile,
    logMessage,
    setCancelFlag
};
