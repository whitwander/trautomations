import { useState } from "react";
import "./App.css";
import Logs from "./components/Logs";
import processarArquivoXLSX from "./components/Regex";
import { ArchiveRestore, SquareX } from 'lucide-react';
import ProgressBar from "./components/ProgressBar";

function App() {
  const [status, setStatus] = useState("...");
  const [abortController, setAbortController] = useState(null);

  const [incluirPartes, setIncluirPartes] = useState(true);
  const [incluirData, setIncluirData] = useState(true);
  const [incluirSituacao, setIncluirSituacao] = useState(true);
  const [incluirUltima, setIncluirUltima] = useState(true);

  const uploadFile = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      alert("Selecione um arquivo XLSX primeiro!");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setStatus("Processando arquivo...\n");

        const processosPorEstado = processarArquivoXLSX(e.target.result);
        console.log(processosPorEstado)

        // Adiciona a config dos checkboxes a cada grupo
        const config = {
          incluirPartesAdvogados: incluirPartes,
          incluirDataDistribuicao: incluirData,
          incluirArquivado: incluirSituacao,
          incluirUltimaMovimentacao: incluirUltima
        };

        // Separa por sistema automaticamente

        // IMPEDEM ROBÔ: ES, MA
        const pjeStates = ['AP', 'CE', 'PI', 'MG', 'RO', 'TRF1', 'TRF5', 'RJ', 'DF'];
        const esajStates = ['AC', 'AL', 'SP'];
        const rsState = ['RS'];
        const goState = ['GO'];

        const dadosPje = {};
        const dadosEsaj = {};
        const dadosRs = {};
        const dadosGo = {};

        for (const estado in processosPorEstado) {
          if (pjeStates.includes(estado)) {
            dadosPje[estado] = processosPorEstado[estado];
          } else if (esajStates.includes(estado)) {
            dadosEsaj[estado] = processosPorEstado[estado];
          } else if (rsState.includes(estado)) {
            dadosRs[estado] = processosPorEstado[estado];
          } else if(goState.includes(estado)){
            dadosGo[estado] = processosPorEstado[estado];
          }
        }

        const controller = new AbortController();
        setAbortController(controller);

        const resultados = [];

        const enviar = async (url, dadosPorEstado) => {
          const total = Object.values(dadosPorEstado).reduce((acc, lista) => acc + lista.length, 0);
          if (!total) return;

          setStatus(`Enviando ${total} processos para ${url}...\n`);

          const response = await fetch(`http://localhost:8080/${url}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...dadosPorEstado,
              config
            }),
            signal: controller.signal,
          });

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let resultText = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            resultText += decoder.decode(value, { stream: true });
            setStatus(prev => prev + decoder.decode(value, { stream: true }));
          }

          resultados.push(resultText);

          console.log(resultados)
        };

        await enviar("extrairPje", dadosPje);
        await enviar("extrairEsaj", dadosEsaj);
        await enviar("extrairRs", dadosRs);
        await enviar("extrairGo", dadosGo);

        setStatus("Processamento concluído!");

      } catch (error) {
        if (error.name === "AbortError") {
          setStatus("Operação cancelada pelo usuário.");
        } else {
          setStatus("Erro na requisição!");
        }
      }
    };

    reader.readAsArrayBuffer(file);
  };


  const cancelarOperacao = async () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setStatus("Operação cancelada.");

      await fetch("http://localhost:8080/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    }
  };

  return (
    <div className="main-container">
      <h1 className="container-title">Pesquisa de Processos</h1>
      <div className="container">
        <div className="left-side-box">
          <div className="search-states">
            <h3>Estados pesquisados</h3>
            <p><span>PJE:</span> AP - RJ - CE - MG - PI - TRF/1-5<br /><span>ESAJ:</span> AC - AL - SP<br /><span>OUTROS:</span> RS - GO</p>
          </div>
          <div className="box-select">
            <p className="box-select-title">Informações para extrair:</p>
            <div>
              <input type="checkbox" id="partes" checked={incluirPartes} onChange={() => setIncluirPartes(!incluirPartes)} />
              <label htmlFor="partes">Partes e Advogados</label>
            </div>
            <div>
              <input type="checkbox" id="data" checked={incluirData} onChange={() => setIncluirData(!incluirData)} />
              <label htmlFor="data">Data de distribuição</label>
            </div>
            <div>
              <input type="checkbox" id="situacao" checked={incluirSituacao} onChange={() => setIncluirSituacao(!incluirSituacao)} />
              <label htmlFor="situacao">Situação do processo</label>
            </div>
            <div>
              <input type="checkbox" id="ultima" checked={incluirUltima} onChange={() => setIncluirUltima(!incluirUltima)} />
              <label htmlFor="ultima">Última movimentação</label>
            </div>
          </div>

          <div className="box-btn">
            <label className="custom-file-upload" htmlFor="upload-file"><ArchiveRestore size={"18px"} />Carregar arquivo XLSX</label>
            <input type="file" accept=".xlsx" id="upload-file" onChange={uploadFile} />
            <button className="btn-cancel" onClick={cancelarOperacao}><SquareX size={"18px"} /> Cancelar execução</button>
          </div>
        </div>

        <div className="status">
          <p className="status-title">{status}</p>
          <ProgressBar />
          <Logs />
        </div>
      </div>
    </div>
  );
}

export default App;
