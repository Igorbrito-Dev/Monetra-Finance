import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { AppNavbar, type ActiveTab } from './components/layout/AppNavbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionList } from './components/transactions/TransactionList';
import { AccountList } from './components/accounts/AccountList';
import { CreditCardList } from './components/cards/CreditCardList';
import { CategoryList } from './components/categories/CategoryList';

const DashboardContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <AppNavbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 pt-4 pb-28 md:py-8 w-full relative z-10 space-y-6 sm:space-y-8">
        {activeTab === 'overview' && (
          <DashboardView onNavigateToTab={setActiveTab} />
        )}

        {activeTab === 'transactions' && (
          <div className="animate-in fade-in duration-300">
            <TransactionList />
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="animate-in fade-in duration-300">
            <AccountList />
          </div>
        )}

        {activeTab === 'cards' && (
          <div className="animate-in fade-in duration-300">
            <CreditCardList />
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="animate-in fade-in duration-300">
            <CategoryList />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-6 px-6 text-center text-xs text-slate-500">
        <p>Monetra Finance © 2026 — Arquitetura Serverless & IA LangChain</p>
      </footer>
    </div>
  );
};

const AppRoot: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center animate-spin text-white font-bold">
            M
          </div>
          <span className="text-xs text-slate-400">Carregando Monetra Finance...</span>
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
