import React, { useEffect, useState } from 'react';

export default function ProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const evtSource = new EventSource("http://localhost:8080/progress");

    evtSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data.progress);
    };

    return () => {
      evtSource.close();
    };
  }, []);

  return (
    <div style={{ border: '2px solid rgb(190, 233, 231)', width: '80%', height: '20px', borderRadius: '10px', marginBottom: '10px' }}>
      <div
        style={{
          width: `${progress}%`,
          borderRadius: '10px',
          height: '100%',
          fontSize: '14px',
          backgroundColor: 'rgb(111, 196, 218)',
          transition: 'width 0.3s ease',
          color: 'white',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center', // centraliza verticalmente
          justifyContent: 'center', // centraliza horizontalmente
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingLeft: '30px' }}>
          {progress}%
        </div>
      </div>
    </div>
  );
}
