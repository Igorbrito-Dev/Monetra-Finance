import React, { useState } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useCreditCards } from '../../hooks/useCreditCards';
import {
  getCategoryExpensesBreakdown,
  getSixMonthsEvolution,
  calculateSavingsRate,
  getUpcomingCommitments,
} from '../../lib/dashboardMetrics';
import { calculateMonthSummary } from '../../lib/financeRules';
import { formatCurrency } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { CategoryBreakdownChart } from './CategoryBreakdownChart';
import { EvolutionBarChart } from './EvolutionBarChart';
import { UpcomingCommitments } from './UpcomingCommitments';
import { TransactionModal } from '../transactions/TransactionModal';
import {
  Building2,
  ArrowUpCircle,
  ArrowDownCircle,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
  Plus,
  ReceiptText,
  Target,
  Edit2,
  Check,
} from 'lucide-react';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface DashboardViewProps {
  onNavigateToTab: (tab: 'transactions' | 'accounts' | 'cards' | 'categories') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToTab }) => {
  const { profile, updateMonthlyBudget } = useAuth();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { cards } = useCreditCards();
  const { transactions, filter, setFilter, createTransaction } = useTransactions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  // Teto mensal de gastos e consumo
  const monthlyBudget = profile?.monthly_budget || 0;

  // Patrimônio consolidado em contas
  const totalAccountBalance = accounts.reduce((acc, curr) => acc + (curr.current_balance || 0), 0);

  // Limite total de cartões
  const totalCardsLimit = cards.reduce((acc, curr) => acc + (curr.limit_amount || 0), 0);

  // Resumo financeiro do mês selecionado
  const summary = calculateMonthSummary(transactions);

  // Taxa de economia
  const savingsRate = calculateSavingsRate(summary.totalIncome, summary.totalExpense);

  // Composição por categorias
  const categoryBreakdown = getCategoryExpensesBreakdown(transactions, categories);

  // Evolução 6 meses
  const sixMonthsEvolution = getSixMonthsEvolution(transactions, filter.year, filter.month);

  // Compromissos futuros (a partir do último dia do mês corrente)
  const lastDayOfMonth = new Date(filter.year, filter.month, 0).getDate();
  const referenceDate = `${filter.year}-${String(filter.month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
  const upcoming = getUpcomingCommitments(transactions, referenceDate);

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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Month Selector Bar & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Dashboard Financeiro
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Visão consolidada de patrimônio, fluxo de caixa e projeções orçamentárias.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-sm w-full sm:w-auto">
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

          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto justify-center text-xs font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Novo Lançamento
          </Button>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {/* Patrimônio Líquido */}
        <Card className="flex items-center justify-between border-slate-800/80 bg-slate-900/60 hover:border-slate-700">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Patrimônio em Contas</span>
            <div className="text-2xl font-bold font-mono text-white">
              {formatCurrency(totalAccountBalance)}
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              {accounts.length} contas ativas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-emerald-400 flex items-center justify-center border border-slate-700">
            <Building2 className="w-6 h-6" />
          </div>
        </Card>

        {/* Receitas Realizadas */}
        <Card className="flex items-center justify-between border-emerald-500/20 bg-emerald-950/10 hover:border-emerald-500/30">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Receitas do Mês</span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {formatCurrency(summary.totalIncome)}
            </div>
            <span className="text-[11px] text-emerald-500/80 block mt-1">
              Entradas realizadas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <ArrowUpCircle className="w-6 h-6" />
          </div>
        </Card>

        {/* Despesas de Consumo */}
        <Card className="flex items-center justify-between border-rose-500/20 bg-rose-950/10 hover:border-rose-500/30">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Despesas de Consumo</span>
            <div className="text-2xl font-bold font-mono text-rose-400">
              {formatCurrency(summary.totalExpense)}
            </div>
            <span className="text-[11px] text-rose-500/80 block mt-1">
              {summary.totalPendingExpense > 0
                ? `+ ${formatCurrency(summary.totalPendingExpense)} a pagar`
                : 'Todas quitadas'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <ArrowDownCircle className="w-6 h-6" />
          </div>
        </Card>

        {/* Balanço Líquido & Taxa de Poupança */}
        <Card className="flex items-center justify-between border-indigo-500/20 bg-indigo-950/10 hover:border-indigo-500/30">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Balanço do Mês</span>
            <div
              className={`text-2xl font-bold font-mono ${
                summary.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(summary.netBalance)}
            </div>
            <span className="text-[11px] text-indigo-400 block mt-1">
              Taxa de Poupança: <strong>{savingsRate}%</strong>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <PiggyBank className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Teto de Gastos Orçamentário & Alertas */}
      <Card className="p-5 border-slate-800 bg-slate-900/90 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
              monthlyBudget > 0 && summary.totalExpense >= monthlyBudget
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                : monthlyBudget > 0 && (summary.totalExpense / monthlyBudget) >= 0.8
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Teto de Gastos do Mês</span>
                {monthlyBudget > 0 && (
                  <Badge variant={summary.totalExpense >= monthlyBudget ? 'rose' : (summary.totalExpense / monthlyBudget) >= 0.8 ? 'amber' : 'emerald'}>
                    {summary.totalExpense >= monthlyBudget
                      ? '🚨 Teto Estourado'
                      : (summary.totalExpense / monthlyBudget) >= 0.8
                      ? '⚠️ Atenção (≥80%)'
                      : '✅ Sob Controle'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {monthlyBudget > 0
                  ? `Limite definido: ${formatCurrency(monthlyBudget)} • Restante disponível: ${formatCurrency(Math.max(0, monthlyBudget - summary.totalExpense))}`
                  : 'Nenhum teto de gastos configurado. Defina uma meta para receber alertas automáticos da IA.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEditingBudget ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Ex: 3500"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs w-28 focus:outline-none focus:border-emerald-500"
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={async () => {
                    const val = parseFloat(budgetInput);
                    if (!isNaN(val) && val > 0) {
                      await updateMonthlyBudget(val);
                      setIsEditingBudget(false);
                    }
                  }}
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Salvar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingBudget(false)}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBudgetInput(monthlyBudget > 0 ? String(monthlyBudget) : '');
                  setIsEditingBudget(true);
                }}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" /> {monthlyBudget > 0 ? 'Ajustar Limite' : 'Definir Limite'}
              </Button>
            )}
          </div>
        </div>

        {monthlyBudget > 0 && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">
                Consumido: {formatCurrency(summary.totalExpense)} ({Math.round((summary.totalExpense / monthlyBudget) * 100)}%)
              </span>
              <span className={summary.totalExpense >= monthlyBudget ? 'text-rose-400' : 'text-slate-400'}>
                {summary.totalExpense < monthlyBudget
                  ? `Restam ${formatCurrency(monthlyBudget - summary.totalExpense)}`
                  : `Estourado em ${formatCurrency(summary.totalExpense - monthlyBudget)}`}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  summary.totalExpense >= monthlyBudget
                    ? 'bg-rose-500'
                    : (summary.totalExpense / monthlyBudget) >= 0.8
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, Math.round((summary.totalExpense / monthlyBudget) * 100))}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Main Charts Grid: Evolution (6 Months) & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EvolutionBarChart data={sixMonthsEvolution} />
        </div>
        <div className="lg:col-span-1">
          <CategoryBreakdownChart
            items={categoryBreakdown}
            totalExpense={summary.totalExpense}
          />
        </div>
      </div>

      {/* Bottom Row: Upcoming Commitments & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingCommitments
          commitments={upcoming}
          onViewAll={() => onNavigateToTab('transactions')}
        />

        {/* Quick Management Links */}
        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white mb-2">
              Gestão de Contas & Cartões
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Acesso rápido para cadastros e conciliação de limites e saldos.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onNavigateToTab('accounts')}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
              >
                <span className="text-xs text-slate-400 block">Contas Bancárias</span>
                <span className="text-sm font-semibold text-white group-hover:text-emerald-400">
                  {accounts.length} cadastradas
                </span>
              </button>

              <button
                onClick={() => onNavigateToTab('cards')}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-left transition-all group cursor-pointer"
              >
                <span className="text-xs text-slate-400 block">Limite em Cartões</span>
                <span className="text-sm font-semibold text-white group-hover:text-indigo-400">
                  {formatCurrency(totalCardsLimit)}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Precisa conferir os detalhes de cada transação?
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToTab('transactions')}
            >
              <ReceiptText className="w-3.5 h-3.5 mr-1" /> Ver Extrato Completo
            </Button>
          </div>
        </Card>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (data) => {
          await createTransaction(data);
        }}
      />
    </div>
  );
};
