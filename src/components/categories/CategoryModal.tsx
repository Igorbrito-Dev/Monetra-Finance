import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { X } from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    type: 'income' | 'expense';
    color: string;
  }) => Promise<void>;
}

const CATEGORY_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#64748B', // Slate
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [color, setColor] = useState('#EF4444');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        name,
        type,
        color,
      });
      setName('');
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

        <h3 className="text-lg font-bold text-slate-900 mb-4">Nova Categoria</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tipo de Lançamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  if (color === '#10B981') setColor('#EF4444');
                }}
                className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Despesa (Saída)
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  if (color === '#EF4444') setColor('#10B981');
                }}
                className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Receita (Entrada)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nome da Categoria
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Farmácia, Restaurante, Salário"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Cor Visual
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {CATEGORY_COLORS.map((c) => (
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
              Salvar Categoria
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
