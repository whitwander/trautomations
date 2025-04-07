const logs = [];
let cancelProcessing = false;

/**
 * Adiciona uma mensagem aos logs
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const fullMessage = `[${timestamp}] ${message}`;
  console.log(fullMessage);
  logs.push(fullMessage);
}

/**
 * Retorna todos os logs registrados
 */
function getLogs() {
  return logs;
}

/**
 * Limpa os logs atuais (por exemplo, ao iniciar nova extração)
 */
function clearLogs() {
  logs.length = 0;
}

/**
 * Cancela o processamento atual
 */
function cancelarProcessamento() {
  cancelProcessing = true;
}

/**
 * Retorna se o processamento foi cancelado
 */
function isCancelado() {
  return cancelProcessing;
}

/**
 * Reseta a flag de cancelamento
 */
function resetarCancelamento() {
  cancelProcessing = false;
}

module.exports = {
  log,
  getLogs,
  clearLogs,
  cancelarProcessamento,
  isCancelado,
  resetarCancelamento
};
