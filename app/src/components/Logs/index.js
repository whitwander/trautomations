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
          const newLogs = [...prevLogs, ...data.logs];
          return Array.from(new Set(newLogs)); // Remove duplicatas mantendo a ordem
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
    if (logsEndRef.current) {
      logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    setTimeout(() => {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
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
