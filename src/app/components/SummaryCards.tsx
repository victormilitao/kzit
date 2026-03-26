'use client';

import { formatCurrency } from '../utils';
import { Icon, type IconName } from './Icon';

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

const cards: { key: keyof SummaryData; label: string; icon: IconName; cls: string }[] = [
  { key: 'saldoAnterior', label: 'Saldo Anterior', icon: 'Landmark', cls: 'card-saldo-anterior' },
  { key: 'totalVendas', label: 'Vendas', icon: 'ShoppingBag', cls: 'card-vendas' },
  { key: 'totalDespesas', label: 'Despesas', icon: 'TrendingDown', cls: 'card-despesas' },
  { key: 'totalReceitas', label: 'Receitas', icon: 'TrendingUp', cls: 'card-receitas' },
  { key: 'totalEstornos', label: 'Estornos', icon: 'Undo2', cls: 'card-estornos' },
  { key: 'saldo', label: 'Saldo', icon: 'ChartNoAxesColumn', cls: 'card-saldo' },
];

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="summary-grid">
      {cards.map((c) => (
        <div key={c.key} className={`summary-card ${c.cls}`}>
          <span className="icon"><Icon name={c.icon} size={20} /></span>
          <div className="label">{c.label}</div>
          <div className="value">{formatCurrency(summary[c.key])}</div>
        </div>
      ))}
      <div className="summary-card card-revisao">
        <span className="icon"><Icon name="Eye" size={20} /></span>
        <div className="label">Pendentes Revisão</div>
        <div className="value">{summary.pendentesRevisao}</div>
      </div>
    </div>
  );
}
