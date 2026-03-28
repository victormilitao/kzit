'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '../utils';

interface DeleteEntryData {
  id: string;
  tipo: string;
  descricao: string | null;
  valor: number | null;
  isTransaction?: boolean;
}

interface DeleteEntryModalProps {
  entry: DeleteEntryData | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteEntryModal({ entry, onClose, onDeleted }: DeleteEntryModalProps) {
  const t = useTranslations('deleteEntry');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!entry) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError('');

    try {
      const endpoint = entry.isTransaction ? `/api/transactions/${entry.id}` : `/api/entries/${entry.id}`;
      const res = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('errorDeleting'));
      }

      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorDeleting'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t('title')}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-body">
          <p>{t('confirmMessage')}</p>

          <div className="modal-confirm-details">
            <span className={`badge badge-${entry.tipo.toLowerCase()}`}>{entry.tipo}</span>
            {entry.descricao && <span>{entry.descricao}</span>}
            {entry.valor != null && <strong>{formatCurrency(entry.valor)}</strong>}
          </div>

          <p className="modal-warning">{t('warning')}</p>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={deleting}>
            {t('cancel')}
          </button>
          <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? t('deleting') : t('deleteButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
