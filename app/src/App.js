import { useState } from "react";
import "./App.css";
import Logs from "./components/Logs";
import processarArquivoXLSX from "./components/Regex";
import { ArchiveRestore, SquareX } from 'lucide-react';

function App() {
  const [status, setStatus] = useState("...");
  const [abortController, setAbortController] = useState(null);
  const [tipoSistema, setTipoSistema] = useState('esaj');

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
        if (tipoSistema === '-') {
          alert("Selecione o tipo de sistema (e-SAJ ou PJe) antes de continuar!");
          return;
        }

        setStatus("Processando arquivo...\n");

        const processosPorEstado = processarArquivoXLSX(e.target.result);

        // Adiciona a config dos checkboxes ao JSON
        processosPorEstado.config = {
          incluirPartesAdvogados: incluirPartes,
          incluirDataDistribuicao: incluirData,
          incluirArquivado: incluirSituacao,
          incluirUltimaMovimentacao: incluirUltima
        };

        setStatus("Arquivo processado. Enviando para o servidor...\n");

        const controller = new AbortController();
        setAbortController(controller);

        const rota = tipoSistema === "esaj" ? "extrairEsaj" : "extrairPje";
        const response = await fetch(`http://localhost:8080/${rota}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(processosPorEstado),
          signal: controller.signal,
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let resultText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          resultText += decoder.decode(value, { stream: true });
          setStatus(resultText);
        }

        const finalResult = JSON.parse(resultText);
        if (finalResult.downloadUrl) {
          setStatus("\nProcessamento concluído!");
        } else {
          setStatus((prev) => prev + "\nErro ao processar os dados!");
        }
      } catch (error) {
        if (error.name === "AbortError") {
          setStatus("Operação cancelada pelo usuário.");
        } else {
          setStatus((prev) => prev + "\nErro na requisição!");
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
          <div className="select-container">
            <label>Selecione o sistema: </label>
            <select
              id="tipoSistema"
              value={tipoSistema}
              onChange={(e) => setTipoSistema(e.target.value)}
            >
              <option value="esaj">e-SAJ</option>
              <option value="pje">PJe</option>
            </select>
        
            {tipoSistema === 'esaj' && <p className="state-list">AC | AL | AM | MS | SP</p>}
            {tipoSistema === 'pje' && <p className="state-list">AP | CE | DF | ES | MA | MG | PB | PI | RO | RN | TRFs</p>}
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
            <button className="btn-cancel" onClick={cancelarOperacao}><SquareX size={"18px"}/> Cancelar execução</button>
          </div>
        </div>

        <div className="status">
          <p className="status-title">{status}</p>
          <Logs />
        </div>
      </div>
    </div>
  );
}

export default App;
