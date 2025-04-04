const fs = require('fs');
const path = require('path');

function criarPastaResultados() {
  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
  const dir = path.join(__dirname, `../../resultados/${dateStr}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return {
    pasta: dir,
    outputFile: path.join(dir, `resultados_${dateStr}.csv`),
    errorFile: path.join(dir, `erros_${dateStr}.txt`)
  };
}

function salvarCabecalhoCSV(arquivo) {
  fs.writeFileSync(arquivo, "Estado;Processo;Partes e Advogados;Data de Distribuição;Última Movimentação\n", 'utf-8');
}

function salvarLinhaCSV(arquivo, dados) {
  const { estado, processo, partesAdvogados, dataDistribuicao, ultimaMovimentacao } = dados;
  const linha = `${sanitize(estado)};${sanitize(processo)};"${sanitize(partesAdvogados)}";${sanitize(dataDistribuicao)};${sanitize(ultimaMovimentacao)}\n`;
  fs.appendFileSync(arquivo, linha, 'utf-8');
}

function salvarErroTXT(arquivo, processo, mensagem) {
  const linha = `Erro no processo ${processo}: ${mensagem}\n`;
  fs.appendFileSync(arquivo, linha, 'utf-8');
}

function sanitize(valor) {
  if (!valor) return 'Não informado';
  return valor.replace(/"/g, "'").replace(/;/g, ',').replace(/\r?\n|\r/g, ' ');
}

module.exports = {
  criarPastaResultados,
  salvarCabecalhoCSV,
  salvarLinhaCSV,
  salvarErroTXT
};
