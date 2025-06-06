let total = 0;
let atual = 0;

const clients = [];

function initProgress(totalProcessos) {
  total = totalProcessos;
  atual = 0;
}

function incrementProgress() {
  atual++;
  const progress = Math.round((atual / total) * 100);
  sendProgressToClients(progress);
}

function sendProgressToClients(progress) {
  const data = `data: ${JSON.stringify({ progress })}\n\n`;
  clients.forEach(res => res.write(data));
}

function registerClient(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Envia progresso inicial
  const progress = Math.round((atual / total) * 100);
  res.write(`data: ${JSON.stringify({ progress })}\n\n`);
  clients.push(res);

  res.on('close', () => {
    const index = clients.indexOf(res);
    if (index !== -1) clients.splice(index, 1);
  });
}

module.exports = {
  initProgress,
  incrementProgress,
  registerClient
};
