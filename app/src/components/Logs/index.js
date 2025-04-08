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
          const combinedLogs = [...prevLogs, ...data.logs];
          return Array.from(new Set(combinedLogs));
        });
      } catch (error) {
        console.error('Erro ao buscar logs:', error);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

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
