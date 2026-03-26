'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { formatCurrency, formatDate } from '../utils';
import { EditEntryModal } from './EditEntryModal';
import { CreateEntryModal } from './CreateEntryModal';
import { DeleteEntryModal } from './DeleteEntryModal';
import { FormField } from './FormField';

interface EntryMessage {
  text: string;
  senderName: string;
  timestamp: string;
}

interface Entry {
  id: string;
  tipo: string;
  origin?: string;
  descricao: string | null;
  cliente: string | null;
  produto: string | null;
  vendedora: string;
  valor: number | null;
  formaPagamento: string | null;
  parcelas: number | null;
  confianca: number;
  needsReview: boolean;
  reviewReason: string | null;
  observacoes: string | null;
  createdAt: string;
  message?: EntryMessage | null;
}

interface EntriesTableProps {
  selectedUploadId: string | null;
  refreshKey: number;
  onEntryUpdated?: () => void;
}

export function EntriesTable({ selectedUploadId, refreshKey, onEntryUpdated }: EntriesTableProps) {
  const t = useTranslations('entries');
  const tDashboard = useTranslations('dashboard');
  const tOrigin = useTranslations('origin');

  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterTipo, setFilterTipo] = useState('');
  const [filterVendedora, setFilterVendedora] = useState('');
  const [filterReview, setFilterReview] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<Entry | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterTipo) params.set('tipo', filterTipo);
      if (filterVendedora) params.set('vendedora', filterVendedora);
      if (filterReview) params.set('needsReview', filterReview);
      if (selectedUploadId) params.set('uploadId', selectedUploadId);
      params.set('page', String(page));
      params.set('limit', '15');

      const r = await fetch(`/api/entries?${params}`);
      const data = await r.json();

      setEntries(data.data || []);
      if (data.pagination) {
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch {
      setEntries([]);
    }
  }, [filterTipo, filterVendedora, filterReview, selectedUploadId, page]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [filterTipo, filterReview, selectedUploadId]);

  const handleVendedoraChange = (value: string) => {
    setFilterVendedora(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    setDebounceTimer(setTimeout(() => {
      setPage(1);
    }, 400));
  };

  const handleEntrySaved = () => {
    loadEntries();
    onEntryUpdated?.();
  };

  const badgeClass = (tipo: string) => `badge badge-${tipo.toLowerCase()}`;

  const originBadge = (origin?: string) => {
    if (!origin) return tOrigin('WHATSAPP');
    try {
      return tOrigin(origin as 'WHATSAPP' | 'PLANILHA' | 'FORM');
    } catch {
      return origin;
    }
  };

  return (
    <>
      <div className="section-header">
        <h2>{tDashboard('entries')}</h2>
        <button className="btn-new-entry" onClick={() => setShowCreateModal(true)}>
          {tDashboard('newEntry')}
        </button>
      </div>

      <div className="filters">
        <FormField
          as="select"
          label={t('type')}
          selectProps={{ value: filterTipo, onChange: (e) => setFilterTipo(e.target.value) }}
        >
          <option value="">{t('allTypes')}</option>
          <option value="VENDA">{t('sales')}</option>
          <option value="DESPESA">{t('expenses')}</option>
          <option value="RECEITA">{t('revenues')}</option>
          <option value="ESTORNO">{t('chargebacks')}</option>
          <option value="SALDO_ANTERIOR">{t('previousBalance')}</option>
          <option value="DESCONHECIDO">{t('unknown')}</option>
        </FormField>
        <FormField
          label={t('responsible')}
          inputProps={{
            type: 'text',
            placeholder: t('filterByResponsible'),
            value: filterVendedora,
            onChange: (e) => handleVendedoraChange(e.target.value),
          }}
        />
        <FormField
          as="select"
          label="Revisão"
          selectProps={{ value: filterReview, onChange: (e) => setFilterReview(e.target.value) }}
        >
          <option value="">{t('reviewAll')}</option>
          <option value="true">{t('pendingReview')}</option>
          <option value="false">{t('reviewed')}</option>
        </FormField>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>{t('date')}</th>
              <th>{t('type')}</th>
              <th>{t('description')}</th>
              <th>{t('client')}</th>
              <th>{t('product')}</th>
              <th>{t('responsible')}</th>
              <th>{t('value')}</th>
              <th>{t('payment')}</th>
              <th>{t('origin')}</th>
              <th style={{ width: 70 }}></th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <div className="empty-state">
                    <span className="es-icon">📋</span>
                    <p>{t('noEntries')}</p>
                  </div>
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className={e.needsReview ? 'row-needs-review' : ''}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                    {e.message ? formatDate(e.message.timestamp) : formatDate(e.createdAt)}
                  </td>
                  <td>
                    <span className={badgeClass(e.tipo)}>{e.tipo}</span>
                    {e.needsReview && (
                      <span
                        className="badge badge-review"
                        title={e.reviewReason || ''}
                      >
                        {t('review')}
                      </span>
                    )}
                  </td>
                  <td className="desc-cell">
                    <strong>{e.descricao || '—'}</strong>
                    {e.message && (
                      <div className="desc-message">
                        &quot;{e.message.text.substring(0, 100)}
                        {e.message.text.length > 100 ? '...' : ''}&quot;
                      </div>
                    )}
                  </td>
                  <td>{e.cliente || '—'}</td>
                  <td>{e.produto || '—'}</td>
                  <td>{e.vendedora}</td>
                  <td className="valor-cell">{formatCurrency(e.valor)}</td>
                  <td>
                    {e.formaPagamento || '—'}
                    {e.parcelas ? ` (${e.parcelas}x)` : ''}
                  </td>
                  <td>
                    <span className={`badge badge-origin-${(e.origin || 'WHATSAPP').toLowerCase()}`}>
                      {originBadge(e.origin)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn-edit"
                        onClick={() => setEditingEntry(e)}
                        title={t('edit')}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => setDeletingEntry(e)}
                        title={t('delete')}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {entries.length > 0 && (
          <div className="pagination">
            <span>{total} lançamento{total !== 1 ? 's' : ''}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {t('previous')}
              </button>
              <span>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                {t('next')}
              </button>
            </div>
          </div>
        )}
      </div>

      <EditEntryModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSaved={handleEntrySaved}
      />

      <CreateEntryModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleEntrySaved}
      />

      <DeleteEntryModal
        entry={deletingEntry}
        onClose={() => setDeletingEntry(null)}
        onDeleted={handleEntrySaved}
      />
    </>
  );
}
