Extração de Dados de Processos Judiciais com Puppeteer

Este projeto utiliza Puppeteer para extrair informações sobre processos judiciais a partir de sites de tribunais estaduais.

📌 Funcionalidades

Acessa sites de tribunais estaduais configurados no arquivo variables.json

Pesquisa processos informados em dados_processos_YYYY-MM-DD.json

Extrai informações como:

Partes e advogados

Data da distribuição

Última movimentação

Salva os resultados em resultados_YYYY-MM-DD.csv

Registra erros em erros_YYYY-MM-DD.txt

Controla processos já processados para evitar duplicação

Processamento concorrente com limite de requisições simultâneas

📦 Dependências

Este projeto utiliza as seguintes bibliotecas:

Puppeteer: Para automação do navegador e extração dos dados.

p-limit: Para limitar o número de processos executados simultaneamente.

File System (fs) (nativo do Node.js): Para leitura e escrita de arquivos JSON, CSV e TXT.

📥 Instalação

Clone este repositório:

git clone https://github.com/seu-usuario/seu-repositorio.git
cd seu-repositorio

Instale as dependências:

npm install puppeteer p-limit

🚀 Como Usar

1️⃣ Preparar o arquivo de entrada

Crie um arquivo JSON contendo os processos a serem consultados. O formato esperado é:

{
  "SP": ["0000001-00.2023.8.26.0000", "0000002-00.2023.8.26.0000"],
  "RJ": ["1000001-00.2023.8.19.0000"]
}

Nomeie o arquivo seguindo o padrão dados_processos_YYYY-MM-DD.json (exemplo: dados_processos_2025-03-28.json).

2️⃣ Configurar variables.json

Este arquivo deve conter os seletores e URLs dos sites dos tribunais estaduais. Exemplo:

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

3️⃣ Executar o script

Para iniciar a extração de dados, execute:

node main.js

Ou utilize a interface gráfica do python.

📂 Estrutura do Projeto

📁 projeto-puppeteer
 ├── 📄 main.js            # Código principal de extração
 ├── 📄 variables.json      # Configuração dos sites de tribunais
 ├── 📄 dados_processos_YYYY-MM-DD.json  # Lista de processos
 ├── 📄 resultados_YYYY-MM-DD.csv  # Resultados extraídos
 ├── 📄 erros_YYYY-MM-DD.txt  # Processos com erro
 ├── 📄 README.md           # Documentação do projeto
 ├── 📄 package.json        # Dependências do projeto
 ├── 📄 package-lock.json   # Controle de versões
 └── 📄 GUI.py # Interface em python


