import { useEffect, useState, useRef } from 'react';
import "./index.css";

export default function LogViewer() {
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('http://localhost:8080/logs');
        const data = await response.json();

        setLogs((prevLogs) => {
          const newLogs = [...prevLogs, ...data.logs]; // Acumula logs antigos + novos
          return [...new Set(newLogs)]; // Remove duplicados
        });
      } catch (error) {
        console.error('Erro ao buscar logs:', error);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  // Scroll automático para o final ao receber novos logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="log-container">
      {logs.map((log, index) => (
        <p key={`${log}-${index}`} className="p-log">
          {log}
        </p>
      ))}
      <div ref={logsEndRef} />
    </div>
  );
}
