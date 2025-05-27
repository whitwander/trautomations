const fs = require('fs');
let queueInstance;

async function importQueue(concurrency = 3) {
  if (!queueInstance) {
    const { default: PQueue } = await import('p-queue');
    queueInstance = new PQueue({ concurrency });
  }
  return queueInstance;
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
    saveErrorToFile,
    logMessage,
    importQueue,
    setCancelFlag
};
