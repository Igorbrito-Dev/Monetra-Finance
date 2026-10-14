import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Account, Category, PaymentMethod } from '../../types/database';
import type { RecurringBillInput } from '../../hooks/useRecurringBills';

interface RecurringBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: RecurringBillInput) => Promise<void>;
  categories: Category[];
  accounts: Account[];
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15';

export const RecurringBillModal: React.FC<RecurringBillModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  accounts,
}) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('boleto');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
    if (parsedAmount <= 0) return;

    setLoading(true);
    try {
      await onSubmit({
        type,
        description: description.trim(),
        amount: parsedAmount,
        day_of_month: day,
        payment_method: paymentMethod,
        category_id: categoryId || null,
        account_id: accountId || null,
        notes: notes.trim() || null,
      });
      setDescription('');
      setAmount('');
      setNotes('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-lg p-5 sm:p-6 bg-white border border-slate-100 rounded-3xl shadow-2xl relative max-h-[92vh] overflow-y-auto text-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-xl hover:bg-slate-100 cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-slate-900 mb-4">Nova conta fixa</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setCategoryId('');
                }}
                className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  type === t
                    ? t === 'expense'
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t === 'expense' ? 'Despesa fixa' : 'Receita fixa'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Descrição</label>
              <input
                type="text"
                required
                placeholder="Ex: Aluguel, Internet, Salário"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Valor (R$)</label>
              <input
                type="text"
                required
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputClass} font-mono font-bold`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Dia do {type === 'expense' ? 'pagamento' : 'recebimento'}
              </label>
              <select value={day} onChange={(e) => setDay(parseInt(e.target.value, 10))} className={inputClass}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Dia {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Forma de pagamento</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className={inputClass}
              >
                <option value="boleto">Boleto</option>
                <option value="pix">Pix</option>
                <option value="debit">Débito automático</option>
                <option value="transfer">Transferência</option>
                <option value="cash">Dinheiro</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Categoria</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
                <option value="">Sem categoria</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Conta</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
                <option value="">Sem conta específica</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Anotações <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: código de barras no e-mail, reajuste em janeiro..."
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 text-xs">
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={loading} className="flex-1 text-xs font-bold">
              Salvar conta fixa
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
