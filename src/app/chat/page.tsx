'use client';
import React, { useEffect, useRef } from 'react';

const MatchPage = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error("Camera error:", err);
      });
  }, []);

  return (
    <main style={{ backgroundColor: 'black', height: '100vh', position: 'relative' }}>
      <div style={{ position: 'absolute', bottom: '20px', right: '20px', width: '200px', height: '150px' }}>
        <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%' }}></video>
      </div>
    </main>
  );
};

export default MatchPage;
