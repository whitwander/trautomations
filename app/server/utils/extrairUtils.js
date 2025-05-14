const CONCURRENT_LIMIT = 2;

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
    importPLimit,
    logMessage,
    setCancelFlag
};
