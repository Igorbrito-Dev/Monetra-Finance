import React, { useState } from 'react';
import { useAccounts } from '../../hooks/useAccounts';
import { useCreditCards } from '../../hooks/useCreditCards';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../ui/Button';
import { AccountModal } from './AccountModal';
import { CreditCardModal } from '../cards/CreditCardModal';
import {
  Plus,
  Building2,
  CreditCard,
  Trash2,
  ChevronRight,
  Landmark,
} from 'lucide-react';

export const AccountList: React.FC = () => {
  const { accounts, loading: loadingAccounts, createAccount, deleteAccount } = useAccounts();
  const { cards, loading: loadingCards, createCard, deleteCard } = useCreditCards();

  const [activeFilter, setActiveFilter] = useState<'all' | 'accounts' | 'cards'>('all');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: 'account' | 'card'; item: any } | null>(null);

  const totalAccountBalance = accounts.reduce((acc, curr) => acc + (curr.current_balance || 0), 0);

  const getAccountIconBg = (index: number) => {
    const bgs = ['bg-blue-600', 'bg-purple-600', 'bg-cyan-600', 'bg-amber-600', 'bg-emerald-600'];
    return bgs[index % bgs.length];
  };

  const getAccountTypeName = (type: string) => {
    switch (type) {
      case 'checking':
        return 'Conta Corrente';
      case 'savings':
        return 'Poupança';
      case 'investment':
        return 'Investimentos';
      case 'cash':
        return 'Dinheiro em Espécie';
      default:
        return 'Conta Digital';
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-in fade-in duration-200">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Contas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Gerencie suas contas e cartões de crédito.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCardModalOpen(true)}
            className="text-xs font-semibold bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <CreditCard className="w-3.5 h-3.5 mr-1" /> Novo cartão
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAccountModalOpen(true)}
            className="text-xs font-bold shadow-xs shadow-emerald-600/20"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" /> Nova conta
          </Button>
        </div>
      </div>

      {/* 2. HERO CARD (Patrimônio Total - Matches Screen 3 of Reference) */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-5 sm:p-6 shadow-md shadow-emerald-700/15 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
            <Landmark className="w-6 h-6 stroke-[2.2]" />
          </div>

          <div>
            <span className="text-xs font-medium text-emerald-100/90 block">
              Patrimônio total
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white mt-0.5">
              {formatCurrency(totalAccountBalance)}
            </div>
          </div>
        </div>

        <ChevronRight className="w-6 h-6 text-emerald-200/80" />
      </div>

      {/* 3. FILTER PILLS: Todas | Contas | Cartões */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setActiveFilter('accounts')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeFilter === 'accounts'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Contas
        </button>
        <button
          onClick={() => setActiveFilter('cards')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeFilter === 'cards'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Cartões
        </button>
      </div>

      {/* 4. LIST OF ACCOUNTS & CARDS (Clean White Cards) */}
      <div className="space-y-3">
        {/* ACCOUNTS SECTION */}
        {(activeFilter === 'all' || activeFilter === 'accounts') && (
          <div className="space-y-2.5">
            {activeFilter === 'all' && accounts.length > 0 && (
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                Contas Bancárias ({accounts.length})
              </h2>
            )}

            {loadingAccounts ? (
              <div className="h-20 rounded-2xl bg-white border border-slate-100 animate-pulse" />
            ) : accounts.length === 0 && activeFilter === 'accounts' ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center shadow-xs">
                <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">Nenhuma conta cadastrada</h3>
                <p className="text-xs text-slate-500 mt-1 mb-3">Adicione sua primeira conta corrente ou carteira.</p>
                <Button variant="primary" size="sm" onClick={() => setIsAccountModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Conta
                </Button>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden">
                {accounts.map((acc, index) => (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedItem({ type: 'account', item: acc })}
                    className="flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-3">
                      {/* Colored Bank Icon Box */}
                      <div className={`w-11 h-11 rounded-2xl ${getAccountIconBg(index)} text-white flex items-center justify-center flex-shrink-0 shadow-xs`}>
                        <Landmark className="w-5 h-5 stroke-[2.2]" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-800 truncate">
                          {acc.name}
                        </h3>
                        <span className="text-xs text-slate-400 block mt-0.5 truncate">
                          {getAccountTypeName(acc.type)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm sm:text-base font-extrabold font-mono text-slate-900">
                        {formatCurrency(acc.current_balance || 0)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CREDIT CARDS SECTION */}
        {(activeFilter === 'all' || activeFilter === 'cards') && (
          <div className="space-y-2.5 pt-2">
            {activeFilter === 'all' && cards.length > 0 && (
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                Cartões de Crédito ({cards.length})
              </h2>
            )}

            {loadingCards ? (
              <div className="h-20 rounded-2xl bg-white border border-slate-100 animate-pulse" />
            ) : cards.length === 0 && activeFilter === 'cards' ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center shadow-xs">
                <CreditCard className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">Nenhum cartão cadastrado</h3>
                <p className="text-xs text-slate-500 mt-1 mb-3">Adicione seus cartões para acompanhar limites e faturas.</p>
                <Button variant="primary" size="sm" onClick={() => setIsCardModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Cartão
                </Button>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => setSelectedItem({ type: 'card', item: card })}
                    className="flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-3">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                        <CreditCard className="w-5 h-5 stroke-[2.2]" />
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
                        <span className="text-sm sm:text-base font-extrabold font-mono text-slate-900 block">
                          {formatCurrency(card.limit_amount || 0)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">Limite total</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* DETAILS / DELETE DRAWER */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {selectedItem.type === 'account' ? 'Detalhes da Conta' : 'Detalhes do Cartão'}
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Nome:</span>
                <span className="font-semibold text-slate-800">{selectedItem.item.name}</span>
              </div>
              {selectedItem.type === 'account' ? (
                <>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Tipo:</span>
                    <span className="font-semibold text-slate-800">{getAccountTypeName(selectedItem.item.type)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Saldo Atual:</span>
                    <span className="font-bold font-mono text-emerald-600">
                      {formatCurrency(selectedItem.item.current_balance || 0)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Limite Total:</span>
                    <span className="font-bold font-mono text-slate-900">
                      {formatCurrency(selectedItem.item.limit_amount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Dia de Fechamento:</span>
                    <span className="font-semibold text-slate-800">Dia {selectedItem.item.closing_day}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Dia de Vencimento:</span>
                    <span className="font-semibold text-slate-800">Dia {selectedItem.item.due_day}</span>
                  </div>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100">
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  if (confirm(`Tem certeza que deseja excluir "${selectedItem.item.name}"?`)) {
                    if (selectedItem.type === 'account') {
                      await deleteAccount(selectedItem.item.id);
                    } else {
                      await deleteCard(selectedItem.item.id);
                    }
                    setSelectedItem(null);
                  }
                }}
                className="w-full justify-center text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>Excluir {selectedItem.type === 'account' ? 'Conta' : 'Cartão'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modais */}
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
    </div>
  );
};
