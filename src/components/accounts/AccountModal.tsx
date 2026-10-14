import React, { useState } from 'react';
import { Button } from '../ui/Button';
import type { AccountType } from '../../types/database';
import { X } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    type: AccountType;
    initial_balance: number;
    color: string;
  }) => Promise<void>;
}

const ACCOUNT_COLORS = [
  '#2563EB', // Blue
  '#059669', // Emerald
  '#7C3AED', // Purple
  '#EA580C', // Orange (Itaú)
  '#820AD1', // Purple (Nubank)
  '#DC2626', // Red (Bradesco/Santander)
  '#0D9488', // Teal
  '#D97706', // Amber
];

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [initialBalance, setInitialBalance] = useState('');
  const [color, setColor] = useState('#2563EB');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const balanceNum = parseFloat(initialBalance.replace(',', '.')) || 0;
      await onSubmit({
        name,
        type,
        initial_balance: balanceNum,
        color,
      });
      setName('');
      setInitialBalance('');
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

        <h3 className="text-lg font-bold text-slate-900 mb-4">Nova Conta / Carteira</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nome da Conta / Instituição
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Nubank, Itaú, Carteira Dinheiro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tipo de Conta
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
            >
              <option value="checking">Conta Corrente</option>
              <option value="savings">Conta Poupança</option>
              <option value="investment">Investimentos</option>
              <option value="cash">Dinheiro em Espécie</option>
              <option value="other">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Saldo Inicial (R$)
            </label>
            <input
              type="text"
              required
              placeholder="0,00"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Cor de Identificação
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {ACCOUNT_COLORS.map((c) => (
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
              Salvar Conta
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
