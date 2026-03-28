import { EntryType, EntryOrigin, EntryStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import { CreateEntryInput, SpreadsheetImportResult } from '../types';

export const spreadsheetService = {
  parseFile(buffer: Buffer, filename: string): string[][] {
    const ext = filename.toLowerCase().split('.').pop();

    if (ext === 'xlsx' || ext === 'xls') {
      return this.parseXLSX(buffer);
    }
    return this.parseCSV(buffer);
  },

  parseXLSX(buffer: Buffer): string[][] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert sheet to array of arrays, all as strings
    const rawData: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    // Skip header (first row) and convert all cells to strings
    const dataRows = rawData.slice(1);
    return dataRows.map((row) => row.map((cell) => String(cell ?? '').trim()));
  },

  parseCSV(buffer: Buffer): string[][] {
    const content = buffer.toString('utf-8').trim();
    const lines = content.split(/\r?\n/);

    // Skip header line
    const dataLines = lines.slice(1);

    return dataLines.map((line) => {
      // Support separators: | , ;
      let separator = '|';
      if (line.includes('|')) separator = '|';
      else if (line.includes(';')) separator = ';';
      else if (line.includes(',')) separator = ',';

      return line.split(separator).map((cell) => cell.trim());
    });
  },

  processRows(
    rows: string[][],
    responsavel: string
  ): { entries: CreateEntryInput[]; result: SpreadsheetImportResult } {
    const entries: CreateEntryInput[] = [];
    const errors: { row: number; reason: string }[] = [];
    let skipped = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // 1-indexed + header offset
      const cells = rows[i];

      // Need at least id and valor (columns 0 and 4)
      if (cells.length < 5) {
        errors.push({ row: rowNumber, reason: 'Linha com colunas insuficientes' });
        continue;
      }

      const rawId = cells[0];
      const rawTipo = (cells[1] || '').toLowerCase();
      const rawDescricao = cells[2] || '';
      const rawCategoria = cells[3] || '';
      const rawValor = cells[4] || '';
      const rawDataVencimento = cells[5] || '';
      const rawDataPagamento = cells[6] || '';
      const rawStatus = (cells[7] || '').toLowerCase();
      const rawFormaPagamento = cells[8] || '';
      const rawObservacoes = cells[9] || '';
      const rawParcelas = cells[10] || '';

      // Skip lines without id or valor
      if (!rawId || !rawValor) {
        skipped++;
        continue;
      }

      const valor = parseFloat(rawValor);
      if (isNaN(valor)) {
        errors.push({ row: rowNumber, reason: `Valor inválido: "${rawValor}"` });
        continue;
      }

      // Validate tipo
      if (rawTipo !== 'receita' && rawTipo !== 'despesa' && rawTipo !== 'compra') {
        errors.push({ row: rowNumber, reason: `Tipo inválido: "${rawTipo}". Esperado: receita, despesa ou compra` });
        continue;
      }

      // Map tipo
      const tipoMap: Record<string, EntryType> = { receita: 'RECEITA', despesa: 'DESPESA', compra: 'COMPRA' };
      const tipo: EntryType = tipoMap[rawTipo];

      // Apply value sign rule
      const finalValor = Math.abs(valor);

      // Determine status based on business rules
      let entryStatus: EntryStatus = 'PENDENTE';
      let dataVencimento: Date | null = null;
      let dataPagamento: Date | null = null;

      if (rawDataVencimento) {
        dataVencimento = new Date(rawDataVencimento + 'T12:00:00Z');
        if (isNaN(dataVencimento.getTime())) {
          errors.push({ row: rowNumber, reason: `Data de vencimento inválida: "${rawDataVencimento}"` });
          continue;
        }
      }

      if (rawDataPagamento) {
        dataPagamento = new Date(rawDataPagamento + 'T12:00:00Z');
        if (isNaN(dataPagamento.getTime())) {
          errors.push({ row: rowNumber, reason: `Data de pagamento inválida: "${rawDataPagamento}"` });
          continue;
        }
      }

      // Business rules for status
      if (dataPagamento) {
        entryStatus = 'PAGO';
      } else if (dataVencimento && dataVencimento < today) {
        entryStatus = 'ATRASADO';
      } else if (rawStatus === 'pago') {
        entryStatus = 'PAGO';
      } else if (rawStatus === 'atrasado') {
        entryStatus = 'ATRASADO';
      } else {
        entryStatus = 'PENDENTE';
      }

      let parcelas = 1;
      if (rawParcelas) {
        const p = parseInt(rawParcelas, 10);
        if (!isNaN(p) && p > 0) {
          parcelas = p;
        }
      }

      entries.push({
        tipo,
        origin: 'PLANILHA' as EntryOrigin,
        descricao: rawDescricao || null,
        categoria: rawCategoria || null,
        valor: finalValor,
        parcelas,
        formaPagamento: rawFormaPagamento || null,
        observacoes: rawObservacoes || null,
        responsavel,
        dataVencimento,
        dataPagamento,
        entryStatus,
      });
    }

    return {
      entries,
      result: {
        totalRows: rows.length,
        imported: entries.length,
        skipped,
        errors,
      },
    };
  },
};
