import { useState } from "react";
import "./App.css";
import Logs from "./components/Logs"; 
import processarArquivoXLSX from "./components/Regex"; 

function App() {
  const [status, setStatus] = useState("");
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [abortController, setAbortController] = useState(null);

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

        setStatus("Arquivo processado. Enviando para o servidor...\n");

        const controller = new AbortController();
        setAbortController(controller);

        const response = await fetch("http://localhost:8080/extrair", {
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
          setDownloadUrl(finalResult.downloadUrl);
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
    <div className="container">
      <h1 className="container-title">Pesquisa de Processos</h1>
      <h2 className="container-state">ES / MG / CE / DF / MA / PB / PI / TRF1 / TRF5</h2>
      <label className="custom-file-upload" htmlFor="upload-file">Carregar arquivo XLSX</label>
      <input type="file" accept=".xlsx" id="upload-file" onChange={uploadFile} />
      <button className="btn-cancel" onClick={cancelarOperacao}>Cancelar execução</button>
      {downloadUrl && (
        <a className="link" href={downloadUrl} download>Baixar Resultados</a>
      )}
      <p className="status-title">{status}</p>
      <div className="status">
        <Logs />
      </div>
    </div>
  );
}

export default App;
