import React, { useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  Target,
  TrendingUp,
  TrendingDown,
  Repeat,
  PiggyBank,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCategories } from '../../hooks/useCategories';
import { useInsightsData } from '../../hooks/useInsightsData';
import { useCategoryBudgets } from '../../hooks/useCategoryBudgets';
import { useRecurringBills } from '../../hooks/useRecurringBills';
import { usePrivacy } from '../../hooks/usePrivacy';
import { getLocalToday } from '../../lib/billStatusStyles';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  computeMonthOutlook,
  compareCategoryMonths,
  categorySpendForMonth,
  detectSubscriptions,
} from '../../lib/spendingInsights';
import { Button } from '../ui/Button';

const inputClass =
  'px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15';

export const PlanningView: React.FC = () => {
  const { profile, updateMonthlyBudget } = useAuth();
  const { categories } = useCategories();
  const { transactions, loading } = useInsightsData();
  const { budgets, error: budgetsError, setBudget, removeBudget } = useCategoryBudgets();
  const { bills, createBill } = useRecurringBills();
  const { hideValues, toggle } = usePrivacy();

  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetLimit, setNewBudgetLimit] = useState('');
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const today = getLocalToday();
  const monthlyBudget = Number(profile?.monthly_budget || 0);

  const money = (value: number) => (hideValues ? '••••••' : formatCurrency(value));

  const categoryName = (id: string | null) =>
    id ? categories.find((c) => c.id === id)?.name ?? 'Categoria' : 'Sem categoria';

  const outlook = useMemo(
    () => computeMonthOutlook(transactions, today, monthlyBudget),
    [transactions, today, monthlyBudget]
  );
  const spendByCategory = useMemo(() => categorySpendForMonth(transactions, today), [transactions, today]);
  const comparison = useMemo(() => compareCategoryMonths(transactions, today).slice(0, 6), [transactions, today]);
  const subscriptions = useMemo(() => {
    const existing = new Set(bills.map((b) => b.description.toLowerCase()));
    return detectSubscriptions(transactions).filter((s) => !existing.has(s.description.toLowerCase()));
  }, [transactions, bills]);

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const budgetedIds = new Set(budgets.map((b) => b.category_id));
  const availableForBudget = expenseCategories.filter((c) => !budgetedIds.has(c.id));

  const parseMoney = (value: string) => parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;

  const handleAddBudget = async () => {
    const limit = parseMoney(newBudgetLimit);
    if (!newBudgetCategory || limit <= 0) return;
    const { error } = await setBudget(newBudgetCategory, limit);
    setMessage(error ? `Não foi possível salvar: ${error.message}` : null);
    if (!error) {
      setNewBudgetCategory('');
      setNewBudgetLimit('');
    }
  };

  const handleSaveMonthlyBudget = async () => {
    const value = parseMoney(monthlyBudgetInput);
    if (value <= 0) return;
    await updateMonthlyBudget(value);
    setMonthlyBudgetInput('');
  };

  const handleSubscriptionToBill = async (index: number) => {
    const sub = subscriptions[index];
    const day = parseInt(sub.lastDate.slice(8, 10), 10) || 1;
    const { error } = await createBill({
      type: 'expense',
      description: sub.description,
      amount: sub.amount,
      day_of_month: day,
      payment_method: 'credit',
      category_id: sub.categoryId,
    });
    setMessage(error ? error.message : `"${sub.description}" virou conta fixa (todo dia ${day}).`);
  };

  const projectedOverBudget = monthlyBudget > 0 && outlook.projectedExpense > monthlyBudget;

  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-in fade-in duration-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Planejar</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Quanto ainda dá para gastar, para onde o mês está indo e onde o dinheiro está saindo.
          </p>
        </div>
        <button
          onClick={toggle}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
          aria-label={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
        >
          {hideValues ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {message && (
        <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">{message}</p>
      )}

      {/* Quanto posso gastar hoje */}
      <div className="rounded-3xl bg-emerald-800 text-white p-5 sm:p-6 shadow-md shadow-emerald-900/15">
        <span className="text-xs font-medium text-emerald-200/90 block mb-1">Você pode gastar hoje</span>
        {outlook.dailyAllowance === null ? (
          <div className="space-y-3">
            <p className="text-sm text-emerald-100">
              Defina um teto mensal para saber quanto pode gastar por dia sem estourar o mês.
            </p>
            <div className="flex items-center gap-2">
              <input
                value={monthlyBudgetInput}
                onChange={(e) => setMonthlyBudgetInput(e.target.value)}
                inputMode="decimal"
                placeholder="Ex: 3500,00"
                className={`${inputClass} w-40`}
              />
              <Button variant="secondary" size="sm" onClick={handleSaveMonthlyBudget} className="text-xs font-bold">
                Definir teto
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight">
              {money(outlook.dailyAllowance)}
            </div>
            <p className="text-xs text-emerald-200/90 mt-2">
              {outlook.budgetRemaining !== null && outlook.budgetRemaining <= 0
                ? 'Seu teto do mês já foi comprometido.'
                : `Restam ${money(outlook.budgetRemaining ?? 0)} do teto, em ${outlook.remainingDays} dia${outlook.remainingDays === 1 ? '' : 's'}.`}
            </p>
          </>
        )}
      </div>

      {/* Previsão de fim de mês */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <TrendingUp className="w-4 h-4 text-indigo-600" /> Previsão para o fim do mês
        </div>

        {loading ? (
          <p className="text-xs text-slate-400">Calculando...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Gasto até hoje', value: outlook.spentToDate, tone: 'text-slate-900' },
                { label: 'Já agendado', value: outlook.scheduledRemaining, tone: 'text-amber-600' },
                { label: 'Despesa prevista', value: outlook.projectedExpense, tone: 'text-rose-600' },
                { label: 'Receita prevista', value: outlook.projectedIncome, tone: 'text-emerald-600' },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">{item.label}</span>
                  <span className={`text-sm sm:text-base font-extrabold font-mono ${item.tone}`}>
                    {money(item.value)}
                  </span>
                </div>
              ))}
            </div>

            <div
              className={`p-3.5 rounded-2xl border text-sm flex items-start gap-2 ${
                outlook.projectedBalance >= 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <PiggyBank className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                No ritmo atual você termina o mês com{' '}
                <strong className="font-mono">{money(outlook.projectedBalance)}</strong>
                {outlook.variableAvgPerDay > 0 && (
                  <span className="block text-xs opacity-80 mt-0.5">
                    Gasto variável médio de {money(outlook.variableAvgPerDay)} por dia.
                  </span>
                )}
              </span>
            </div>

            {projectedOverBudget && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                A projeção de despesas ({money(outlook.projectedExpense)}) passa do seu teto de {money(monthlyBudget)}.
              </div>
            )}
          </>
        )}
      </div>

      {/* Orçamento por categoria */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Target className="w-4 h-4 text-emerald-600" /> Orçamento por categoria
        </div>

        {budgetsError && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Orçamentos indisponíveis: aplique a migration <code>20261016000000</code> no Supabase.
          </p>
        )}

        {budgets.length === 0 && !budgetsError && (
          <p className="text-xs text-slate-500">
            Defina um limite por categoria (ex.: Alimentação R$ 800) e receba aviso ao chegar em 80% e 100%.
          </p>
        )}

        <ul className="space-y-3">
          {budgets.map((b) => {
            const spent = spendByCategory.get(b.category_id) ?? 0;
            const limit = Number(b.monthly_limit);
            const pct = Math.min(100, Math.round((spent / limit) * 100));
            const barColor = spent >= limit ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
            return (
              <li key={b.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">{categoryName(b.category_id)}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-slate-600">
                      {money(spent)} / {money(limit)}
                    </span>
                    <button
                      onClick={() => removeBudget(b.category_id)}
                      className="text-slate-300 hover:text-rose-500 cursor-pointer"
                      aria-label="Remover orçamento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>

        {availableForBudget.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <select
              value={newBudgetCategory}
              onChange={(e) => setNewBudgetCategory(e.target.value)}
              className={`${inputClass} flex-1`}
            >
              <option value="">Escolha uma categoria</option>
              {availableForBudget.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              value={newBudgetLimit}
              onChange={(e) => setNewBudgetLimit(e.target.value)}
              inputMode="decimal"
              placeholder="Limite (R$)"
              className={`${inputClass} sm:w-36`}
            />
            <Button variant="primary" size="sm" onClick={handleAddBudget} className="text-xs font-bold">
              Adicionar
            </Button>
          </div>
        )}
      </div>

      {/* Comparativo com o mês anterior */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="text-sm font-bold text-slate-900">Comparado ao mês passado</div>
        <p className="text-[11px] text-slate-400">Mesmo intervalo de dias, por categoria.</p>
        {comparison.length === 0 ? (
          <p className="text-xs text-slate-500">Ainda não há gastos suficientes para comparar.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {comparison.map((c) => (
              <li key={c.categoryId ?? 'none'} className="flex items-center justify-between py-2.5 text-xs">
                <span className="font-semibold text-slate-800">{categoryName(c.categoryId)}</span>
                <span className="flex items-center gap-3">
                  <span className="font-mono text-slate-600">{money(c.current)}</span>
                  {c.deltaPct === null ? (
                    <span className="text-slate-400 w-16 text-right">novo</span>
                  ) : (
                    <span
                      className={`flex items-center gap-1 w-16 justify-end font-bold ${
                        c.deltaPct > 0 ? 'text-rose-600' : c.deltaPct < 0 ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {c.deltaPct > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : c.deltaPct < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : null}
                      {c.deltaPct > 0 ? '+' : ''}
                      {c.deltaPct}%
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Assinaturas detectadas */}
      {subscriptions.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Repeat className="w-4 h-4 text-indigo-600" /> Cobranças que se repetem
          </div>
          <p className="text-[11px] text-slate-400">
            Detectadas no seu histórico (mesmo valor em 3 meses ou mais). Cadastre como conta fixa para receber aviso.
          </p>
          <ul className="divide-y divide-slate-100">
            {subscriptions.map((s, index) => (
              <li key={s.description} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 block truncate">{s.description}</span>
                  <span className="text-[11px] text-slate-400">
                    {s.months} meses • última em {formatDate(s.lastDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-800">{money(s.amount)}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSubscriptionToBill(index)}
                    className="text-[11px]"
                  >
                    Conta fixa
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
