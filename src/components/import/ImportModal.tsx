import React, { useEffect, useState } from 'react';
import { parseCSVContent, type ParsedTransactionRow } from '../../lib/fileParser';
import { parseOfxContent, type OfxTransaction } from '../../lib/ofxParser';
import { sheetRowsToCsv } from '../../lib/spreadsheet';
import { classifyCardNegative, detectInstallment, markCardDuplicates } from '../../lib/cardImport';
import { getInvoiceForPurchase, formatIsoDateBR } from '../../lib/creditCardRules';
import { readSheet } from 'read-excel-file/browser';
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

type ImportSource =
  | { kind: 'csv'; text: string }
  | { kind: 'ofx'; items: OfxTransaction[] };

/** Converte a origem (CSV/XLSX/OFX) em linhas, respeitando se o destino é conta ou cartão. */
function sourceToRows(source: ImportSource, context: 'account' | 'card'): ParsedTransactionRow[] {
  if (source.kind === 'csv') {
    return parseCSVContent(source.text, { context });
  }

  return source.items.map((item) => {
    const negative = item.amount < 0;
    const amount = Math.abs(item.amount);
    const installment = detectInstallment(item.description);
    const base: ParsedTransactionRow = {
      rawDate: item.date,
      normalizedDate: item.date,
      description: item.description,
      amount,
      type: negative ? 'expense' : 'income',
      selected: true,
      externalId: item.fitId,
      ...(installment
        ? {
            installmentNumber: installment.number,
            totalInstallments: installment.total,
            baseDescription: installment.baseDescription,
          }
        : {}),
    };

    if (context !== 'card') return base;

    // OFX de cartão: compras são negativas; créditos positivos são pagamento da fatura ou estorno
    if (negative) return { ...base, type: 'expense', kind: 'purchase' };
    const kind = classifyCardNegative(item.description);
    return { ...base, type: kind === 'refund' ? 'income' : 'expense', kind, selected: false };
  });
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
  const { commitImportBatch, commitCardImport, fetchCardTransactions } = useImportBatches();

  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [filename, setFilename] = useState('');
  const [rows, setRows] = useState<ParsedTransactionRow[]>([]);
  const [destinationType, setDestinationType] = useState<'account' | 'card'>('account');
  const [destinationId, setDestinationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [source, setSource] = useState<ImportSource | null>(null);
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [dueTouched, setDueTouched] = useState(false);
  const [createFuture, setCreateFuture] = useState(true);

  const selectedCard = destinationType === 'card' ? cards.find((c) => c.id === destinationId) : undefined;

  // Sugere o vencimento da fatura a partir da compra mais recente do arquivo e do cartão escolhido
  useEffect(() => {
    if (!source || !selectedCard || dueTouched) return;
    const dates = sourceToRows(source, 'card')
      .filter((r) => r.kind === 'purchase' || !r.kind)
      .map((r) => r.normalizedDate)
      .sort();
    const latest = dates[dates.length - 1];
    if (!latest) return;
    setInvoiceDueDate(getInvoiceForPurchase(latest, selectedCard.closing_day, selectedCard.due_day).dueDate);
  }, [source, selectedCard, dueTouched]);

  // (Re)monta as linhas quando muda o arquivo, o destino ou o vencimento da fatura
  useEffect(() => {
    if (!source) return;
    let cancelled = false;

    (async () => {
      const context = destinationType === 'card' ? 'card' : 'account';
      const parsed = sourceToRows(source, context).map((row) => ({
        ...row,
        suggestedCategoryId: suggestCategory(row.description, categories),
      }));

      let result: ParsedTransactionRow[];
      if (context === 'card' && destinationId && invoiceDueDate) {
        const existing = await fetchCardTransactions(destinationId);
        result = markCardDuplicates(parsed, existing, invoiceDueDate);
      } else {
        result = detectDuplicates(parsed, transactions);
      }

      if (!cancelled) setRows(result);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, destinationType, destinationId, invoiceDueDate]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('O arquivo deve ter no máximo 5MB.');
      return;
    }

    setFilename(file.name);
    setError(null);
    setLoading(true);

    try {
      const lowerName = file.name.toLowerCase();
      let nextSource: ImportSource;

      if (lowerName.endsWith('.xlsx')) {
        const sheetRows = (await readSheet(file)) as unknown[][];
        nextSource = { kind: 'csv', text: sheetRowsToCsv(sheetRows) };
      } else if (lowerName.endsWith('.ofx')) {
        nextSource = { kind: 'ofx', items: parseOfxContent(await file.text()) };
      } else if (lowerName.endsWith('.xls')) {
        setError('Arquivos .xls antigos não são suportados. Salve a planilha como .xlsx ou .csv.');
        return;
      } else {
        nextSource = { kind: 'csv', text: await file.text() };
      }

      const probe = sourceToRows(nextSource, 'account');
      if (probe.length === 0) {
        setError('Nenhum registro financeiro válido foi encontrado no arquivo.');
        return;
      }

      setDueTouched(false);
      setInvoiceDueDate('');
      setSource(nextSource);
      setStep('preview');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar arquivo';
      setError(msg);
    } finally {
      setLoading(false);
    }
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

    if (destinationType === 'card' && (!destinationId || !invoiceDueDate)) {
      setError('Escolha o cartão e informe o vencimento da fatura para importar.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result =
        destinationType === 'card' && selectedCard
          ? await commitCardImport(filename, rows, {
              creditCardId: selectedCard.id,
              invoiceDueDate,
              dueDay: selectedCard.due_day,
              createFutureInstallments: createFuture,
            })
          : await commitImportBatch(filename, rows, { accountId: destinationId || null });

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
                Clique para selecionar o arquivo do extrato ou da fatura
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                Suporta extratos bancários e faturas de cartão de crédito do Nubank, Itaú, Bradesco, Inter, C6, etc. (Máx: 5MB).
              </p>
              <span className="text-xs font-bold px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 group-hover:border-emerald-300 shadow-xs">
                Selecionar arquivo (.csv, .ofx, .xlsx)
              </span>
              <input
                type="file"
                accept=".csv,.txt,.ofx,.xlsx"
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
                  onChange={(e) => {
                    setDestinationId(e.target.value);
                    setDueTouched(false);
                  }}
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

            {/* Opções da fatura de cartão */}
            {destinationType === 'card' && (
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 space-y-3">
                {!selectedCard ? (
                  <p className="font-semibold">
                    Selecione o cartão acima para definir o vencimento da fatura e identificar parcelas já registradas.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <label className="font-semibold" htmlFor="invoice-due">
                        Vencimento desta fatura
                      </label>
                      <input
                        id="invoice-due"
                        type="date"
                        value={invoiceDueDate}
                        onChange={(e) => {
                          setInvoiceDueDate(e.target.value);
                          setDueTouched(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                      />
                      {invoiceDueDate && (
                        <span className="text-indigo-700">
                          As compras entram na fatura que vence em <strong>{formatIsoDateBR(invoiceDueDate)}</strong>.
                        </span>
                      )}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={createFuture}
                        onChange={(e) => setCreateFuture(e.target.checked)}
                        className="rounded border-indigo-300 text-indigo-600 w-4 h-4"
                      />
                      Criar as parcelas futuras das compras parceladas (compromissos dos próximos meses)
                    </label>
                    <p className="text-indigo-700">
                      Pagamentos da fatura e estornos vêm desmarcados: o pagamento não conta como despesa e o estorno só
                      entra se você marcar.
                    </p>
                  </>
                )}
              </div>
            )}

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
                          {row.kind === 'payment' && (
                            <span className="text-[10px] text-blue-700 block mt-0.5 font-sans font-semibold">
                              Pagamento da fatura (não conta como despesa)
                            </span>
                          )}
                          {row.kind === 'refund' && (
                            <span className="text-[10px] text-emerald-700 block mt-0.5 font-sans font-semibold">
                              Estorno / crédito na fatura
                            </span>
                          )}
                          {row.installmentNumber && row.totalInstallments && (
                            <span className="text-[10px] text-indigo-700 block mt-0.5 font-sans font-semibold">
                              Parcela {row.installmentNumber}/{row.totalInstallments}
                              {destinationType === 'card' && createFuture && row.installmentNumber < row.totalInstallments
                                ? ` • gera mais ${row.totalInstallments - row.installmentNumber} futura(s)`
                                : ''}
                            </span>
                          )}
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
