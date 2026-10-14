import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { AppNavbar, type ActiveTab } from './components/layout/AppNavbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionList } from './components/transactions/TransactionList';
import { AccountList } from './components/accounts/AccountList';
import { CreditCardList } from './components/cards/CreditCardList';
import { CategoryList } from './components/categories/CategoryList';
import { ReportsView } from './components/dashboard/ReportsView';
import { MoreView } from './components/more/MoreView';
import { TransactionModal } from './components/transactions/TransactionModal';
import { useCategories } from './hooks/useCategories';
import { useAccounts } from './hooks/useAccounts';
import { useCreditCards } from './hooks/useCreditCards';
import { useTransactions } from './hooks/useTransactions';

const DashboardContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isGlobalTxModalOpen, setIsGlobalTxModalOpen] = useState(false);

  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const { cards } = useCreditCards();
  const { createTransaction } = useTransactions();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col relative selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* Top Navbar */}
      <AppNavbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNewTransaction={() => setIsGlobalTxModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-28 md:py-8 w-full relative z-10">
        {activeTab === 'overview' && (
          <DashboardView
            onNavigateToTab={setActiveTab}
            onOpenNewTransaction={() => setIsGlobalTxModalOpen(true)}
          />
        )}

        {activeTab === 'transactions' && (
          <div className="animate-in fade-in duration-200">
            <TransactionList />
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="animate-in fade-in duration-200">
            <AccountList />
          </div>
        )}

        {activeTab === 'cards' && (
          <div className="animate-in fade-in duration-200">
            <CreditCardList />
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="animate-in fade-in duration-200">
            <CategoryList />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="animate-in fade-in duration-200">
            <ReportsView />
          </div>
        )}

        {activeTab === 'more' && (
          <div className="animate-in fade-in duration-200">
            <MoreView onNavigateToTab={setActiveTab} />
          </div>
        )}
      </main>

      {/* Global Quick Transaction Modal triggered by central (+) button on mobile or header */}
      <TransactionModal
        isOpen={isGlobalTxModalOpen}
        onClose={() => setIsGlobalTxModalOpen(false)}
        onSubmit={async (formData) => {
          await createTransaction(formData);
        }}
        categories={categories}
        accounts={accounts}
        cards={cards}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-100 py-6 px-6 text-center text-xs text-slate-400 hidden md:block">
        <p>Monetra Finance © 2026 — Gestão Financeira Pessoal com IA</p>
      </footer>
    </div>
  );
};

const AppRoot: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-600/30 animate-pulse">
            M
          </div>
          <span className="text-xs font-semibold text-slate-400">Carregando Monetra Finance...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <DashboardContent />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
};

export default App;
