import React, { useState } from 'react';
import { parseCSVContent, type ParsedTransactionRow } from '../../lib/fileParser';
import { detectDuplicates, suggestCategory } from '../../lib/importMatching';
import { useCategories } from '../../hooks/useCategories';
import { useAccounts } from '../../hooks/useAccounts';
import { useCreditCards } from '../../hooks/useCreditCards';
import { useTransactions } from '../../hooks/useTransactions';
import { useImportBatches } from '../../hooks/useImportBatches';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Building2,
  CreditCard,
  Download,
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  categories?: any[];
  accounts?: any[];
  cards?: any[];
  onSuccess?: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  onSuccess,
}) => {
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const { cards } = useCreditCards();
  const { transactions, refetch: refetchTransactions } = useTransactions();
  const { commitImportBatch } = useImportBatches();

  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [filename, setFilename] = useState('');
  const [rows, setRows] = useState<ParsedTransactionRow[]>([]);
  const [destinationType, setDestinationType] = useState<'account' | 'card'>('account');
  const [destinationId, setDestinationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('O arquivo deve ter no máximo 5MB.');
      return;
    }

    setFilename(file.name);
    setError(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSVContent(text);

        if (parsed.length === 0) {
          setError('Nenhum registro financeiro válido foi encontrado no arquivo.');
          setLoading(false);
          return;
        }

        // Sugere categorias com base no catálogo do usuário
        const withCategories = parsed.map((row) => ({
          ...row,
          suggestedCategoryId: suggestCategory(row.description, categories),
        }));

        // Detecta duplicidades contra transações já registradas
        const withDuplicates = detectDuplicates(withCategories, transactions);

        setRows(withDuplicates);
        setStep('preview');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao processar arquivo';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  const handleToggleRow = (index: number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: select })));
  };

  const handleCategoryChange = (index: number, categoryId: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, suggestedCategoryId: categoryId || null } : r))
    );
  };

  const handleToggleType = (index: number) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, type: r.type === 'income' ? 'expense' : 'income' } : r
      )
    );
  };

  const handleConfirmImport = async () => {
    const selectedRows = rows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      alert('Selecione pelo menos uma linha para importar.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const destination = destinationType === 'account'
        ? { accountId: destinationId || null }
        : { creditCardId: destinationId || null };

      const result = await commitImportBatch(filename, rows, destination);

      if (result.error) {
        setError(result.error.message);
      } else {
        setImportedCount(result.count);
        setStep('success');
        await refetchTransactions();
        if (onImportComplete) onImportComplete();
        if (onSuccess) onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = rows.filter((r) => r.selected).length;
  const duplicateCount = rows.filter((r) => r.isDuplicate).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl p-5 sm:p-6 bg-white border border-slate-100 rounded-3xl shadow-2xl relative max-h-[92vh] flex flex-col text-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 text-slate-400 hover:text-slate-700 p-1 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              Importação Inteligente de Extratos
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Importe faturas e extratos CSV com pré-visualização, deduplicação e auto-categorização.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="space-y-6 my-auto py-8">
            <label className="flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 transition-all cursor-pointer text-center group">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 text-slate-400 group-hover:text-emerald-600 flex items-center justify-center mb-4 transition-colors shadow-xs">
                <Upload className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Clique para selecionar ou arraste seu arquivo CSV
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                Suporta extratos bancários e faturas de cartão de crédito do Nubank, Itaú, Bradesco, Inter, C6, etc. (Máx: 5MB).
              </p>
              <span className="text-xs font-bold px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 group-hover:border-emerald-300 shadow-xs">
                Selecionar Arquivo .CSV
              </span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                <span className="font-bold text-slate-800 block">Não tem um arquivo pronto?</span>
                Baixe a planilha modelo (colunas <strong>Data</strong>; <strong>Descrição</strong>; <strong>Valor</strong>).
                Use valor negativo para despesas; entradas como salário ou "Pix recebido" são reconhecidas como receita.
              </div>
              <a
                href="/modelo-importacao-extrato.csv"
                download="modelo-importacao-extrato.csv"
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 shadow-xs whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                Baixar modelo (.csv)
              </a>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 px-2">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Pré-visualização garantida antes de salvar
              </span>
              <span className="font-medium">Proteção anti-dupla contagem</span>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW */}
        {step === 'preview' && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-4">
            {/* Top Bar with Destination Account/Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">Arquivo Selecionado</span>
                <span className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  {filename}
                </span>
              </div>

              {/* Destination Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="flex rounded-xl bg-white p-1 border border-slate-200 text-xs w-full sm:w-auto shadow-xs">
                  <button
                    onClick={() => {
                      setDestinationType('account');
                      setDestinationId('');
                    }}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      destinationType === 'account'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 inline mr-1" /> Conta Bancária
                  </button>
                  <button
                    onClick={() => {
                      setDestinationType('card');
                      setDestinationId('');
                    }}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      destinationType === 'card'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5 inline mr-1" /> Cartão de Crédito
                  </button>
                </div>

                <select
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="">Selecione o destino (opcional)</option>
                  {destinationType === 'account'
                    ? accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))
                    : cards.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                </select>
              </div>
            </div>

            {/* Quick Actions & Duplicate Alert */}
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSelectAll(true)}
                  className="text-slate-600 hover:text-emerald-700 underline font-semibold cursor-pointer"
                >
                  Marcar Todas
                </button>
                <span className="text-slate-300">•</span>
                <button
                  onClick={() => handleSelectAll(false)}
                  className="text-slate-600 hover:text-emerald-700 underline font-semibold cursor-pointer"
                >
                  Desmarcar Todas
                </button>
                {duplicateCount > 0 && (
                  <Badge variant="amber" className="ml-2">
                    <AlertTriangle className="w-3 h-3 mr-1" /> {duplicateCount} possíveis duplicidades detectadas
                  </Badge>
                )}
              </div>

              <span className="text-slate-500 font-mono font-bold">
                {selectedCount} de {rows.length} linhas selecionadas
              </span>
            </div>

            {/* Interactive Preview Table with Horizontal Scroll */}
            <div className="flex-1 overflow-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
              <table className="w-full min-w-[580px] text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3 w-10 text-center">Sel.</th>
                    <th className="p-3">Data</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3 text-center">Tipo</th>
                    <th className="p-3 text-right">Valor (R$)</th>
                    <th className="p-3">Categoria Sugerida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50 transition-colors ${
                        row.isDuplicate ? 'bg-amber-50/50' : ''
                      } ${!row.selected ? 'opacity-40' : ''}`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => handleToggleRow(idx)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </td>

                      <td className="p-3 whitespace-nowrap text-slate-600 font-mono font-medium">
                        {formatDate(row.normalizedDate)}
                      </td>

                      <td className="p-3 text-slate-800 font-medium">
                        <div>
                          <span>{row.description}</span>
                          {row.isDuplicate && (
                            <span className="text-[10px] text-amber-700 block mt-0.5 font-sans font-semibold">
                              ⚠️ {row.duplicateReason}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleType(idx)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                            row.type === 'income'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          }`}
                          title="Clique para alternar entre Receita e Despesa"
                        >
                          {row.type === 'income' ? 'Receita' : 'Despesa'}
                        </button>
                      </td>

                      <td className={`p-3 text-right font-mono font-bold whitespace-nowrap ${
                        row.type === 'income' ? 'text-emerald-600' : 'text-slate-800'
                      }`}>
                        {row.type === 'income' ? '+' : '-'} {formatCurrency(row.amount)}
                      </td>

                      <td className="p-3">
                        <select
                          value={row.suggestedCategoryId || ''}
                          onChange={(e) => handleCategoryChange(idx, e.target.value)}
                          className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:outline-none focus:border-emerald-500 w-full max-w-[180px]"
                        >
                          <option value="">Sem categoria</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setStep('upload')}
                className="text-xs"
              >
                Escolher Outro Arquivo
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmImport}
                isLoading={loading}
                disabled={selectedCount === 0}
                className="text-xs font-bold"
              >
                Confirmar e Importar {selectedCount} Lançamentos <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
          <div className="text-center py-12 space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Importação Concluída com Sucesso!</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Foram adicionados <strong>{importedCount} lançamentos</strong> à sua conta. O lote foi registrado e vinculado para fins de auditoria.
            </p>

            <div className="pt-4 flex justify-center gap-3">
              <Button variant="primary" size="md" onClick={onClose} className="font-bold">
                Ver Meus Lançamentos
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
