# Extração de Dados de Processos Judiciais com React e Puppeteer

Este projeto utiliza **Puppeteer** para extrair informações sobre processos judiciais a partir de sites de tribunais estaduais, e utiliza React como Front-End.

## Estados Pesquisados:

- Espírito Santo/ES
- Minas Gerais/MG
- Ceará/CE
- Distrito Federal/DF
- Maranhão/MA
- Paraíba/PB
- Piauí/PI
- TRF1
- TRF5


## 📌 Funcionalidades

- Acessa sites de tribunais estaduais configurados no arquivo `variables.json`
- Pesquisa processos informados em `dados_processos_YYYY-MM-DD.json`
- Extrai informações como:
  - Partes e advogados
  - Data da distribuição
  - Última movimentação
- Salva os resultados em `resultados_YYYY-MM-DD.csv`
- Registra erros em `erros_YYYY-MM-DD.txt`
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
   git clone https://github.com/whitwander/trs-automations.git
   cd trs-automations
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

Para iniciar a extração de dados utilize a interface gráfica inserindo um CSV com os dados, ou execute no terminal para rodar somente o código em JS:
```bash
node server.js
```
E iniciar o Front-End React na pasta App: 

```bash
npm start
```

---

## 📂 Estrutura do Projeto
```
📁 projeto-puppeteer
 ├── 📄 main.js            # Código principal de extração
 ├── 📄 variables.json      # Configuração dos sites de tribunais
 ├── 📄 dados_processos_YYYY-MM-DD.json  # Lista de processos
 ├── 📄 resultados_YYYY-MM-DD.csv  # Resultados extraídos
 ├── 📄 erros_YYYY-MM-DD.txt  # Processos com erro
 ├── 📄 README.md           # Documentação do projeto
 ├── 📄 package.json        # Dependências do projeto
 ├── 📄 package-lock.json   # Controle de versões
 └── 📄 GUI.py # Interface gráfica em Pyhon
```


