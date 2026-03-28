'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { FormField } from './FormField';
import { Icon } from './Icon';
import { CurrencyInput, floatToCents, centsToFloat } from './CurrencyInput';

interface EditEntryData {
  id: string;
  tipo: string;
  descricao: string | null;
  cliente: string | null;
  produto: string | null;
  valor: number | null;
  formaPagamento: string | null;
  parcelas: number | null;
  observacoes: string | null;
  reviewReason: string | null;
  isTransaction?: boolean;
}

interface EditEntryModalProps {
  entry: EditEntryData | null;
  onClose: () => void;
  onSaved: () => void;
}

const FORMAS_PAGAMENTO = [
  { value: '', label: '— Não informado —' },
  { value: 'pix', label: 'PIX' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferência' },
];

export function EditEntryModal({ entry, onClose, onSaved }: EditEntryModalProps) {
  const t = useTranslations('editEntry');
  const tEntries = useTranslations('entries');
  const [tipo, setTipo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cliente, setCliente] = useState('');
  const [produto, setProduto] = useState('');
  const [valorCents, setValorCents] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState('');
  const [parcelas, setParcelas] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (entry) {
      setTipo(entry.tipo);
      setDescricao(entry.descricao || '');
      setCliente(entry.cliente || '');
      setProduto(entry.produto || '');
      setValorCents(floatToCents(entry.valor));
      
      let fp = entry.formaPagamento || '';
      const fpLower = fp.toLowerCase();
      if (fpLower.includes('cartao') || fpLower.includes('cartão')) {
        fp = fpLower.includes('deb') || fpLower.includes('déb') ? 'cartao_debito' : 'cartao_credito';
      } else if (fpLower.includes('pix')) {
        fp = 'pix';
      } else if (fpLower.includes('especie') || fpLower.includes('espécie') || fpLower.includes('dinheiro')) {
        fp = 'dinheiro';
      } else if (fpLower.includes('transf') || fpLower.includes('deposito')) {
        fp = 'transferencia';
      } else if (fpLower.includes('boleto')) {
        fp = 'boleto';
      }
      setFormaPagamento(fp);

      setParcelas(entry.parcelas != null ? String(entry.parcelas) : '');
      setObservacoes(entry.observacoes || '');
      setError('');
    }
  }, [entry]);

  if (!entry) return null;

  const handleSave = async (resolve: boolean) => {
    setSaving(true);
    setError('');

    try {
      const isImediato = formaPagamento === 'pix' || formaPagamento === 'dinheiro' || formaPagamento === 'espécie' || formaPagamento === 'especie';
      const body: Record<string, unknown> = {
        tipo,
        descricao: descricao || null,
        cliente: cliente || null,
        produto: produto || null,
        valor: centsToFloat(valorCents),
        formaPagamento: formaPagamento || null,
        parcelas: parcelas ? parseInt(parcelas, 10) : null,
        observacoes: observacoes || null,
        needsReview: !resolve,
      };

      if (isImediato) {
        body.entryStatus = 'PAGO';
        body.dataPagamento = new Date().toISOString(); 
      }

      const endpoint = entry.isTransaction 
        ? `/api/transactions/${entry.id}` 
        : `/api/entries/${entry.id}`;
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar');
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const currentTipos = [
    { value: 'VENDA', label: tEntries('sales') },
    { value: 'RECEITA', label: tEntries('revenues') },
    { value: 'DESPESA', label: tEntries('expenses') },
    { value: 'COMPRA', label: tEntries('purchases') },
    { value: 'ESTORNO', label: tEntries('chargebacks') },
    { value: 'SALDO_ANTERIOR', label: tEntries('previousBalance') },
    { value: 'DESCONHECIDO', label: tEntries('unknown') }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Icon name="Pencil" size={18} /> {t('title')}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {entry.reviewReason && (
          <div className="modal-review-reason">
            <Icon name="TriangleAlert" size={14} /> {entry.reviewReason}
          </div>
        )}

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-body">
          <div className="form-row">
            <FormField
              as="select"
              label="Tipo"
              selectProps={{ value: tipo, onChange: (e) => setTipo(e.target.value) }}
            >
              {currentTipos.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </FormField>
            <div className="form-group">
              <label>Valor (R$)</label>
              <CurrencyInput
                value={valorCents}
                onChange={setValorCents}
              />
            </div>
          </div>

          <FormField
            label="Descrição"
            inputProps={{
              type: 'text',
              placeholder: 'Descrição do lançamento',
              value: descricao,
              onChange: (e) => setDescricao(e.target.value),
            }}
          />

          <div className="form-row">
            <FormField
              label="Cliente"
              inputProps={{
                type: 'text',
                placeholder: 'Nome do cliente',
                value: cliente,
                onChange: (e) => setCliente(e.target.value),
              }}
            />
            <FormField
              label="Produto"
              inputProps={{
                type: 'text',
                placeholder: 'Produto',
                value: produto,
                onChange: (e) => setProduto(e.target.value),
              }}
            />
          </div>

          <div className="form-row">
            <FormField
              as="select"
              label="Forma de Pagamento"
              style={{ flex: '0 0 calc(50% - 8px)' }}
              selectProps={{
                value: formaPagamento,
                onChange: (e) => {
                  setFormaPagamento(e.target.value);
                  if (e.target.value !== 'cartao_credito') setParcelas('');
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
                label="Parcelas"
                selectProps={{ value: parcelas, onChange: (e) => setParcelas(e.target.value) }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={String(n)}>{n}x</option>
                ))}
              </FormField>
            )}
          </div>

          <FormField
            as="textarea"
            label="Observações"
            textareaProps={{
              placeholder: 'Observações adicionais',
              value: observacoes,
              onChange: (e) => setObservacoes(e.target.value),
              rows: 2,
            }}
          />
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn-pending" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? 'Salvando...' : t('setPending')}
          </button>
          <button className="btn-save" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? 'Salvando...' : t('saveAndResolve')}
          </button>
        </div>
      </div>
    </div>
  );
}
