import React, { useEffect, useState } from 'react';
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
import { AgentChatView } from './components/chat/AgentChatView';
import { RecurringBillsView } from './components/recurring/RecurringBillsView';
import { InvoicesView } from './components/invoices/InvoicesView';
import { PlanningView } from './components/planning/PlanningView';
import { QuickAddSheet, type QuickAddPayload } from './components/transactions/QuickAddSheet';
import { useInsightsData } from './hooks/useInsightsData';
import { useCategoryRules } from './hooks/useCategoryRules';
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
  const { createTransaction, deleteTransaction } = useTransactions();
  const { transactions: history, refetch: refetchHistory } = useInsightsData();
  const { rules, learn } = useCategoryRules();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; warning?: string; ids: string[] } | null>(null);

  // O aviso de lançamento some sozinho
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.warning ? 12000 : 7000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleQuickSubmit = async (payload: QuickAddPayload) => {
    const { data, error } = await createTransaction(payload);
    if (error) {
      return { ids: [] as string[], error: error as Error };
    }
    const ids = ((data as { id: string }[] | null) ?? []).map((row) => row.id);
    return { ids, error: null };
  };

  const handleUndo = async () => {
    if (!toast) return;
    for (const id of toast.ids) {
      await deleteTransaction(id);
    }
    setToast(null);
    refetchHistory();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col relative selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* Top Navbar */}
      <AppNavbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNewTransaction={() => setIsQuickAddOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-28 md:py-8 w-full relative z-10">
        {activeTab === 'overview' && (
          <DashboardView
            onNavigateToTab={setActiveTab}
            onOpenNewTransaction={() => setIsQuickAddOpen(true)}
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

        {activeTab === 'assistant' && (
          <div className="animate-in fade-in duration-200">
            <AgentChatView />
          </div>
        )}

        {activeTab === 'planning' && (
          <div className="animate-in fade-in duration-200">
            <PlanningView />
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="animate-in fade-in duration-200">
            <InvoicesView />
          </div>
        )}

        {activeTab === 'bills' && (
          <div className="animate-in fade-in duration-200">
            <RecurringBillsView />
          </div>
        )}

        {activeTab === 'more' && (
          <div className="animate-in fade-in duration-200">
            <MoreView onNavigateToTab={setActiveTab} />
          </div>
        )}
      </main>

      {/* Lançamento rápido (botão central +) */}
      <QuickAddSheet
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onMoreDetails={() => {
          setIsQuickAddOpen(false);
          setIsGlobalTxModalOpen(true);
        }}
        history={history}
        categories={categories}
        accounts={accounts}
        cards={cards}
        rules={rules}
        onSubmit={handleQuickSubmit}
        onLearn={learn}
        onSaved={(info) => {
          setToast(info);
          refetchHistory();
        }}
      />

      {/* Aviso de lançamento com opção de desfazer */}
      {toast && (
        <div className="fixed left-3 right-3 bottom-24 md:bottom-6 md:left-auto md:right-6 md:w-96 z-[60]">
          <div role="status" className="bg-slate-900 text-white rounded-2xl shadow-xl px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">{toast.message}</span>
              <button
                onClick={handleUndo}
                className="text-emerald-300 hover:text-emerald-200 font-bold text-xs uppercase tracking-wide cursor-pointer"
              >
                Desfazer
              </button>
            </div>
            {toast.warning && <p className="text-amber-300 text-xs mt-1.5">{toast.warning}</p>}
          </div>
        </div>
      )}

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
