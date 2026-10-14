import React, { useState } from 'react';
import { useCreditCards } from '../../hooks/useCreditCards';
import { formatCurrency } from '../../lib/utils';
import { Card, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { CreditCardModal } from './CreditCardModal';
import { Plus, CreditCard as CardIcon, Trash2, Calendar, Cpu } from 'lucide-react';

export const CreditCardList: React.FC = () => {
  const { cards, loading, createCard, deleteCard } = useCreditCards();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalLimit = cards.reduce((acc, curr) => acc + (curr.limit_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header and Total */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CardIcon className="w-6 h-6 text-indigo-400" />
            Cartões de Crédito
          </h2>
          <p className="text-sm text-slate-400">
            Controle seus cartões, limites disponíveis e datas de fechamento e vencimento.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full sm:w-auto">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex sm:block items-center justify-between">
            <span className="text-xs text-slate-400 sm:block">Limite Combinado:</span>
            <span className="text-base sm:text-lg font-bold text-indigo-400 font-mono">
              {formatCurrency(totalLimit)}
            </span>
          </div>

          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto justify-center text-xs font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Novo Cartão
          </Button>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-52 rounded-3xl bg-slate-900/60 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <Card className="text-center py-12 border-dashed border-slate-800">
          <CardIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <CardTitle className="text-slate-300">Nenhum cartão de crédito cadastrado</CardTitle>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Adicione seus cartões para acompanhar compras parceladas e vencimentos de fatura.
          </p>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Adicionar Primeiro Cartão
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div
              key={card.id}
              className="relative rounded-3xl p-6 text-white overflow-hidden shadow-2xl flex flex-col justify-between border border-white/10 group transition-all duration-300 hover:scale-[1.02] hover:shadow-indigo-500/10 min-h-[220px]"
              style={{
                background: `linear-gradient(135deg, ${card.color || '#1e1b4b'} 0%, #090d16 100%)`,
              }}
            >
              {/* Card Ambient Glow */}
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              {/* Card Top Row */}
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-7 rounded-md bg-amber-400/80 border border-amber-300 flex items-center justify-center shadow-inner">
                    <Cpu className="w-5 h-5 text-amber-950/70" />
                  </div>
                  <span className="text-xs tracking-widest text-slate-300 font-mono uppercase">
                    Virtual / Físico
                  </span>
                </div>

                <button
                  onClick={() => {
                    if (confirm(`Deseja remover o cartão "${card.name}"?`)) {
                      deleteCard(card.id);
                    }
                  }}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition-all"
                  title="Excluir cartão"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Card Name */}
              <div className="relative z-10 my-4">
                <h3 className="text-lg font-bold tracking-tight text-white drop-shadow-sm">
                  {card.name}
                </h3>
                <span className="text-xs text-slate-300/80 font-mono">
                  •••• •••• •••• 8821
                </span>
              </div>

              {/* Card Bottom Row: Limit & Dates */}
              <div className="pt-3 border-t border-white/10 relative z-10 flex items-end justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Limite do Cartão
                  </span>
                  <span className="text-lg font-bold font-mono text-white">
                    {formatCurrency(card.limit_amount || 0)}
                  </span>
                </div>

                <div className="text-right text-xs text-slate-300 space-y-0.5">
                  <div className="flex items-center justify-end gap-1 text-[11px]">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Fecha dia <strong>{card.closing_day}</strong></span>
                  </div>
                  <div className="text-[11px] text-emerald-300">
                    <span>Vence dia <strong>{card.due_day}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Credit Card Modal */}
      <CreditCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (data) => {
          await createCard(data);
        }}
      />
    </div>
  );
};
