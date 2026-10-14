import React, { useState } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { useAccounts } from '../../hooks/useAccounts';
import { useCreditCards } from '../../hooks/useCreditCards';
import { calculateMonthSummary } from '../../lib/financeRules';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Card, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { TransactionModal } from './TransactionModal';
import { ImportModal } from '../import/ImportModal';
import {
  Plus,
  Upload,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Layers,
  ShieldCheck,
  ReceiptText,
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
    refetch,
    createTransaction,
    togglePaidStatus,
    deleteTransaction,
  } = useTransactions();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Resumo financeiro do mês (com regras anti-dupla contagem)
  const summary = calculateMonthSummary(transactions);

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
    return t.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Sem categoria';
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.name : 'Categoria';
  };

  const getCategoryColor = (categoryId: string | null) => {
    if (!categoryId) return '#64748B';
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.color || '#64748B';
  };

  const getPaymentOriginName = (t: typeof transactions[0]) => {
    if (t.credit_card_id) {
      const card = cards.find((c) => c.id === t.credit_card_id);
      return card ? `💳 ${card.name}` : '💳 Cartão de Crédito';
    }
    if (t.account_id) {
      const acc = accounts.find((a) => a.id === t.account_id);
      return acc ? `🏦 ${acc.name}` : '🏦 Conta Bancária';
    }
    return 'Lançamento Direto';
  };

  return (
    <div className="space-y-6">
      {/* Month Navigator & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ReceiptText className="w-6 h-6 text-emerald-400" />
            Lançamentos & Extrato
          </h2>
          <p className="text-sm text-slate-400">
            Acompanhe movimentações, compras parceladas e vencimentos.
          </p>
        </div>

        {/* Month Selector & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-1 w-full sm:w-auto">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 sm:px-3 text-xs font-semibold text-slate-200 text-center flex-1 sm:min-w-[130px]">
              {MONTH_NAMES[filter.month - 1]} de {filter.year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              onClick={() => setIsImportModalOpen(true)}
              className="flex-1 sm:flex-initial justify-center text-xs px-3 sm:px-4"
            >
              <Upload className="w-4 h-4 mr-1.5" />
              <span>Importar</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-initial justify-center text-xs px-3 sm:px-4"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Novo</span>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards do Mês */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center justify-between border-emerald-500/20 bg-emerald-950/10">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Receitas Realizadas</span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {formatCurrency(summary.totalIncome)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ArrowUpCircle className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between border-rose-500/20 bg-rose-950/10">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Despesas de Consumo</span>
            <div className="text-2xl font-bold font-mono text-rose-400">
              {formatCurrency(summary.totalExpense)}
            </div>
            {summary.totalPendingExpense > 0 && (
              <span className="text-[11px] text-slate-500 block mt-0.5">
                + {formatCurrency(summary.totalPendingExpense)} a vencer
              </span>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <ArrowDownCircle className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between border-indigo-500/20 bg-indigo-950/10">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Balanço do Mês</span>
            <div
              className={`text-2xl font-bold font-mono ${
                summary.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(summary.netBalance)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <ReceiptText className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Filter Bar and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
          <button
            onClick={() => setFilter((prev) => ({ ...prev, type: 'all' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filter.type === 'all'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter((prev) => ({ ...prev, type: 'expense' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filter.type === 'expense'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            Despesas
          </button>
          <button
            onClick={() => setFilter((prev) => ({ ...prev, type: 'income' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filter.type === 'income'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            Receitas
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Transactions Table / List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <Card className="text-center py-12 border-dashed border-slate-800">
          <ReceiptText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <CardTitle className="text-slate-300">Nenhum lançamento no período</CardTitle>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Não há transações registradas para {MONTH_NAMES[filter.month - 1]} de {filter.year}.
          </p>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Adicionar Primeiro Lançamento
          </Button>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all group"
            >
              {/* Left Column: Date, Icon & Description */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    tx.type === 'income'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {tx.type === 'income' ? (
                    <ArrowUpCircle className="w-5 h-5" />
                  ) : (
                    <ArrowDownCircle className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-white text-sm">
                      {tx.description}
                    </h4>

                    {tx.installment_number && tx.total_installments && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        <Layers className="w-3 h-3" /> Parcela {tx.installment_number}/{tx.total_installments}
                      </span>
                    )}

                    {tx.is_invoice_payment && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <ShieldCheck className="w-3 h-3" /> Pagamento de Fatura
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>{formatDate(tx.transaction_date)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getCategoryColor(tx.category_id) }}
                      />
                      {getCategoryName(tx.category_id)}
                    </span>
                    <span>•</span>
                    <span>{getPaymentOriginName(tx)}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Amount, Status & Actions */}
              <div className="flex items-center justify-between sm:justify-end gap-4 self-end sm:self-auto w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                <div className="text-right">
                  <div
                    className={`font-mono font-bold text-base ${
                      tx.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                  </div>
                  <span className="text-[11px] text-slate-500 uppercase">
                    {tx.payment_method}
                  </span>
                </div>

                {/* Status Toggle Button */}
                <button
                  onClick={() => togglePaidStatus(tx.id, tx.is_paid)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    tx.is_paid
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                  }`}
                  title={tx.is_paid ? 'Status: Efetivado / Pago (Clique para alterar)' : 'Status: Pendente (Clique para marcar como pago)'}
                >
                  {tx.is_paid ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => {
                    const hasGroup = Boolean(tx.installment_group_id);
                    if (hasGroup) {
                      const deleteGroup = confirm(
                        `Esta transação faz parte de uma compra parcelada.\n\nClique em OK para excluir TODAS as parcelas deste grupo, ou CANCELAR para excluir apenas esta parcela.`
                      );
                      deleteTransaction(tx.id, deleteGroup);
                    } else {
                      if (confirm(`Deseja excluir "${tx.description}"?`)) {
                        deleteTransaction(tx.id, false);
                      }
                    }
                  }}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                  title="Excluir Lançamento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (data) => {
          await createTransaction(data);
        }}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {
          refetch();
        }}
      />
    </div>
  );
};
