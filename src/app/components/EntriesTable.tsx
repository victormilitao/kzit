'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { formatCurrency, formatDate, formatDateOnly } from '../utils';
import { EditEntryModal } from './EditEntryModal';
import { CreateEntryModal } from './CreateEntryModal';
import { DeleteEntryModal } from './DeleteEntryModal';
import { FormField } from './FormField';
import { Icon } from './Icon';

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
  isTransaction?: boolean;
  transactionId?: string;
  entryStatus?: string;
  entries?: any[];
}

interface EntriesTableProps {
  selectedUploadId?: string | null;
  refreshKey?: number;
  onEntryUpdated?: () => void;
  onOpenImportModal?: () => void;
  selectedMonth?: string;
  selectedYear?: string;
}

export function EntriesTable({ 
  selectedUploadId, 
  refreshKey, 
  onEntryUpdated, 
  onOpenImportModal,
  selectedMonth,
  selectedYear,
}: EntriesTableProps) {
  const t = useTranslations('entries');
  const tDashboard = useTranslations('dashboard');
  const tOrigin = useTranslations('origin');
  const tStatus = useTranslations('entryStatus');

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
  const [loading, setLoading] = useState(false);
  const [installmentEntry, setInstallmentEntry] = useState<Entry | null>(null);
  const [togglingEntryId, setTogglingEntryId] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterTipo) params.set('tipo', filterTipo);
      if (filterVendedora) params.set('vendedora', filterVendedora);
      if (filterReview) params.set('needsReview', filterReview);
      if (selectedUploadId) params.set('uploadId', selectedUploadId);
      
      // Build date range from month/year filters
      if (selectedMonth && selectedMonth !== '' && selectedYear && selectedYear !== '') {
        const monthNum = Number(selectedMonth);
        const yearNum = Number(selectedYear);
        const startDate = new Date(yearNum, monthNum - 1, 1).toISOString();
        const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999).toISOString();
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      } else if (selectedYear && selectedYear !== '') {
        const yearNum = Number(selectedYear);
        const startDate = new Date(yearNum, 0, 1).toISOString();
        const endDate = new Date(yearNum, 11, 31, 23, 59, 59, 999).toISOString();
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }
      // If both are '', no date filter — all records
      params.set('page', String(page));
      params.set('limit', '15');

      const endpoint = '/api/transactions';
      const r = await fetch(`${endpoint}?${params}`);
      const data = await r.json();

      const normalizedEntries = (data.data || []).map((item: any) => {
        return {
          ...item,
          id: item.id,
          vendedora: item.responsavel,
          valor: item.valorTotal ? Number(item.valorTotal) : null,
          descricao: item.descricao,
          createdAt: item.dataLancamento,
          isTransaction: true,
          entries: item.entries,
          needsReview: item.entries?.some((e: any) => e.needsReview) || false,
          entryStatus: item.entries?.every((e: any) => e.entryStatus === 'PAGO') ? 'PAGO' : 'PENDENTE',
        };
      });

      setEntries(normalizedEntries);
      if (data.pagination) {
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch {
      setEntries([]);
    }
  }, [filterTipo, filterVendedora, filterReview, selectedUploadId, selectedMonth, selectedYear, page]);

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

  const handleTogglePaid = async (childEntry: any) => {
    const newStatus = childEntry.entryStatus === 'PAGO' ? 'PENDENTE' : 'PAGO';
    setTogglingEntryId(childEntry.id);
    try {
      const body: Record<string, unknown> = { entryStatus: newStatus };
      if (newStatus === 'PAGO') {
        body.dataPagamento = new Date().toISOString().split('T')[0];
      } else {
        body.dataPagamento = null;
      }
      const res = await fetch(`/api/entries/${childEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        // Update local installmentEntry state
        if (installmentEntry) {
          const updatedEntries = installmentEntry.entries?.map((e: any) =>
            e.id === childEntry.id
              ? { ...e, entryStatus: newStatus, dataPagamento: newStatus === 'PAGO' ? new Date().toISOString() : null }
              : e
          );
          setInstallmentEntry({ ...installmentEntry, entries: updatedEntries });
        }
        // Refresh data and recalculate summary
        loadEntries();
        onEntryUpdated?.();
      }
    } catch {
      // silently fail
    } finally {
      setTogglingEntryId(null);
    }
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
        <h2><Icon name="ClipboardList" size={20} /> {tDashboard('entries')}</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-outline" onClick={onOpenImportModal}>
            <Icon name="Download" size={16} /> Importação
          </button>
          <button className="btn-new-entry" onClick={() => setShowCreateModal(true)}>
            <Icon name="Plus" size={16} /> {tDashboard('newEntry')}
          </button>
        </div>
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
          <option value="COMPRA">{t('purchases')}</option>
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
              <th>{t('status')}</th>
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
                <td colSpan={11}>
                  <div className="empty-state">
                    <span className="es-icon">📋</span>
                    <p>{t('noEntries')}</p>
                  </div>
                </td>
              </tr>
            ) : (
              entries.map((e) => {
                const hasChildren = e.entries && e.entries.length > 1;

                return (
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
                    <td>
                      <span className={`badge badge-${e.entryStatus?.toLowerCase() || 'pendente'}`}>
                        {e.entryStatus || 'Pendente'}
                      </span>
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
                          onClick={() => hasChildren ? setInstallmentEntry(e) : undefined}
                          title={hasChildren ? t('viewInstallments') : undefined}
                          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
                        >
                          <Icon name="List" size={14} />
                        </button>
                        <button
                          className="btn-edit"
                          onClick={() => setEditingEntry(e)}
                          title={t('edit')}
                        >
                          <Icon name="Pencil" size={14} />
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => setDeletingEntry(e)}
                          title={t('delete')}
                        >
                          <Icon name="Trash2" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
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

      {installmentEntry && (
        <div className="modal-overlay" onClick={() => setInstallmentEntry(null)}>
          <div className="modal-content modal-installments" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('installmentsTitle')}</h3>
              <button className="modal-close" onClick={() => setInstallmentEntry(null)}>×</button>
            </div>
            <div className="installments-summary">
              <div className="installments-summary-item">
                <span className="installments-summary-label">{t('description')}</span>
                <span className="installments-summary-value">{installmentEntry.descricao || '—'}</span>
              </div>
              <div className="installments-summary-item">
                <span className="installments-summary-label">{t('value')}</span>
                <span className="installments-summary-value">{formatCurrency(installmentEntry.valor)}</span>
              </div>
              <div className="installments-summary-item">
                <span className="installments-summary-label">{t('payment')}</span>
                <span className="installments-summary-value">{installmentEntry.formaPagamento || '—'} ({installmentEntry.parcelas}x)</span>
              </div>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <table className="installments-table">
                <thead>
                  <tr>
                    <th>{t('installmentNumber')}</th>
                    <th>{t('installmentDueDate')}</th>
                    <th>{t('status')}</th>
                    <th>{t('value')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {installmentEntry.entries?.map((child: any) => {
                    const isPago = child.entryStatus === 'PAGO';
                    const isToggling = togglingEntryId === child.id;
                    return (
                      <tr key={child.id} className={isPago ? 'installment-paid' : ''}>
                        <td>
                          <span className="installment-number">
                            {child.numeroParcela}/{installmentEntry.parcelas}
                          </span>
                        </td>
                        <td>{formatDateOnly(child.dataVencimento)}</td>
                        <td>
                          <span className={`badge badge-${child.entryStatus?.toLowerCase() || 'pendente'}`}>
                            {tStatus(child.entryStatus || 'PENDENTE')}
                          </span>
                        </td>
                        <td className="valor-cell">{formatCurrency(child.valor)}</td>
                        <td>
                          <button
                            className={`btn-toggle-paid ${isPago ? 'is-paid' : 'is-pending'}`}
                            onClick={() => handleTogglePaid(child)}
                            disabled={isToggling}
                            title={isPago ? t('markAsPending') : t('markAsPaid')}
                          >
                            <Icon name={isPago ? 'Undo2' : 'Check'} size={14} />
                            <span>{isPago ? t('markAsPending') : t('markAsPaid')}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
