# Extração de Dados de Processos Judiciais com React e Puppeteer

Este projeto utiliza **Puppeteer** para extrair informações sobre processos judiciais a partir de sites de tribunais estaduais, e utiliza React como Front-End.

## Estados Pesquisados (PJE - ESAJ):

- Espírito Santo/ES
- Minas Gerais/MG
- Ceará/CE
- Distrito Federal/DF
- Maranhão/MA
- Paraíba/PB
- Piauí/PI
- TRF1
- TRF5

- Acre/AC
- Alagoas/AL
- Amazonas/AM
- Mato Grosso do Sul/MS
- São Paulo/SP


## 📌 Funcionalidades

- Acessa sites de tribunais estaduais configurados no arquivo `variables.json`
- Pesquisa processos informados no input de arquivo `.xlsx`
- Extrai informações como:
  - Partes e advogados
  - Data da distribuição
  - Última movimentação
  - Situação do processo (Arquivado ou não)
- Salva os resultados em `PJE_YYYY-MM-DD.csv`
- Registra erros em `PJE-erros_YYYY-MM-DD.txt`
- Controla processos já processados para evitar duplicação
- Processamento concorrente com limite de requisições simultâneas

---

## 📦 Dependências

Este projeto utiliza as seguintes bibliotecas:

- **[Puppeteer](https://pptr.dev/)**: Para automação do navegador e extração dos dados.
- **[p-limit](https://www.npmjs.com/package/p-limit)**: Para limitar o número de processos executados simultaneamente.
- **File System (fs)** (nativo do Node.js): Para leitura e escrita de arquivos JSON, CSV e TXT.

### 📥 Instalação

1. Clone este repositório:
   ```bash
   git clone https://github.com/whitwander/trautomations.git
   cd trautomations
   ```

2. Execute o comando duas vezes, uma para o React e outra para o servidor em Express nas pastas (App e Server) e instale as dependências:
   ```bash
   npm install
   ```

---

## 🚀 Como Usar

### 1️⃣ Preparar o arquivo de entrada
Crie um arquivo CSV ou XLSX contendo os processos a serem consultados um abaixo do outro independente da ordem dos seus estados.

### 2️⃣ Configurar `variables.json`
Este arquivo deve conter os seletores e URLs dos sites dos tribunais estaduais. Exemplo:

```json
{
  "SP": {
    "url": "https://esaj.tjsp.jus.br/",
    "caixaProcesso": "#campoPesquisa",
    "btnSearch": "#btnPesquisar",
    "tblProcessos": "#tabelaResultados",
    "btnVerDetalhes": "#detalhesProcesso",
    "divDadosProcesso": "#infoProcesso",
    "spanMovimentacaoProcesso": ".ultima-movimentacao",
    "poloAtivoParticipante": ".poloAtivo .parte"
  }
}
```

### 3️⃣ Executar o script

Para iniciar a extração de dados utilize a interface gráfica inserindo um CSV com os dados, ou execute no terminal para rodar somente o código em JS na pasta server:
```bash
node server.js
```
E iniciar o Front-End React na pasta App: 

```bash
npm start
```
