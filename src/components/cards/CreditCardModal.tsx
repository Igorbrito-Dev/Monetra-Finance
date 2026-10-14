import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { X } from 'lucide-react';

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    limit_amount: number;
    closing_day: number;
    due_day: number;
    color: string;
  }) => Promise<void>;
}

const CARD_COLORS = [
  '#7C3AED', // Purple
  '#820AD1', // Nubank
  '#0F172A', // Slate 900
  '#2563EB', // Blue
  '#EA580C', // Orange (Itaú)
  '#E11D48', // Rose
  '#0284C7', // Sky Blue
  '#059669', // Emerald
];

export const CreditCardModal: React.FC<CreditCardModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [closingDay, setClosingDay] = useState('20');
  const [dueDay, setDueDay] = useState('27');
  const [color, setColor] = useState('#7C3AED');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const limitNum = parseFloat(limitAmount.replace(',', '.')) || 0;
      await onSubmit({
        name,
        limit_amount: limitNum,
        closing_day: parseInt(closingDay, 10),
        due_day: parseInt(dueDay, 10),
        color,
      });
      setName('');
      setLimitAmount('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md p-5 sm:p-6 bg-white border border-slate-100 rounded-3xl shadow-2xl relative text-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 text-slate-400 hover:text-slate-700 p-1 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-slate-900 mb-4">Novo Cartão de Crédito</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nome do Cartão / Bandeira
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Nubank Mastercard, XP Visa Infinite"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Limite Total (R$)
            </label>
            <input
              type="text"
              required
              placeholder="Ex: 5000,00"
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 font-mono font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Dia Fechamento
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Dia Vencimento
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Cor do Cartão
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {CARD_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                    color === c ? 'border-emerald-600 scale-110 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2.5 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 text-xs font-bold"
              isLoading={loading}
            >
              Salvar Cartão
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
