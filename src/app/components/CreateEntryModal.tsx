'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FormField } from './FormField';
import { CurrencyInput, centsToFloat } from './CurrencyInput';

interface CreateEntryModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateEntryModal({ open, onClose, onCreated }: CreateEntryModalProps) {
  const t = useTranslations('createEntry');
  const tEntries = useTranslations('entries');
  const tCommon = useTranslations('common');
  const tPay = useTranslations('paymentMethods');
  const tStatus = useTranslations('entryStatus');

  const [tipo, setTipo] = useState('RECEITA');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [cliente, setCliente] = useState('');
  const [produto, setProduto] = useState('');
  const [valorCents, setValorCents] = useState(0);
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
    setTipo('RECEITA');
    setDescricao('');
    setCategoria('');
    setCliente('');
    setProduto('');
    setValorCents(0);
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
        valor: centsToFloat(valorCents),
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
    { value: 'VENDA', label: tEntries('sales') },
    { value: 'RECEITA', label: tEntries('revenues') },
    { value: 'DESPESA', label: tEntries('expenses') },
    { value: 'COMPRA', label: tEntries('purchases') },
    { value: 'ESTORNO', label: tEntries('chargebacks') },
    { value: 'SALDO_ANTERIOR', label: tEntries('previousBalance') },
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
            <FormField
              as="select"
              label={t('typeLabel')}
              selectProps={{ value: tipo, onChange: (e) => setTipo(e.target.value) }}
            >
              {TIPOS.map((tp) => (
                <option key={tp.value} value={tp.value}>{tp.label}</option>
              ))}
            </FormField>
            <div className="form-group">
              {<label>{t('valueLabel')}</label>}
              <CurrencyInput
                value={valorCents}
                onChange={setValorCents}
              />
            </div>
          </div>

          <FormField
            label={t('responsibleLabel')}
            inputProps={{
              type: 'text',
              placeholder: t('responsiblePlaceholder'),
              value: responsavel,
              onChange: (e) => setResponsavel(e.target.value),
            }}
          />

          <FormField
            label={t('descriptionLabel')}
            inputProps={{
              type: 'text',
              placeholder: t('descriptionPlaceholder'),
              value: descricao,
              onChange: (e) => setDescricao(e.target.value),
            }}
          />

          <div className="form-row">
            <FormField
              label={t('categoryLabel')}
              inputProps={{
                type: 'text',
                placeholder: t('categoryPlaceholder'),
                value: categoria,
                onChange: (e) => setCategoria(e.target.value),
              }}
            />
          </div>

          <div className="form-row">
            <FormField
              label={t('clientLabel')}
              inputProps={{
                type: 'text',
                placeholder: t('clientPlaceholder'),
                value: cliente,
                onChange: (e) => setCliente(e.target.value),
              }}
            />
            <FormField
              label={t('productLabel')}
              inputProps={{
                type: 'text',
                placeholder: t('productPlaceholder'),
                value: produto,
                onChange: (e) => setProduto(e.target.value),
              }}
            />
          </div>

          <div className="form-row">
            <FormField
              as="select"
              label={t('paymentMethodLabel')}
              style={{ flex: '0 0 calc(50% - 8px)' }}
              selectProps={{
                value: formaPagamento,
                onChange: (e) => {
                  const val = e.target.value;
                  setFormaPagamento(val);
                  if (val !== 'cartao_credito') setParcelas('');
                  if (val === 'pix' || val === 'dinheiro') {
                    setEntryStatus('PAGO');
                    setDataPagamento(new Date().toISOString().split('T')[0]);
                  }
                },
              }}
            >
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </FormField>
            {formaPagamento === 'cartao_credito' && (
              <FormField
                as="select"
                label={t('installmentsLabel')}
                selectProps={{ value: parcelas, onChange: (e) => setParcelas(e.target.value) }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={String(n)}>{n}x</option>
                ))}
              </FormField>
            )}
          </div>

          <div className="form-row">
            <FormField
              label={t('dueDateLabel')}
              inputProps={{
                type: 'date',
                value: dataVencimento,
                onChange: (e) => setDataVencimento(e.target.value),
              }}
            />
            <FormField
              label={t('paymentDateLabel')}
              inputProps={{
                type: 'date',
                value: dataPagamento,
                onChange: (e) => setDataPagamento(e.target.value),
              }}
            />
          </div>

          <FormField
            as="select"
            label={t('statusLabel')}
            selectProps={{ value: entryStatus, onChange: (e) => setEntryStatus(e.target.value) }}
          >
            <option value="PENDENTE">{tStatus('PENDENTE')}</option>
            <option value="PAGO">{tStatus('PAGO')}</option>
            <option value="ATRASADO">{tStatus('ATRASADO')}</option>
          </FormField>

          <FormField
            as="textarea"
            label={t('observationsLabel')}
            textareaProps={{
              placeholder: t('observationsPlaceholder'),
              value: observacoes,
              onChange: (e) => setObservacoes(e.target.value),
              rows: 2,
            }}
          />
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
