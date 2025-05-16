@echo off
REM Caminho para a primeira pasta onde será executado o npm start
set "PASTA_NPM=C:\Users\thiago.silva\Desktop\trautomations\app"

REM Caminho para a segunda pasta onde será executado o node main.js
set "PASTA_NODE=C:\Users\thiago.silva\Desktop\trautomations\app\server"

REM Abre um novo terminal e executa npm start
start "Iniciando npm start" cmd /k "cd /d %PASTA_NPM% && npm start"

REM Abre um novo terminal e executa node main.js
start "Iniciando node server.js" cmd /k "cd /d %PASTA_NODE% && node server.js"
