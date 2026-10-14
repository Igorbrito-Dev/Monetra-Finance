import React, { useState } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { useAccounts } from '../../hooks/useAccounts';
import { useCreditCards } from '../../hooks/useCreditCards';
import { formatCurrency, formatDate } from '../../lib/utils';
import { getBillStatusStyle } from '../../lib/billStatusStyles';
import { useCategoryRules } from '../../hooks/useCategoryRules';
import { Button } from '../ui/Button';
import { TransactionModal } from './TransactionModal';
import { ImportModal } from '../import/ImportModal';
import {
  Plus,
  Upload,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  Trash2,
  ChevronRight as ChevronIcon,
  Filter,
  Receipt,
  Pencil,
  Copy,
  CheckSquare,
} from 'lucide-react';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const TransactionList: React.FC = () => {
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const { cards } = useCreditCards();

  const {
    transactions,
    loading,
    filter,
    setFilter,
    createTransaction,
    updateTransaction,
    bulkUpdate,
    bulkDelete,
    togglePaidStatus,
    deleteTransaction,
  } = useTransactions();
  const { learn } = useCategoryRules();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<typeof transactions[0] | null>(null);
  const [editingTx, setEditingTx] = useState<typeof transactions[0] | null>(null);
  const [repeatTx, setRepeatTx] = useState<typeof transactions[0] | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setBulkCategory('');
  };

  const handleBulkCategory = async () => {
    if (!bulkCategory || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await bulkUpdate(ids, { category_id: bulkCategory });
    if (error) {
      alert(`Não foi possível alterar: ${error.message}`);
      return;
    }
    // Aprende a categoria escolhida para as próximas descrições parecidas
    const seen = new Set<string>();
    for (const tx of transactions) {
      if (!ids.includes(tx.id) || seen.has(tx.description)) continue;
      seen.add(tx.description);
      await learn(tx.description, bulkCategory);
    }
    exitSelectMode();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Excluir ${selectedIds.size} lançamento(s)? Esta ação não pode ser desfeita.`)) return;
    const { error } = await bulkDelete(Array.from(selectedIds));
    if (error) {
      alert(`Não foi possível excluir: ${error.message}`);
      return;
    }
    exitSelectMode();
  };

  const handlePrevMonth = () => {
    let newMonth = filter.month - 1;
    let newYear = filter.year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setFilter((prev) => ({ ...prev, month: newMonth, year: newYear }));
  };

  const handleNextMonth = () => {
    let newMonth = filter.month + 1;
    let newYear = filter.year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setFilter((prev) => ({ ...prev, month: newMonth, year: newYear }));
  };

  const filteredTransactions = transactions.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const descMatches = t.description.toLowerCase().includes(q);
    const cat = categories.find((c) => c.id === t.category_id);
    const catMatches = cat ? cat.name.toLowerCase().includes(q) : false;
    return descMatches || catMatches;
  });

  const getCategory = (categoryId: string | null) => {
    return categories.find((c) => c.id === categoryId);
  };

  const getAccountOrCardName = (t: typeof transactions[0]) => {
    if (t.credit_card_id) {
      const card = cards.find((c) => c.id === t.credit_card_id);
      return card ? card.name : 'Cartão de Crédito';
    }
    if (t.account_id) {
      const acc = accounts.find((a) => a.id === t.account_id);
      return acc ? acc.name : 'Conta Bancária';
    }
    return t.payment_method ? t.payment_method.toUpperCase() : 'Lançamento';
  };

  // Group transactions by Date string (e.g. YYYY-MM-DD)
  const groupedTransactions = filteredTransactions.reduce((acc, tx) => {
    const d = tx.transaction_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(tx);
    return acc;
  }, {} as Record<string, typeof transactions>);

  // Sorted dates descending
  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  // Friendly date label generator
  const getFriendlyDateHeader = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const [, month, day] = dateStr.split('-');
    const monthName = MONTH_NAMES[parseInt(month, 10) - 1]?.toLowerCase() || '';

    if (dateStr === today) {
      return `Hoje, ${parseInt(day, 10)} de ${monthName}`;
    }
    if (dateStr === yesterday) {
      return `Ontem, ${parseInt(day, 10)} de ${monthName}`;
    }
    return `${parseInt(day, 10)} de ${monthName}`;
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-4xl mx-auto animate-in fade-in duration-200">
      
      {/* 1. HEADER & TOP CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Extrato
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Todas as movimentações e lançamentos.
          </p>
        </div>

        {/* Month Selector & Actions */}
        <div className="flex items-center gap-2">
          {/* Month Navigator */}
          <div className="flex items-center bg-white border border-slate-200/80 rounded-xl px-1.5 py-1 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] sm:text-xs font-semibold text-slate-700 select-none">
              {MONTH_NAMES[filter.month - 1]} {filter.year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Próximo Mês"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            variant={selectMode ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            className="text-xs font-semibold"
            title="Selecionar vários lançamentos"
          >
            <CheckSquare className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">{selectMode ? 'Cancelar' : 'Selecionar'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="text-xs font-semibold bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            title="Importar extrato CSV ou OFX"
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Importar</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-bold shadow-xs shadow-emerald-600/20"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" />
            <span>Novo</span>
          </Button>
        </div>
      </div>

      {/* 2. SEARCH BAR & FILTER PILLS (Matches Screen 2 of Reference) */}
      <div className="space-y-3">
        {/* Search input with filter icon */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por descrição, categoria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 shadow-xs transition-all"
          />
          <div className="absolute right-3.5 top-3 text-slate-400 pointer-events-none">
            <Filter className="w-4 h-4" />
          </div>
        </div>

        {/* Filter Pills: Todos | Receitas | Despesas */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter((prev) => ({ ...prev, type: 'all' }))}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filter.type === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter((prev) => ({ ...prev, type: 'income' }))}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filter.type === 'income'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Receitas
          </button>
          <button
            onClick={() => setFilter((prev) => ({ ...prev, type: 'expense' }))}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filter.type === 'expense'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Despesas
          </button>
        </div>
      </div>

      {/* 3. GROUPED TRANSACTIONS LIST */}
      {loading ? (
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-white border border-slate-100 animate-pulse shadow-xs" />
          ))}
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Nenhuma movimentação encontrada
          </h3>
          <p className="text-xs text-slate-500 mt-1 mb-4 max-w-xs mx-auto">
            {searchQuery
              ? 'Nenhum lançamento corresponde ao filtro de busca.'
              : `Não há registros em ${MONTH_NAMES[filter.month - 1]} de ${filter.year}.`}
          </p>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Novo Lançamento
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {sortedDates.map((dateStr) => {
            const dayTxs = groupedTransactions[dateStr];
            return (
              <div key={dateStr} className="space-y-2">
                {/* Date Group Header (e.g. "Hoje, 14 de outubro") */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-500">
                    {getFriendlyDateHeader(dateStr)}
                  </span>
                </div>

                {/* Date Group Card */}
                <div className="bg-white border border-slate-100 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden">
                  {dayTxs.map((tx) => {
                    const isIncome = tx.type === 'income';
                    const category = getCategory(tx.category_id);
                    const originName = getAccountOrCardName(tx);
                    const statusStyle = getBillStatusStyle(tx.due_date ?? tx.transaction_date, tx.is_paid);

                    return (
                      <div
                        key={tx.id}
                        onClick={() =>
                          selectMode ? toggleSelected(tx.id) : setSelectedTx(selectedTx?.id === tx.id ? null : tx)
                        }
                        className={`flex items-center justify-between p-3.5 sm:p-4 transition-colors cursor-pointer group ${
                          selectedIds.has(tx.id) ? 'bg-emerald-50/70' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        {/* Left: Icon & Description/Category */}
                        <div className="flex items-center gap-3 min-w-0 pr-3">
                          {selectMode && (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(tx.id)}
                              readOnly
                              className="rounded border-slate-300 text-emerald-600 w-4 h-4 flex-shrink-0"
                              aria-label="Selecionar lançamento"
                            />
                          )}
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                              isIncome
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-rose-50 text-rose-500'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                            ) : (
                              <ArrowDown className="w-4 h-4 stroke-[2.5]" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-800 truncate leading-tight">
                              {tx.description}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 truncate">
                              <span>{category ? category.name : originName}</span>
                              {tx.installment_number && tx.total_installments && (
                                <span className="text-indigo-600 font-medium">
                                  ({tx.installment_number}/{tx.total_installments}x)
                                </span>
                              )}
                              {tx.is_invoice_payment && (
                                <span className="text-blue-600 font-medium">• Fatura paga</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount & Status/Chevron */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <span
                              className={`text-xs sm:text-sm font-bold font-mono block leading-tight ${
                                isIncome ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                            </span>
                            <span
                              className={`text-[10px] font-semibold block mt-0.5 ${statusStyle.text}`}
                            >
                              {tx.is_paid
                                ? 'Efetivado'
                                : statusStyle.status === 'upcoming'
                                  ? 'Pendente'
                                  : statusStyle.label}
                            </span>
                          </div>

                          <ChevronIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. TRANSACTION DETAILS DRAWER / MODAL (When an item is clicked) */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Detalhes da Movimentação
              </h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Descrição:</span>
                <span className="font-semibold text-slate-800">{selectedTx.description}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Valor:</span>
                <span className={`font-bold font-mono ${selectedTx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {selectedTx.type === 'income' ? '+' : '-'} {formatCurrency(selectedTx.amount)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Data:</span>
                <span className="font-semibold text-slate-800">{formatDate(selectedTx.transaction_date)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Origem / Destino:</span>
                <span className="font-semibold text-slate-800">{getAccountOrCardName(selectedTx)}</span>
              </div>
              {selectedTx.due_date && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Vencimento:</span>
                  <span className="font-semibold text-slate-800">{formatDate(selectedTx.due_date)}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Status:</span>
                {(() => {
                  const style = getBillStatusStyle(
                    selectedTx.due_date ?? selectedTx.transaction_date,
                    selectedTx.is_paid
                  );
                  return (
                    <span className={`font-semibold ${style.text}`}>
                      {selectedTx.is_paid
                        ? 'Pago / Efetivado'
                        : style.status === 'overdue'
                          ? 'Atrasado'
                          : style.status === 'due_today'
                            ? 'Vence hoje'
                            : 'Aguardando Pagamento'}
                    </span>
                  );
                })()}
              </div>
              {selectedTx.notes && (
                <div className="py-1">
                  <span className="text-slate-500 block mb-1">Anotações:</span>
                  <p className="text-slate-700 text-xs bg-slate-50 border border-slate-100 rounded-xl p-2.5 whitespace-pre-wrap break-words">
                    {selectedTx.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Actions: Toggle Paid & Delete */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await togglePaidStatus(selectedTx.id, selectedTx.is_paid);
                  setSelectedTx(null);
                }}
                className="flex-1 justify-center text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                <span>{selectedTx.is_paid ? 'Marcar Pendente' : 'Marcar Pago'}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRepeatTx(selectedTx);
                  setSelectedTx(null);
                  setIsModalOpen(true);
                }}
                className="text-xs px-3"
                aria-label="Repetir lançamento"
                title="Repetir com a data de hoje"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingTx(selectedTx);
                  setSelectedTx(null);
                  setIsModalOpen(true);
                }}
                className="text-xs px-3"
                aria-label="Editar lançamento"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  if (confirm('Tem certeza que deseja excluir esta movimentação?')) {
                    await deleteTransaction(selectedTx.id);
                    setSelectedTx(null);
                  }
                }}
                className="text-xs px-3"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de ações em massa */}
      {selectMode && (
        <div className="fixed left-3 right-3 bottom-24 md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[34rem] z-40">
          <div className="bg-slate-900 text-white rounded-2xl shadow-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs font-semibold flex-shrink-0">
              {selectedIds.size} selecionado{selectedIds.size === 1 ? '' : 's'}
            </span>
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none"
              aria-label="Nova categoria"
            >
              <option value="">Trocar categoria para...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleBulkCategory}
                disabled={!bulkCategory || selectedIds.size === 0}
                className="text-xs"
              >
                Aplicar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
                className="text-xs"
                aria-label="Excluir selecionados"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modais de Criação e Importação */}
      <TransactionModal
        isOpen={isModalOpen}
        initialValues={editingTx ?? repeatTx}
        isRepeat={Boolean(repeatTx) && !editingTx}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTx(null);
          setRepeatTx(null);
        }}
        onSubmit={async (formData) => {
          if (editingTx) {
            if (formData.category_id && formData.category_id !== editingTx.category_id) {
              learn(formData.description, formData.category_id);
            }
            await updateTransaction(editingTx.id, {
              description: formData.description,
              amount: formData.amount,
              type: formData.type,
              payment_method: formData.payment_method,
              transaction_date: formData.transaction_date,
              account_id: formData.account_id ?? null,
              credit_card_id: formData.credit_card_id ?? null,
              category_id: formData.category_id ?? null,
              is_paid: formData.is_paid,
              notes: formData.notes ?? null,
            });
            return;
          }
          await createTransaction(formData);
        }}
        categories={categories}
        accounts={accounts}
        cards={cards}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        categories={categories}
        accounts={accounts}
        cards={cards}
        onSuccess={() => {}}
      />
    </div>
  );
};
