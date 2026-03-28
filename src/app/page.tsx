'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ToastProvider } from './components/Toast';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { EntriesTable } from './components/EntriesTable';
import { ImportModal } from './components/ImportModal';
import { FormField } from './components/FormField';
import { Icon } from './components/Icon';

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

interface Upload {
  id: string;
  filename: string;
  totalMessages: number;
  processedMessages: number;
  status: string;
  createdAt: string;
}

const defaultSummary: SummaryData = {
  totalVendas: 0,
  totalDespesas: 0,
  totalCompras: 0,
  totalReceitas: 0,
  totalEstornos: 0,
  saldoAnterior: 0,
  saldo: 0,
  pendentesRevisao: 0,
};

export default function DashboardPage() {
  const t = useTranslations('dashboard');

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(2000, i, 1);
      const label = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(d);
      return { value: i + 1, label: label.charAt(0).toUpperCase() + label.slice(1) };
    });
  }, []);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);
  }, []);

  const [uploads, setUploads] = useState<Upload[]>([]);
  const [summaryCaixa, setSummaryCaixa] = useState<SummaryData>(defaultSummary);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showImportModal, setShowImportModal] = useState(false);

  const loadUploads = useCallback(async () => {
    try {
      const r = await fetch('/api/uploads');
      const data = await r.json();
      setUploads(data.data || []);
    } catch {
      setUploads([]);
    }
  }, []);

  const handleMonthChange = (value: string) => {
    if (value === '') {
      // Selecting "Todos" for month — keep year as is
      setSelectedMonth('');
    } else {
      setSelectedMonth(value);
      // Auto-select current year if year is "Todos"
      if (selectedYear === '') {
        setSelectedYear(String(currentDate.getFullYear()));
      }
    }
  };

  const handleYearChange = (value: string) => {
    if (value === '') {
      // Selecting "Todos" for year — resets month to "Todos" as well
      setSelectedYear('');
      setSelectedMonth('');
    } else {
      setSelectedYear(value);
    }
  };

  const loadSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();

      if (selectedMonth !== '' && selectedYear !== '') {
        const monthNum = Number(selectedMonth);
        const yearNum = Number(selectedYear);
        const startDate = new Date(yearNum, monthNum - 1, 1).toISOString();
        const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999).toISOString();
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      } else if (selectedYear !== '') {
        const yearNum = Number(selectedYear);
        const startDate = new Date(yearNum, 0, 1).toISOString();
        const endDate = new Date(yearNum, 11, 31, 23, 59, 59, 999).toISOString();
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }

      const [rCaixa] = await Promise.all([
        fetch(`/api/entries/summary?${params}`)
      ]);
      const dataCaixa = await rCaixa.json();
      setSummaryCaixa(dataCaixa.data || defaultSummary);
    } catch {
      setSummaryCaixa(defaultSummary);
    }
  }, [selectedMonth, selectedYear]);

  const loadAll = useCallback(() => {
    loadUploads();
    loadSummary();
    setRefreshKey((k) => k + 1);
  }, [loadUploads, loadSummary]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <ToastProvider>
      <div className="container">
        <Header />

        <div className="section-header">
          <h2><Icon name="Wallet" size={20} /> {t('financialSummary')}</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ width: '150px' }}>
              <FormField
                as="select"
                label={t('month')}
                selectProps={{
                  value: selectedMonth,
                  onChange: (e) => handleMonthChange(e.target.value),
                }}
              >
                <option value="">{t('allMonths')}</option>
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </FormField>
            </div>
            <div style={{ width: '110px' }}>
              <FormField
                as="select"
                label={t('year')}
                selectProps={{
                  value: selectedYear,
                  onChange: (e) => handleYearChange(e.target.value),
                }}
              >
                <option value="">{t('allYears')}</option>
                {yearOptions.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </FormField>
            </div>
          </div>
        </div>
        <SummaryCards caixa={summaryCaixa} />

        <EntriesTable 
          selectedUploadId={null} 
          refreshKey={refreshKey} 
          onEntryUpdated={loadSummary} 
          onOpenImportModal={() => setShowImportModal(true)}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      </div>

      <ImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={loadAll}
        uploads={uploads}
      />
    </ToastProvider>
  );
}
