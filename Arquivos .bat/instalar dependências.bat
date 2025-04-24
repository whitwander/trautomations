@echo off
REM Caminho para a primeira pasta onde será executado o npm start
set "PASTA_NPM=C:\Users\marcelino.amaral\Documents\git testes\trs-automations\app"

REM Caminho para a segunda pasta onde será executado o node main.js
set "PASTA_NODE=C:\Users\marcelino.amaral\Documents\git testes\trs-automations\app\server"

REM Abre um novo terminal e executa npm start
start "Iniciando instalação do React" cmd /k "cd /d %PASTA_NPM% && npm install"

REM Abre um novo terminal e executa node main.js
start "Iniciando instalação do Servidor" cmd /k "cd /d %PASTA_NODE% && npm install"
