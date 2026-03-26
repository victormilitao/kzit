'use client';

import { useRef, useState } from 'react';
import { useToast } from './Toast';

interface UploadZoneProps {
  onUploadComplete: () => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [dragover, setDragover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const uploadFile = async (file: File) => {
    if (!file.name.endsWith('.txt')) {
      showToast('Apenas arquivos .txt são aceitos', 'error');
      return;
    }

    setUploading(true);
    setProgress(30);
    setStatusText(`Enviando ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const r = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await r.json();

      if (!data.success) throw new Error(data.error || 'Erro no upload');

      if (data.data.status === 'DONE' && data.data.totalMessages === 0) {
        setProgress(100);
        setStatusText(data.data.message);
        showToast(data.data.message);
        setTimeout(() => setUploading(false), 3000);
        onUploadComplete();
        return;
      }

      setProgress(60);
      const dupMsg = data.data.duplicated > 0 ? ` (${data.data.duplicated} já processadas)` : '';
      setStatusText(`${data.data.totalMessages} mensagens novas${dupMsg}. Processando com IA...`);

      pollStatus(data.data.uploadId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro no upload', 'error');
      setUploading(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const pollStatus = (uploadId: string) => {
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/uploads/${uploadId}`);
        const data = await r.json();
        const upload = data.data;

        const pct = upload.totalMessages > 0
          ? Math.round(60 + (upload.processedMessages / upload.totalMessages) * 40)
          : 60;
        setProgress(pct);
        setStatusText(`Processando: ${upload.processedMessages}/${upload.totalMessages} mensagens...`);

        if (upload.status === 'DONE' || upload.status === 'FAILED') {
          clearInterval(interval);
          setProgress(100);

          if (upload.status === 'DONE') {
            setStatusText(`✅ Concluído! ${upload.processedMessages} mensagens processadas.`);
            showToast('Processamento concluído!');
          } else {
            setStatusText('❌ Erro no processamento.');
            showToast('Erro no processamento', 'error');
          }

          setTimeout(() => setUploading(false), 3000);
          onUploadComplete();
        }
      } catch {
        clearInterval(interval);
      }
    }, 2000);
  };

  return (
    <div
      className={`upload-zone ${dragover ? 'dragover' : ''}`}
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
      onDragLeave={() => setDragover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragover(false);
        if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]);
      }}
    >
      <span className="upload-icon">📄</span>
      <h3>Arraste o arquivo .txt aqui</h3>
      <p>ou clique para selecionar — Exportação de conversa do WhatsApp</p>
      <input
        type="file"
        ref={fileInputRef}
        accept=".txt"
        style={{ display: 'none' }}
        onChange={() => {
          if (fileInputRef.current?.files?.[0]) uploadFile(fileInputRef.current.files[0]);
        }}
      />
      {uploading && (
        <div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="upload-status">{statusText}</div>
        </div>
      )}
    </div>
  );
}
