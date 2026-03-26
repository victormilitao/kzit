'use client';

import { useState } from 'react';
import { UploadZone } from './UploadZone';
import { SpreadsheetImportZone } from './SpreadsheetImportZone';
import { UploadsList } from './UploadsList';
import { Icon } from './Icon';

interface Upload {
  id: string;
  filename: string;
  totalMessages: number;
  processedMessages: number;
  status: string;
  createdAt: string;
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  uploads: Upload[];
}

export function ImportModal({ open, onClose, onImportComplete, uploads }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<'txt' | 'xlsx'>('txt');

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Importação de Dados</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="import-tabs" style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-light)' }}>
            <button 
              onClick={() => setActiveTab('txt')}
              style={{ padding: '12px 16px', fontSize: '14px', background: 'none', border: 'none', borderBottom: activeTab === 'txt' ? '2px solid var(--text-primary)' : '2px solid transparent', color: activeTab === 'txt' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: activeTab === 'txt' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
            >
              <Icon name="MessageSquareText" size={16} /> WhatsApp (.txt)
            </button>
            <button 
              onClick={() => setActiveTab('xlsx')}
              style={{ padding: '12px 16px', fontSize: '14px', background: 'none', border: 'none', borderBottom: activeTab === 'xlsx' ? '2px solid var(--text-primary)' : '2px solid transparent', color: activeTab === 'xlsx' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: activeTab === 'xlsx' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
            >
              <Icon name="FileSpreadsheet" size={16} /> Planilha Extrato (.xlsx, .csv)
            </button>
          </div>

          <div className="import-tab-content">
            {activeTab === 'txt' && (
              <UploadZone onUploadComplete={onImportComplete} />
            )}
            {activeTab === 'xlsx' && (
              <SpreadsheetImportZone onImported={onImportComplete} />
            )}
          </div>

          {activeTab === 'txt' && (
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px dashed var(--border-light)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px' }}>Histórico de Importações</h4>
              <UploadsList uploads={uploads} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
