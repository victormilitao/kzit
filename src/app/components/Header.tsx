'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export function Header() {
  const [health, setHealth] = useState<'checking' | 'ok' | 'err'>('checking');

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/health');
        const data = await r.json();
        setHealth(data.ollama === 'connected' ? 'ok' : 'err');
      } catch {
        setHealth('err');
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusText = {
    checking: 'Verificando...',
    ok: 'Ollama conectado',
    err: 'Ollama offline',
  };

  return (
    <header className="header">
      <div className="header-brand">
        <Image src="/logo.svg" alt="kzit" width={120} height={48} priority />
        <span className="header-subtitle">Dashboard</span>
      </div>
      <div className="health-badge">
        <div className={`health-dot ${health === 'checking' ? '' : health}`} />
        <span>{statusText[health]}</span>
      </div>
    </header>
  );
}
