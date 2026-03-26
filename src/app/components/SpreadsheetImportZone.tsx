'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import * as XLSX from 'xlsx';
import { Icon } from './Icon';

interface ImportResult {
  totalRows: number;
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

interface SpreadsheetImportZoneProps {
  onImported: () => void;
}

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];
const ACCEPTED_MIMES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function isAcceptedFile(f: File): boolean {
  const ext = f.name.toLowerCase().slice(f.name.lastIndexOf('.'));
  return ACCEPTED_EXTENSIONS.includes(ext) || ACCEPTED_MIMES.includes(f.type);
}

export function SpreadsheetImportZone({ onImported }: SpreadsheetImportZoneProps) {
  const t = useTranslations('importSpreadsheet');
  const tCommon = useTranslations('common');

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const parseCSVPreview = (text: string): string[][] => {
    const lines = text.trim().split(/\r?\n/).slice(0, 6); // header + 5 rows
    let separator = '|';
    if (lines[0]?.includes('|')) separator = '|';
    else if (lines[0]?.includes(';')) separator = ';';
    else if (lines[0]?.includes(',')) separator = ',';

    return lines.map((line) => line.split(separator).map((c) => c.trim()));
  };

  const parseXLSXPreview = (buffer: ArrayBuffer): string[][] => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rawData: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    // Return header + first 5 rows for preview
    return rawData.slice(0, 6).map((row) => row.map((cell) => String(cell ?? '').trim()));
  };

  const handleFile = (f: File) => {
    setFile(f);
    setError('');
    setResult(null);

    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf('.'));

    if (ext === '.xlsx' || ext === '.xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        setPreview(parseXLSXPreview(buffer));
      };
      reader.readAsArrayBuffer(f);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setPreview(parseCSVPreview(text));
      };
      reader.readAsText(f);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && isAcceptedFile(f)) {
      handleFile(f);
    }
  };

  const resetState = () => {
    setFile(null);
    setPreview([]);
    setError('');
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) {
      setError(t('noFile'));
      return;
    }

    setImporting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

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
    <div className="spreadsheet-import-zone">
      {error && <div className="modal-error">{error}</div>}

      <div className="zone-body">
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
                  accept=".csv,.xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                {file ? (
                  <div className="dropzone-file">
                    <span className="dropzone-icon"><Icon name="FileText" size={28} /></span>
                    <span>{file.name}</span>
                    <span className="dropzone-size">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <div className="dropzone-placeholder">
                    <span className="dropzone-icon"><Icon name="Download" size={28} /></span>
                    <p>{t('dropzone')}</p>
                    <small>{t('acceptedFormats')}</small>
                  </div>
                )}
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

      <div className="zone-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        {result ? (
          <button className="btn-save" onClick={resetState}>
            {t('importAnother')}
          </button>
        ) : (
          <>
            <button className="btn-cancel" onClick={resetState} disabled={importing || !file}>
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
  );
}
