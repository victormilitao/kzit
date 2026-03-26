'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface ImportResult {
  totalRows: number;
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

interface ImportSpreadsheetModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function ImportSpreadsheetModal({ open, onClose, onImported }: ImportSpreadsheetModalProps) {
  const t = useTranslations('importSpreadsheet');
  const tCommon = useTranslations('common');

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [responsavel, setResponsavel] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const parsePreview = (text: string) => {
    const lines = text.trim().split(/\r?\n/).slice(0, 6); // header + 5 rows
    let separator = '|';
    if (lines[0]?.includes('|')) separator = '|';
    else if (lines[0]?.includes(';')) separator = ';';
    else if (lines[0]?.includes(',')) separator = ',';

    return lines.map((line) => line.split(separator).map((c) => c.trim()));
  };

  const handleFile = (f: File) => {
    setFile(f);
    setError('');
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setPreview(parsePreview(text));
    };
    reader.readAsText(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) {
      handleFile(f);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setResponsavel('');
    setError('');
    setResult(null);
    onClose();
  };

  const handleImport = async () => {
    if (!file) {
      setError(t('noFile'));
      return;
    }
    if (!responsavel.trim()) {
      setError(t('responsibleLabel') + ' é obrigatório');
      return;
    }

    setImporting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('responsavel', responsavel.trim());

      const res = await fetch('/api/entries/import', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('errorImporting'));
      }

      const data = await res.json();
      setResult(data.data);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorImporting'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t('title')}</h3>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-body">
          {result ? (
            <div className="import-result">
              <h4>{t('resultTitle')}</h4>
              <div className="import-stats">
                <div className="import-stat">
                  <span className="stat-label">{t('totalRows')}</span>
                  <span className="stat-value">{result.totalRows}</span>
                </div>
                <div className="import-stat stat-success">
                  <span className="stat-label">{t('imported')}</span>
                  <span className="stat-value">{result.imported}</span>
                </div>
                <div className="import-stat stat-warning">
                  <span className="stat-label">{t('skipped')}</span>
                  <span className="stat-value">{result.skipped}</span>
                </div>
                <div className="import-stat stat-error">
                  <span className="stat-label">{t('errors')}</span>
                  <span className="stat-value">{result.errors.length}</span>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="import-errors">
                  {result.errors.map((err, i) => (
                    <div key={i} className="import-error-row">
                      <strong>{t('errorRow', { row: err.row })}:</strong> {err.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div
                className={`dropzone ${dragOver ? 'dropzone-active' : ''} ${file ? 'dropzone-has-file' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                {file ? (
                  <div className="dropzone-file">
                    <span className="dropzone-icon">📄</span>
                    <span>{file.name}</span>
                    <span className="dropzone-size">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <div className="dropzone-placeholder">
                    <span className="dropzone-icon">📥</span>
                    <p>{t('dropzone')}</p>
                    <small>{t('acceptedFormats')}</small>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>{t('responsibleLabel')}</label>
                <input
                  type="text"
                  placeholder={t('responsiblePlaceholder')}
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                />
              </div>

              {preview.length > 0 && (
                <div className="import-preview">
                  <h4>{t('preview')} — {t('previewRows', { count: Math.min(preview.length - 1, 5) })}</h4>
                  <div className="table-wrapper">
                    <table className="preview-table">
                      <thead>
                        <tr>
                          {preview[0].map((header, i) => (
                            <th key={i}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(1).map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td key={j}>{cell || '—'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          {result ? (
            <>
              <button className="btn-cancel" onClick={handleClose}>
                {tCommon('close')}
              </button>
              <button className="btn-save" onClick={() => {
                setResult(null);
                setFile(null);
                setPreview([]);
              }}>
                {t('importAnother')}
              </button>
            </>
          ) : (
            <>
              <button className="btn-cancel" onClick={handleClose} disabled={importing}>
                {tCommon('cancel')}
              </button>
              <button
                className="btn-save"
                onClick={handleImport}
                disabled={importing || !file}
              >
                {importing ? tCommon('loading') : t('import', { count: Math.max(preview.length - 1, 0) })}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
