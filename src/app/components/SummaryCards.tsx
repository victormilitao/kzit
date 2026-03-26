'use client';

import { formatCurrency } from '../utils';

interface SummaryData {
  totalVendas: number;
  totalDespesas: number;
  totalReceitas: number;
  totalEstornos: number;
  saldoAnterior: number;
  saldo: number;
  pendentesRevisao: number;
}

interface SummaryCardsProps {
  summary: SummaryData;
}

const cards = [
  { key: 'saldoAnterior', label: 'Saldo Anterior', icon: '🏦', cls: 'card-saldo-anterior' },
  { key: 'totalVendas', label: 'Vendas', icon: '🛍️', cls: 'card-vendas' },
  { key: 'totalDespesas', label: 'Despesas', icon: '💸', cls: 'card-despesas' },
  { key: 'totalReceitas', label: 'Receitas', icon: '💵', cls: 'card-receitas' },
  { key: 'totalEstornos', label: 'Estornos', icon: '↩️', cls: 'card-estornos' },
  { key: 'saldo', label: 'Saldo', icon: '📈', cls: 'card-saldo' },
] as const;

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="summary-grid">
      {cards.map((c) => (
        <div key={c.key} className={`summary-card ${c.cls}`}>
          <span className="icon">{c.icon}</span>
          <div className="label">{c.label}</div>
          <div className="value">{formatCurrency(summary[c.key])}</div>
        </div>
      ))}
      <div className="summary-card card-revisao">
        <span className="icon">👁️</span>
        <div className="label">Pendentes Revisão</div>
        <div className="value">{summary.pendentesRevisao}</div>
      </div>
    </div>
  );
}
