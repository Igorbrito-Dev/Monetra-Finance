import React, { useState } from 'react';
import { useCreditCards } from '../../hooks/useCreditCards';
import { useCardUsage } from '../../hooks/useCardUsage';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../ui/Button';
import { CreditCardModal } from './CreditCardModal';
import { Plus, CreditCard as CardIcon, Trash2, ChevronRight } from 'lucide-react';

export const CreditCardList: React.FC = () => {
  const { cards, loading, createCard, deleteCard } = useCreditCards();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<typeof cards[0] | null>(null);

  const { usage } = useCardUsage();

  const totalLimit = cards.reduce((acc, curr) => acc + (curr.limit_amount || 0), 0);
  const totalUsed = cards.reduce((acc, curr) => acc + (usage.get(curr.id) ?? 0), 0);
  const totalAvailable = totalLimit - totalUsed;

  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-in fade-in duration-200">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Cartões de Crédito
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Acompanhe seus limites, faturas e datas de vencimento.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto justify-center text-xs font-bold shadow-xs shadow-emerald-600/20"
        >
          <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" /> Novo cartão
        </Button>
      </div>

      {/* 2. HERO CARD (Limite Disponível - Matches Screen 4 of Reference) */}
      <div className="rounded-3xl bg-emerald-800 text-white p-5 sm:p-6 shadow-md shadow-emerald-900/15 flex items-center justify-between relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-xs font-medium text-emerald-200/90 block mb-1">
            Limite disponível
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white mb-2">
            {formatCurrency(totalAvailable)}
          </div>
          <span className="text-xs text-emerald-300/80">
            Em uso {formatCurrency(totalUsed)} • Limite total {formatCurrency(totalLimit)}
          </span>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-sm relative z-10">
          <CardIcon className="w-6 h-6 stroke-[2.2]" />
        </div>
      </div>

      {/* 3. CARDS LIST */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-white border border-slate-100 animate-pulse shadow-xs" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <CardIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Nenhum cartão cadastrado
          </h3>
          <p className="text-xs text-slate-500 mt-1 mb-4 max-w-xs mx-auto">
            Adicione seus cartões para acompanhar compras parceladas e vencimentos de fatura.
          </p>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Cartão
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden">
          {cards.map((card) => (
            <div
              key={card.id}
              onClick={() => setSelectedCard(card)}
              className="flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0 pr-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-xs"
                  style={{ backgroundColor: card.color || '#4f46e5' }}
                >
                  <CardIcon className="w-5 h-5 stroke-[2.2]" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800 truncate">
                    {card.name}
                  </h3>
                  <span className="text-xs text-slate-400 block mt-0.5 truncate">
                    Fatura dia {card.due_day} • Fecha dia {card.closing_day}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <span className="text-sm sm:text-base font-extrabold font-mono text-slate-900 block leading-tight">
                    {formatCurrency((card.limit_amount || 0) - (usage.get(card.id) ?? 0))}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Disponível de {formatCurrency(card.limit_amount || 0)}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CARD DETAILS / DELETE MODAL */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Detalhes do Cartão
              </h3>
              <button
                onClick={() => setSelectedCard(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Nome:</span>
                <span className="font-semibold text-slate-800">{selectedCard.name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Limite Total:</span>
                <span className="font-bold font-mono text-slate-900">
                  {formatCurrency(selectedCard.limit_amount || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Dia de Fechamento:</span>
                <span className="font-semibold text-slate-800">Dia {selectedCard.closing_day}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Dia de Vencimento:</span>
                <span className="font-semibold text-slate-800">Dia {selectedCard.due_day}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  if (confirm(`Tem certeza que deseja excluir o cartão "${selectedCard.name}"?`)) {
                    await deleteCard(selectedCard.id);
                    setSelectedCard(null);
                  }
                }}
                className="w-full justify-center text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>Excluir Cartão</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação */}
      <CreditCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (cardData) => {
          await createCard(cardData);
        }}
      />
    </div>
  );
};
