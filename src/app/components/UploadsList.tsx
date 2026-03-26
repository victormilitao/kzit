'use client';

import { useState } from 'react';
import { formatDate } from '../utils';
import { Icon } from './Icon';

interface Upload {
  id: string;
  filename: string;
  totalMessages: number;
  processedMessages: number;
  status: string;
  createdAt: string;
}

interface UploadsListProps {
  uploads: Upload[];
}

export function UploadsList({ uploads }: UploadsListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!uploads.length) {
    return (
      <div className="empty-state">
        <span className="es-icon" style={{ fontSize: '32px', color: 'var(--text-muted)' }}>
          <Icon name="FolderOpen" size={32} />
        </span>
        <p>Nenhum upload ainda. Arraste um arquivo .txt acima.</p>
      </div>
    );
  }

  return (
    <div className="uploads-section">
      <button
        className="uploads-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="Folder" size={16} /> {uploads.length} arquivo{uploads.length !== 1 ? 's' : ''} enviado{uploads.length !== 1 ? 's' : ''}
        </span>
        <span className={`toggle-icon ${expanded ? 'open' : ''}`} style={{ display: 'flex' }}>
          <Icon name="ChevronRight" size={16} />
        </span>
      </button>

      {expanded && (
        <div className="uploads-list">
          {uploads.map((u) => (
            <div key={u.id} className="upload-item">
              <div className="info">
                <span className="filename" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="FileText" size={14} /> {u.filename}
                </span>
                <span className="meta">
                  {u.processedMessages}/{u.totalMessages} mensagens • {formatDate(u.createdAt)}
                </span>
              </div>
              <span className={`status-badge status-${u.status}`}>{u.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
