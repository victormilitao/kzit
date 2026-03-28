'use client';

import { formatCurrency } from '../utils';
import { Icon } from './Icon';

interface SummaryData {
  totalVendas: number;
  totalDespesas: number;
  totalCompras: number;
  totalReceitas: number;
  totalEstornos: number;
  saldoAnterior: number;
  saldo: number;
  pendentesRevisao: number;
}

interface SummaryCardsProps {
  caixa: SummaryData;
}

export function SummaryCards({ caixa }: SummaryCardsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="summary-section">
        <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Resumo Financeiro</h3>
        <div className="summary-grid">
          <div className="summary-card card-receitas">
            <span className="icon"><Icon name="TrendingUp" size={20} /></span>
            <div className="label">Entradas Recebidas</div>
            <div className="value">{formatCurrency(caixa.saldoAnterior + caixa.totalVendas + caixa.totalReceitas)}</div>
          </div>
          <div className="summary-card card-despesas">
            <span className="icon"><Icon name="TrendingDown" size={20} /></span>
            <div className="label">Saídas (Despesas/Compras/Estornos)</div>
            <div className="value">{formatCurrency(caixa.totalDespesas + caixa.totalCompras)}</div>
          </div>
          <div className="summary-card card-saldo">
            <span className="icon"><Icon name="Wallet" size={20} /></span>
            <div className="label">Saldo em Conta</div>
            <div className="value">{formatCurrency(caixa.saldoAnterior + caixa.totalVendas + caixa.totalReceitas - caixa.totalDespesas - caixa.totalCompras)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
