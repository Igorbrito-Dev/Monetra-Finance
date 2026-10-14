import React, { useState } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { calculateMonthSummary } from '../../lib/financeRules';
import { getSixMonthsEvolution, getCategoryExpensesBreakdown } from '../../lib/dashboardMetrics';
import { formatCurrency } from '../../lib/utils';
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, TrendingUp, Tag } from 'lucide-react';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const ReportsView: React.FC = () => {
  const { transactions, filter, setFilter } = useTransactions();
  const { categories } = useCategories();
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');

  const summary = calculateMonthSummary(transactions);
  const evolution = getSixMonthsEvolution(transactions, filter.year, filter.month);
  const categoryBreakdown = getCategoryExpensesBreakdown(transactions, categories);

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

  // Find max value in evolution for SVG chart scaling
  const maxVal = Math.max(
    ...evolution.map((e) => Math.max(e.income, e.expense)),
    1000
  );

  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-in fade-in duration-200">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Relatórios
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Visualize sua evolução financeira e composição de gastos.
          </p>
        </div>

        {/* Month Selector */}
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

      {/* 2. PERIOD TOGGLES (Mensal | Trimestral | Anual - Matches Screen 7 of Reference) */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPeriod('monthly')}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
            period === 'monthly'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Mensal
        </button>
        <button
          onClick={() => setPeriod('quarterly')}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
            period === 'quarterly'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Trimestral
        </button>
        <button
          onClick={() => setPeriod('annual')}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
            period === 'annual'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Anual
        </button>
      </div>

      {/* 3. SALDO DO MÊS & BAR CHART (Matches Screen 7 of Reference) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-0.5">
              Saldo do mês • {MONTH_NAMES[filter.month - 1]} {filter.year}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900">
              {formatCurrency(summary.netBalance)}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Balanço positivo este mês</span>
            </div>
          </div>
        </div>

        {/* Clean SVG Evolution Bar Chart */}
        <div className="pt-2">
          <div className="h-44 sm:h-52 w-full flex items-end justify-between gap-2 sm:gap-4 pb-2 border-b border-slate-100">
            {evolution.map((item, idx) => {
              const incomeHeight = Math.max(6, Math.min(100, (item.income / maxVal) * 100));
              const expenseHeight = Math.max(6, Math.min(100, (item.expense / maxVal) * 100));
              const isCurrent = idx === evolution.length - 1;

              return (
                <div key={item.monthLabel} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-36">
                    {/* Income Bar (Green) */}
                    <div
                      className={`w-2.5 sm:w-4 rounded-t-lg transition-all duration-300 ${
                        isCurrent ? 'bg-emerald-600' : 'bg-emerald-500/80 group-hover:bg-emerald-600'
                      }`}
                      style={{ height: `${incomeHeight}%` }}
                      title={`Receitas: ${formatCurrency(item.income)}`}
                    />

                    {/* Expense Bar (Coral / Red) */}
                    <div
                      className={`w-2.5 sm:w-4 rounded-t-lg transition-all duration-300 ${
                        isCurrent ? 'bg-rose-500' : 'bg-rose-400/80 group-hover:bg-rose-500'
                      }`}
                      style={{ height: `${expenseHeight}%` }}
                      title={`Despesas: ${formatCurrency(item.expense)}`}
                    />
                  </div>

                  <span className={`text-[10px] sm:text-xs font-semibold mt-2.5 ${isCurrent ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    {item.monthLabel}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-6 pt-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-md bg-emerald-600" />
              <span>Receitas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-md bg-rose-500" />
              <span>Despesas</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM STATS ROW (Receitas vs Despesas - Matches Screen 7 of Reference) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        <div className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-5 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-xs font-medium text-slate-400 block">Receitas</span>
          <div className="text-lg sm:text-2xl font-bold font-mono text-emerald-600 mt-0.5">
            {formatCurrency(summary.totalIncome)}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-5 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-2">
            <ArrowDown className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-xs font-medium text-slate-400 block">Despesas</span>
          <div className="text-lg sm:text-2xl font-bold font-mono text-rose-600 mt-0.5">
            {formatCurrency(summary.totalExpense)}
          </div>
        </div>
      </div>

      {/* 5. CATEGORY EXPENSES BREAKDOWN */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              Despesas por Categoria
            </h2>
          </div>

          <div className="space-y-3">
            {categoryBreakdown.slice(0, 6).map((item) => (
              <div key={item.categoryId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{item.categoryName}</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(item.amount)} ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color || '#10B981',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
