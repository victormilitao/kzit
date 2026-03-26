'use client';

import { useState, useEffect } from 'react';

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
}

interface EditEntryModalProps {
  entry: EditEntryData | null;
  onClose: () => void;
  onSaved: () => void;
}

const TIPOS = [
  { value: 'VENDA', label: 'Venda' },
  { value: 'DESPESA', label: 'Despesa' },
  { value: 'RECEITA', label: 'Receita' },
  { value: 'ESTORNO', label: 'Estorno' },
  { value: 'SALDO_ANTERIOR', label: 'Saldo Anterior' },
  { value: 'DESCONHECIDO', label: 'Desconhecido' },
];

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
  const [tipo, setTipo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cliente, setCliente] = useState('');
  const [produto, setProduto] = useState('');
  const [valor, setValor] = useState('');
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
      setValor(entry.valor != null ? String(entry.valor) : '');
      setFormaPagamento(entry.formaPagamento || '');
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
      const body: Record<string, unknown> = {
        tipo,
        descricao: descricao || null,
        cliente: cliente || null,
        produto: produto || null,
        valor: valor ? parseFloat(valor) : null,
        formaPagamento: formaPagamento || null,
        parcelas: parcelas ? parseInt(parcelas, 10) : null,
        observacoes: observacoes || null,
        needsReview: !resolve,
      };

      const res = await fetch(`/api/entries/${entry.id}`, {
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✏️ Editar Lançamento</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {entry.reviewReason && (
          <div className="modal-review-reason">
            ⚠️ {entry.reviewReason}
          </div>
        )}

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Valor (R$)</label>
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
            <label>Descrição</label>
            <input
              type="text"
              placeholder="Descrição do lançamento"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cliente</label>
              <input
                type="text"
                placeholder="Nome do cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Produto</label>
              <input
                type="text"
                placeholder="Produto"
                value={produto}
                onChange={(e) => setProduto(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: '0 0 calc(50% - 8px)' }}>
              <label>Forma de Pagamento</label>
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
                <label>Parcelas</label>
                <select value={parcelas} onChange={(e) => setParcelas(e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={String(n)}>{n}x</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Observações</label>
            <textarea
              placeholder="Observações adicionais"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn-pending" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? 'Salvando...' : '⏳ Definir como pendente'}
          </button>
          <button className="btn-save" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? 'Salvando...' : '✓ Salvar e Resolver'}
          </button>
        </div>
      </div>
    </div>
  );
}
