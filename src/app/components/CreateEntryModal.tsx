'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface CreateEntryModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateEntryModal({ open, onClose, onCreated }: CreateEntryModalProps) {
  const t = useTranslations('createEntry');
  const tCommon = useTranslations('common');
  const tPay = useTranslations('paymentMethods');
  const tStatus = useTranslations('entryStatus');

  const [tipo, setTipo] = useState('VENDA');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [cliente, setCliente] = useState('');
  const [produto, setProduto] = useState('');
  const [valor, setValor] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [parcelas, setParcelas] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [dataPagamento, setDataPagamento] = useState('');
  const [entryStatus, setEntryStatus] = useState('PENDENTE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const resetForm = () => {
    setTipo('VENDA');
    setDescricao('');
    setCategoria('');
    setCliente('');
    setProduto('');
    setValor('');
    setFormaPagamento('');
    setParcelas('');
    setResponsavel('');
    setObservacoes('');
    setDataVencimento('');
    setDataPagamento('');
    setEntryStatus('PENDENTE');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (!responsavel.trim()) {
      setError(t('responsibleLabel') + ' é obrigatório');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const body: Record<string, unknown> = {
        tipo,
        descricao: descricao || null,
        categoria: categoria || null,
        cliente: cliente || null,
        produto: produto || null,
        valor: valor ? parseFloat(valor) : null,
        formaPagamento: formaPagamento || null,
        parcelas: parcelas ? parseInt(parcelas, 10) : null,
        responsavel: responsavel.trim(),
        observacoes: observacoes || null,
        dataVencimento: dataVencimento || null,
        dataPagamento: dataPagamento || null,
        entryStatus,
      };

      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('errorSaving'));
      }

      onCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  const TIPOS = [
    { value: 'VENDA', label: 'Venda' },
    { value: 'DESPESA', label: 'Despesa' },
    { value: 'RECEITA', label: 'Receita' },
    { value: 'ESTORNO', label: 'Estorno' },
    { value: 'SALDO_ANTERIOR', label: 'Saldo Anterior' },
  ];

  const FORMAS_PAGAMENTO = [
    { value: '', label: tPay('none') },
    { value: 'pix', label: tPay('pix') },
    { value: 'dinheiro', label: tPay('dinheiro') },
    { value: 'cartao_credito', label: tPay('cartao_credito') },
    { value: 'cartao_debito', label: tPay('cartao_debito') },
    { value: 'boleto', label: tPay('boleto') },
    { value: 'transferencia', label: tPay('transferencia') },
  ];

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t('title')}</h3>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>{t('typeLabel')}</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS.map((tp) => (
                  <option key={tp.value} value={tp.value}>{tp.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('valueLabel')}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
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

          <div className="form-group">
            <label>{t('descriptionLabel')}</label>
            <input
              type="text"
              placeholder={t('descriptionPlaceholder')}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('categoryLabel')}</label>
              <input
                type="text"
                placeholder={t('categoryPlaceholder')}
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('clientLabel')}</label>
              <input
                type="text"
                placeholder={t('clientPlaceholder')}
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>{t('productLabel')}</label>
              <input
                type="text"
                placeholder={t('productPlaceholder')}
                value={produto}
                onChange={(e) => setProduto(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: '0 0 calc(50% - 8px)' }}>
              <label>{t('paymentMethodLabel')}</label>
              <select value={formaPagamento} onChange={(e) => {
                setFormaPagamento(e.target.value);
                if (e.target.value !== 'cartao_credito') setParcelas('');
              }}>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            {formaPagamento === 'cartao_credito' && (
              <div className="form-group">
                <label>{t('installmentsLabel')}</label>
                <select value={parcelas} onChange={(e) => setParcelas(e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={String(n)}>{n}x</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('dueDateLabel')}</label>
              <input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>{t('paymentDateLabel')}</label>
              <input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t('statusLabel')}</label>
            <select value={entryStatus} onChange={(e) => setEntryStatus(e.target.value)}>
              <option value="PENDENTE">{tStatus('PENDENTE')}</option>
              <option value="PAGO">{tStatus('PAGO')}</option>
              <option value="ATRASADO">{tStatus('ATRASADO')}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('observationsLabel')}</label>
            <textarea
              placeholder={t('observationsPlaceholder')}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={handleClose} disabled={saving}>
            {tCommon('cancel')}
          </button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? tCommon('saving') : t('saveEntry')}
          </button>
        </div>
      </div>
    </div>
  );
}
