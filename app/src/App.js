import { useState } from "react";
import "./App.css";
import Logs from "./components/Logs"; // Componente de logs
import processarArquivoXLSX from "./components/Regex"; // Importando a função de processamento

function App() {
  const [status, setStatus] = useState("");
  const [downloadUrl, setDownloadUrl] = useState(null);

  const uploadFile = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      alert("Selecione um arquivo CSV primeiro!");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setStatus("Processando arquivo...\n");

        // Processar o arquivo XLSX e obter JSON formatado
        const processosPorEstado = processarArquivoXLSX(file);

        setStatus("Arquivo processado. Enviando para o servidor...\n");

        const response = await fetch("http://localhost:8080/extrair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(processosPorEstado),
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
          setStatus((prev) => prev + "\nProcessamento concluído!");
          setDownloadUrl(finalResult.downloadUrl);
        } else {
          setStatus((prev) => prev + "\nErro ao processar os dados!");
        }
      } catch (error) {
        setStatus((prev) => prev + "\nErro na requisição!");
      }
    };

    reader.readAsArrayBuffer(file); // Lê o arquivo como ArrayBuffer para XLSX
  };

  return (
    <div className="container">
      <h1 className="container-title">Pesquisa de Processos</h1>
      <label className="custom-file-upload" htmlFor="upload-file">
        Carregar arquivo CSV
      </label>
      <input type="file" accept=".xlsx" id="upload-file" onChange={uploadFile} />
      <button className="btn-cancel">Cancelar execução</button>
      {downloadUrl && (
        <a href={downloadUrl} download>
          Baixar CSV
        </a>
      )}
      <div className="status">
        <p className="status-title">{status}</p>
        <Logs />
      </div>
    </div>
  );
}

export default App;
