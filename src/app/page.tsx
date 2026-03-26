'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ToastProvider } from './components/Toast';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { EntriesTable } from './components/EntriesTable';
import { ImportModal } from './components/ImportModal';
import { Icon } from './components/Icon';

interface SummaryData {
  totalVendas: number;
  totalDespesas: number;
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
  totalReceitas: 0,
  totalEstornos: 0,
  saldoAnterior: 0,
  saldo: 0,
  pendentesRevisao: 0,
};

export default function DashboardPage() {
  const t = useTranslations('dashboard');

  const [uploads, setUploads] = useState<Upload[]>([]);
  const [summary, setSummary] = useState<SummaryData>(defaultSummary);
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

  const loadSummary = useCallback(async () => {
    try {
      const r = await fetch('/api/entries/summary');
      const data = await r.json();
      setSummary(data.data || defaultSummary);
    } catch {
      setSummary(defaultSummary);
    }
  }, []);

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
        </div>
        <SummaryCards summary={summary} />

        <EntriesTable 
          selectedUploadId={null} 
          refreshKey={refreshKey} 
          onEntryUpdated={loadSummary} 
          onOpenImportModal={() => setShowImportModal(true)} 
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
