import React, { useState } from 'react';
import { useAccounts } from '../../hooks/useAccounts';
import { formatCurrency } from '../../lib/utils';
import { Card, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { AccountModal } from './AccountModal';
import { Plus, Wallet, Trash2, TrendingUp, Building2, Banknote, Landmark } from 'lucide-react';

export const AccountList: React.FC = () => {
  const { accounts, loading, createAccount, deleteAccount } = useAccounts();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalBalance = accounts.reduce((acc, curr) => acc + (curr.current_balance || 0), 0);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return <Landmark className="w-5 h-5" />;
      case 'investment':
        return <TrendingUp className="w-5 h-5" />;
      case 'cash':
        return <Banknote className="w-5 h-5" />;
      default:
        return <Wallet className="w-5 h-5" />;
    }
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
        return 'Conta';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Total */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-400" />
            Contas & Carteiras
          </h2>
          <p className="text-sm text-slate-400">
            Gerencie suas contas bancárias, corretoras e reservas.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full sm:w-auto">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex sm:block items-center justify-between">
            <span className="text-xs text-slate-400 sm:block">Patrimônio em Contas:</span>
            <span className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
              {formatCurrency(totalBalance)}
            </span>
          </div>

          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto justify-center text-xs font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nova Conta
          </Button>
        </div>
      </div>

      {/* Account Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card className="text-center py-12 border-dashed border-slate-800">
          <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <CardTitle className="text-slate-300">Nenhuma conta cadastrada</CardTitle>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Adicione sua primeira conta bancária ou carteira para começar a registrar transações.
          </p>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Adicionar Primeira Conta
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {accounts.map((account) => (
            <Card
              key={account.id}
              className="flex flex-col justify-between group hover:border-emerald-500/30 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
                      style={{ backgroundColor: account.color || '#3B82F6' }}
                    >
                      {getAccountIcon(account.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        {account.name}
                      </h4>
                      <span className="text-xs text-slate-400">
                        {getAccountTypeName(account.type)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Deseja remover a conta "${account.name}"?`)) {
                        deleteAccount(account.id);
                      }
                    }}
                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                    title="Excluir conta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/80">
                  <span className="text-xs text-slate-500 block mb-0.5">Saldo Disponível</span>
                  <div className="text-2xl font-bold tracking-tight text-white font-mono">
                    {formatCurrency(account.current_balance || 0)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Account Modal */}
      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (data) => {
          await createAccount(data);
        }}
      />
    </div>
  );
};
