import React, { useState } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useCreditCards } from '../../hooks/useCreditCards';
import { useUpcomingCommitments } from '../../hooks/useUpcomingCommitments';
import { usePrivacy } from '../../hooks/usePrivacy';
import { calculateMonthSummary } from '../../lib/financeRules';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { TransactionModal } from '../transactions/TransactionModal';
import { AccountModal } from '../accounts/AccountModal';
import { CreditCardModal } from '../cards/CreditCardModal';
import { ImportModal } from '../import/ImportModal';
import {
  Eye,
  EyeOff,
  TrendingUp,
  Plus,
  Building2,
  CreditCard,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Wallet,
  ChevronRight,
  Target,
  Edit2,
  Check,
  ChevronLeft,
  Calendar,
} from 'lucide-react';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface DashboardViewProps {
  onNavigateToTab: (tab: 'transactions' | 'accounts' | 'cards' | 'categories' | 'reports') => void;
  onOpenNewTransaction?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToTab, onOpenNewTransaction }) => {
  const { profile, user, updateMonthlyBudget } = useAuth();
  const { accounts, createAccount } = useAccounts();
  const { categories } = useCategories();
  const { cards, createCard } = useCreditCards();
  const { transactions, filter, setFilter, createTransaction } = useTransactions();

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const { hideValues, toggle: toggleHideValues } = usePrivacy();

  // Budget editing state
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  // Teto mensal de gastos e consumo
  const monthlyBudget = profile?.monthly_budget || 0;

  // Patrimônio consolidado em contas (saldo real em conta corrente, carteira e investimentos)
  const totalAccountBalance = accounts.reduce((acc, curr) => acc + (curr.current_balance || 0), 0);

  // Resumo financeiro do mês selecionado
  const summary = calculateMonthSummary(transactions);

  // Próximos compromissos (parcelas e contas com data futura, independente do mês exibido)
  const { commitments: upcoming } = useUpcomingCommitments();

  // Saudação contextual
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : user?.email?.split('@')[0] || 'Igor';

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

  const handleSaveBudget = async () => {
    const val = parseFloat(budgetInput.replace(',', '.'));
    if (!isNaN(val) && val >= 0) {
      await updateMonthlyBudget(val);
      setIsEditingBudget(false);
    }
  };

  const maskValue = (value: number) => {
    if (hideValues) return '••••••';
    return formatCurrency(value);
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      
      {/* 1. GREETING & HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {greeting}, {firstName}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Aqui está um resumo da sua vida financeira.
          </p>
        </div>

        {/* Month Selector Pill */}
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
      </div>

      {/* 2. HERO CARD: Saldo Disponível (Matches Reference Screen 1) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-emerald-700 text-white p-5 sm:p-6 shadow-md shadow-emerald-700/15">
        {/* Subtle decorative background circles */}
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-12 top-0 w-24 h-24 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-emerald-100/90 tracking-wide">
                Saldo disponível
              </span>
              <button
                onClick={toggleHideValues}
                className="text-emerald-200/80 hover:text-white transition-colors cursor-pointer p-0.5"
                title={hideValues ? 'Mostrar Valores' : 'Ocultar Valores'}
              >
                {hideValues ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white backdrop-blur-sm">
              <TrendingUp className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>

          {/* Big Balance */}
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white mb-3">
            {maskValue(totalAccountBalance)}
          </div>

          {/* Subtitle / Month Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[11px] font-medium text-emerald-50">
            <span className="font-bold">
              {summary.netBalance >= 0 ? '+' : ''} {maskValue(summary.netBalance)}
            </span>
            <span className="text-emerald-100/80">este mês</span>
          </div>
        </div>
      </div>

      {/* 3. QUICK ACTIONS ROW (Nova transação, Nova conta, Novo cartão, Relatório) */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        {/* Action 1: Nova Transação */}
        <button
          onClick={() => {
            if (onOpenNewTransaction) onOpenNewTransaction();
            else setIsTxModalOpen(true);
          }}
          className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-white border border-slate-100 shadow-xs hover:border-slate-200 hover:shadow-sm active:scale-95 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-slate-700 text-center leading-tight">
            Nova<br className="sm:hidden" /> transação
          </span>
        </button>

        {/* Action 2: Nova Conta */}
        <button
          onClick={() => setIsAccountModalOpen(true)}
          className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-white border border-slate-100 shadow-xs hover:border-slate-200 hover:shadow-sm active:scale-95 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Building2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-slate-700 text-center leading-tight">
            Nova<br className="sm:hidden" /> conta
          </span>
        </button>

        {/* Action 3: Novo Cartão */}
        <button
          onClick={() => setIsCardModalOpen(true)}
          className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-white border border-slate-100 shadow-xs hover:border-slate-200 hover:shadow-sm active:scale-95 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <CreditCard className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-slate-700 text-center leading-tight">
            Novo<br className="sm:hidden" /> cartão
          </span>
        </button>

        {/* Action 4: Relatório / Análise */}
        <button
          onClick={() => onNavigateToTab('reports')}
          className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-white border border-slate-100 shadow-xs hover:border-slate-200 hover:shadow-sm active:scale-95 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <BarChart3 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-slate-700 text-center leading-tight">
            Relatórios
          </span>
        </button>
      </div>

      {/* 4. RESUMO DO MÊS CARD (Matches Reference Screen 1) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Resumo do mês
            </h2>
            <span className="text-[11px] text-slate-400">
              {MONTH_NAMES[filter.month - 1]} {filter.year}
            </span>
          </div>

          <button
            onClick={() => onNavigateToTab('transactions')}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
          >
            <span>Ver extrato</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Row 1: Receitas */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-700">Receitas</span>
            </div>
            <span className="text-xs sm:text-sm font-bold font-mono text-emerald-600">
              {maskValue(summary.totalIncome)}
            </span>
          </div>

          {/* Row 2: Despesas */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <ArrowDown className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-700">Despesas</span>
            </div>
            <span className="text-xs sm:text-sm font-bold font-mono text-rose-600">
              {maskValue(summary.totalExpense)}
            </span>
          </div>

          {/* Row 3: Saldo */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-700">Saldo</span>
            </div>
            <span
              className={`text-xs sm:text-sm font-bold font-mono ${
                summary.netBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'
              }`}
            >
              {maskValue(summary.netBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. TETO ORÇAMENTÁRIO (Clean card with progress indicator) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-800">
              Teto de Gastos Mensal
            </h2>
          </div>

          {!isEditingBudget ? (
            <button
              onClick={() => {
                setBudgetInput(monthlyBudget > 0 ? String(monthlyBudget) : '');
                setIsEditingBudget(true);
              }}
              className="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
              <span>{monthlyBudget > 0 ? 'Ajustar' : 'Definir'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="Ex: 3000"
                className="w-24 px-2 py-0.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <button
                onClick={handleSaveBudget}
                className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {monthlyBudget > 0 ? (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>Consumido: <strong className="text-slate-800">{maskValue(summary.totalExpense)}</strong></span>
              <span>Teto: <strong className="text-slate-800">{maskValue(monthlyBudget)}</strong></span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  summary.totalExpense >= monthlyBudget
                    ? 'bg-rose-500'
                    : summary.totalExpense / monthlyBudget >= 0.8
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(100, (summary.totalExpense / monthlyBudget) * 100)}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] mt-2">
              <span className="text-slate-400">
                {Math.round((summary.totalExpense / monthlyBudget) * 100)}% utilizado
              </span>
              <span className="font-semibold text-emerald-700">
                Disponível: {maskValue(Math.max(0, monthlyBudget - summary.totalExpense))}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Defina uma meta mensal para acompanhar seus limites e receber avisos no Telegram quando atingir 80% do valor.
          </p>
        )}
      </div>

      {/* 6. PRÓXIMOS COMPROMISSOS & PARCELADAS PREVIEW */}
      {upcoming.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                Próximos Compromissos & Parcelas
              </h2>
            </div>
            <button
              onClick={() => onNavigateToTab('transactions')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {upcoming.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    {item.description}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Vencimento: {item.transaction_date.split('-').reverse().join('/')}
                    {item.installment_number && item.total_installments && (
                      <> • Parcela {item.installment_number}/{item.total_installments}</>
                    )}
                  </span>
                </div>
                <span className="text-xs font-bold font-mono text-slate-700">
                  {maskValue(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALL MODALS PRESERVED */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSubmit={async (formData) => {
          await createTransaction(formData);
        }}
        categories={categories}
        accounts={accounts}
        cards={cards}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSubmit={async (data) => {
          await createAccount(data);
        }}
      />

      <CreditCardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        onSubmit={async (data) => {
          await createCard(data);
        }}
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
