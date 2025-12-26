import { useState } from 'react';
import axios from 'axios';


const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const API = 'http://localhost:3000/uploads';
const MAX_CONCURRENCY = 3;
const MAX_RETRIES = 3;


export default function Uploader() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [grid, setGrid] = useState([]);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(0);
  const [zipMessage, setZipMessage] = useState('');
  const [started, setStarted] = useState(false);



  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const uploadChunk = async (uploadId, index, chunk, status, totalChunks) => {
    setZipMessage('Uploading');

    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
        const start = Date.now();
        await axios.post(`${API}/${uploadId}/chunk`, chunk, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'chunk-index': index,
            'chunk-size': CHUNK_SIZE
          }
        });
        const time = (Date.now() - start) / 1000;
        const mb = chunk.size / (1024 * 1024);
        setSpeed((mb / time).toFixed(2));
        status[index] = 'DONE';
        setGrid([...status]);
        setProgress(p => Math.min(100, p + (100 / totalChunks)));
        return;
      } catch (err) {
        attempt++;

        if (!err.response) {
          setZipMessage('⚠ Network lost. Retrying when connection is restored...');
        }

        await sleep(2 ** attempt * 500);
      }

    }
    status[index] = 'ERROR';
    setGrid([...status]);
  };

  const startUpload = async () => {
    setZipMessage('⏳ Preparing upload…');

    setStarted(true);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // const { data } = await axios.post(`${API}/init`, {
    //   filename: file.name,
    //   totalSize: file.size,
    //   totalChunks
    // });

    let data;
    try {
      const res = await axios.post(`${API}/init`, {
        filename: file.name,
        totalSize: file.size,
        totalChunks
      });
      data = res.data;
    } catch (err) {
      setZipMessage('❌ Network unavailable. Please check your connection.');
      return;
    }


    const { uploadId, uploadedChunks } = data;
    const status = Array(totalChunks).fill('PENDING');
    uploadedChunks.forEach(i => status[i] = 'DONE');
    setGrid(status);
    const done = uploadedChunks.length;
    setProgress((done / totalChunks) * 100);


    let queue = [];
    for (let i = 0; i < totalChunks; i++) {
      if (status[i] !== 'DONE') {
        const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        queue.push({ i, chunk });
      }
    }

    let inFlight = [];
    const startTime = Date.now();

    while (queue.length || inFlight.length) {
      while (inFlight.length < MAX_CONCURRENCY && queue.length) {
        const { i, chunk } = queue.shift();
        status[i] = 'UPLOADING';
        setGrid([...status]);
        const p = uploadChunk(uploadId, i, chunk, status, totalChunks);
        inFlight.push(p);
        p.finally(() => inFlight.splice(inFlight.indexOf(p), 1));
      }
      await Promise.race(inFlight);
      const elapsed = (Date.now() - startTime) / 1000;
      const done = status.filter(s => s === 'DONE').length;
      const rate = done / elapsed;
      setEta(((totalChunks - done) / rate).toFixed(1));
    }
    //     const res = await axios.post(`${API}/${uploadId}/finalize`);

    // if (res.data.files?.[0]?.includes('invalid')) {
    //   setZipMessage('⚠ Uploaded file is not a valid ZIP. File uploaded, but ZIP preview failed.');
    // } else {
    //   setZipMessage('ZIP verified successfully.');
    // }

    try {
      const res = await axios.post(`${API}/${uploadId}/finalize`);

      setProgress(100);

      if (res.data.files?.[0]?.includes('invalid')) {
        setZipMessage('⚠ Uploaded file is not a valid ZIP. File uploaded, but ZIP preview failed.');
      } else {
        setZipMessage('✔ ZIP uploaded and verified successfully.');
      }
    } catch (err) {
      setProgress(100);

      if (err.response?.status === 409) {
        setZipMessage('✔ Upload already completed successfully.');
      } else {
        setZipMessage('⚠ Unexpected error during finalization.');
      }
    }



  };


  return (

    <>
      <input type="file" onChange={e => setFile(e.target.files[0])} />
      <button disabled={!file} onClick={startUpload}>Upload</button>

      {started && (
        <>

          {/* STATS */}
          <div className="stats">
            <span>Speed: {speed} MB/s</span>
            <span>ETA: {eta}s</span>
          </div>

          {/* PROGRESS BAR */}
          <div className="progress-bar">
            <div style={{ width: `${progress}%` }} />
          </div>

          {zipMessage && (
            <div
              style={{
                marginTop: '10px',
                padding: '8px',
                borderRadius: '6px',
                background: zipMessage.includes('⚠') ? '#7c2d12' : '#14532d',
                color: 'white',
                fontSize: '13px'
              }}
            >
              {zipMessage}
            </div>
          )}


          {progress === 100 && (
            <h4 style={{ color: '#22c55e', marginTop: '10px' }}>
              Upload Completed.
            </h4>
          )}

          {/* CHUNK GRID */}
          <h4 style={{ marginTop: '20px' }}>Chunk Status</h4>

          <div className="grid">
            {grid.map((s, i) => (
              <div key={i} className={`cell ${s}`}>{i}</div>
            ))}
          </div>

          {/* LEGEND */}
          <div style={{ fontSize: '12px', marginTop: '10px' }}>
            <span style={{ color: '#22c55e' }}>■ Success</span>&nbsp;&nbsp;
            <span style={{ color: '#f59e0b' }}>■ Uploading</span>&nbsp;&nbsp;
            <span style={{ color: '#334155' }}>■ Pending</span>&nbsp;&nbsp;
            <span style={{ color: '#ef4444' }}>■ Error</span>
          </div>
        </>
      )}
    </>
  );
}