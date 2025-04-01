import { useEffect, useState } from 'react';
import "./index.css"

export default function LogViewer() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('http://localhost:8080/logs');
        const data = await response.json();
        setLogs(data.logs);
      } catch (error) {
        console.error('Erro ao buscar logs:', error);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='log-container'>
      <div>
        {logs.length === 0 ? (
          <p className="text-gray-500">Nenhum log disponível.</p>
        ) : (
          <div>
            {logs.map((log, index) => (
              <p key={index} className='p-log'>
                {`> ${log}`}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
