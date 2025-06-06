const fs = require('fs');
const queueMap = {};

async function importQueue(estado, concurrency = 2) {
  if (!queueMap[estado]) {
    const { default: PQueue } = await import('p-queue');
    queueMap[estado] = new PQueue({ concurrency });
  }
  return queueMap[estado];
}

function clearQueues() {
  for (const estado in queueMap) {
    queueMap[estado].clear(); // limpa tarefas pendentes
    delete queueMap[estado];  // remove a fila do mapa
  }
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
    clearQueues,
    setCancelFlag
};
