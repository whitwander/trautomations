import { useState } from "react";
import "./App.css";

function App() {
  const [status, setStatus] = useState("");
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs((prevLogs) => [...prevLogs, message]);
  };

  const uploadFile = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      alert("Selecione um arquivo JSON primeiro!");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const jsonData = JSON.parse(e.target.result);
      setStatus("Processando...\n");
      addLog("Iniciando o processamento...");

      try {
        const response = await fetch("http://localhost:8080/extrair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jsonData),
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let resultText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          resultText += decoder.decode(value, { stream: true });
          setStatus(resultText);
          addLog("Recebendo dados do servidor...");
        }

        const finalResult = JSON.parse(resultText);
        if (finalResult.downloadUrl) {
          setStatus((prev) => prev + "\nProcessamento concluído!");
          setDownloadUrl(finalResult.downloadUrl);
          addLog("Processamento concluído com sucesso!");
        } else {
          setStatus((prev) => prev + "\nErro ao processar os dados!");
          addLog("Erro ao processar os dados!");
        }
      } catch (error) {
        setStatus((prev) => prev + "\nErro na requisição!");
        addLog("Erro na requisição ao servidor!");
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="container">
      <h1 className="container-title">Pesquisa de Processos</h1>
      <label className="custom-file-upload" for="upload-file">Carregar arquivo CSV</label>
      <input type="file" accept="application/json" id="upload-file" onChange={uploadFile} />
      <button className="btn-cancel">Cancelar execução</button>
      <div>
        {status}
      </div>
      {downloadUrl && (
        <a href={downloadUrl}>
          Baixar CSV
        </a>
      )}
      <div className="status">
        <p className="status-title">Status dos processos</p>
        <pre>{logs.join("\n")}</pre>
      </div>
    </div>
  );
}

export default App;