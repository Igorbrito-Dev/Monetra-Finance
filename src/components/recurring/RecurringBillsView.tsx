import React, { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Plus, Trash2, Repeat, StickyNote } from 'lucide-react';
import { useRecurringBills } from '../../hooks/useRecurringBills';
import { useCategories } from '../../hooks/useCategories';
import { useAccounts } from '../../hooks/useAccounts';
import { getBillStatusStyle, getLocalToday } from '../../lib/billStatusStyles';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../ui/Button';
import { RecurringBillModal } from './RecurringBillModal';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const RecurringBillsView: React.FC = () => {
  const { bills, occurrences, loading, error, createBill, toggleBillActive, deleteBill, setOccurrencePaid } =
    useRecurringBills();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const today = getLocalToday();

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof occurrences>();
    for (const tx of occurrences) {
      const key = (tx.due_date ?? tx.transaction_date).slice(0, 7);
      groups.set(key, [...(groups.get(key) ?? []), tx]);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [occurrences]);

  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-in fade-in duration-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Contas fixas</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Receitas e despesas mensais com aviso antes do vencimento.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} className="text-xs font-bold">
          <Plus className="w-3.5 h-3.5 stroke-[3]" /> Nova
        </Button>
      </div>

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
      )}

      {/* Legenda de cores */}
      <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
        <span className="px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">Pago</span>
        <span className="px-2.5 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-300">Vence hoje</span>
        <span className="px-2.5 py-1 rounded-full border bg-rose-50 text-rose-700 border-rose-300">Atrasado</span>
      </div>

      {/* Vencimentos por mês */}
      {loading ? (
        <p className="text-xs text-slate-400 py-6 text-center">Carregando...</p>
      ) : grouped.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-xs">
          <CalendarClock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Nenhum vencimento por aqui ainda</p>
          <p className="text-xs text-slate-400 mt-1">Cadastre uma conta fixa para começar a receber avisos.</p>
        </div>
      ) : (
        grouped.map(([monthKey, items]) => {
          const [year, month] = monthKey.split('-').map(Number);
          return (
            <section key={monthKey} className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400 px-1">
                {MONTH_NAMES[month - 1]} de {year}
              </h2>
              <div className="bg-white border border-slate-100 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden">
                {items.map((tx) => {
                  const due = tx.due_date ?? tx.transaction_date;
                  const style = getBillStatusStyle(due, tx.is_paid, today);
                  const isIncome = tx.type === 'income';
                  return (
                    <div key={tx.id} className="flex items-center justify-between gap-3 p-3.5 sm:p-4">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-800 truncate">{tx.description}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.pill}`}
                          >
                            {style.status === 'upcoming' ? `Vence ${formatDate(due)}` : style.label}
                          </span>
                          <span className="text-[11px] text-slate-400">{formatDate(due)}</span>
                        </div>
                        {tx.notes && (
                          <p className="flex items-start gap-1 text-[11px] text-slate-500 mt-1.5 break-words">
                            <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
                            {tx.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-sm font-bold font-mono ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}
                        >
                          {isIncome ? '+' : '-'} {formatCurrency(Number(tx.amount))}
                        </span>
                        <Button
                          variant={tx.is_paid ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => setOccurrencePaid(tx.id, !tx.is_paid)}
                          className="text-[11px] px-2.5"
                          title={tx.is_paid ? 'Desfazer' : isIncome ? 'Marcar como recebido' : 'Marcar como pago'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">
                            {tx.is_paid ? 'Desfazer' : isIncome ? 'Recebido' : 'Pago'}
                          </span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      {/* Contas fixas cadastradas */}
      {bills.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400 px-1">Cadastradas</h2>
          <div className="bg-white border border-slate-100 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden">
            {bills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between gap-3 p-3.5 sm:p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      bill.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                    }`}
                  >
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className={`text-sm font-semibold truncate ${
                        bill.active ? 'text-slate-800' : 'text-slate-400 line-through'
                      }`}
                    >
                      {bill.description}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Todo dia {bill.day_of_month} • {formatCurrency(Number(bill.amount))}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleBillActive(bill.id, !bill.active)}
                    className="text-[11px]"
                  >
                    {bill.active ? 'Pausar' : 'Reativar'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Excluir "${bill.description}"? Os vencimentos ainda não pagos serão removidos.`)) {
                        deleteBill(bill.id);
                      }
                    }}
                    className="px-2.5"
                    aria-label="Excluir conta fixa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <RecurringBillModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
        accounts={accounts}
        onSubmit={async (input) => {
          await createBill(input);
        }}
      />
    </div>
  );
};
