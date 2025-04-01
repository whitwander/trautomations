import { useState } from "react";

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
    <div style={{ textAlign: "center", fontFamily: "Arial, sans-serif" }}>
      <h1>Envio de Processos</h1>
      <input type="file" accept="application/json" onChange={uploadFile} />
      <div
        style={{ marginTop: "20px", whiteSpace: "pre-line", textAlign: "left", display: "inline-block" }}
      >
        {status}
      </div>
      {downloadUrl && (
        <a href={downloadUrl} download style={{ display: "block", marginTop: "20px" }}>
          Baixar CSV
        </a>
      )}
      <div
        style={{ marginTop: "20px", padding: "10px", backgroundColor: "#f4f4f4", borderRadius: "5px" }}
      >
        <h3>Logs:</h3>
        <pre>{logs.join("\n")}</pre>
      </div>
    </div>
  );
}

export default App;