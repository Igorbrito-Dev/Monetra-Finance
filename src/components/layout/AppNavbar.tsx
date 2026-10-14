import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { TelegramIntegrationModal } from '../telegram/TelegramIntegrationModal';
import { NotificationBell } from '../notifications/NotificationBell';
import {
  Home,
  Receipt,
  Wallet,
  CreditCard,
  Tag,
  BarChart3,
  MessageSquare,
  CalendarClock,
  FileText,
  MoreHorizontal,
  Plus,
  Bot,
  LogOut,
} from 'lucide-react';

export type ActiveTab =
  | 'overview'
  | 'transactions'
  | 'accounts'
  | 'cards'
  | 'categories'
  | 'reports'
  | 'assistant'
  | 'bills'
  | 'invoices'
  | 'more';

interface AppNavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenNewTransaction: () => void;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenNewTransaction,
}) => {
  const { user, profile, signOut } = useAuth();
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);

  const isTelegramLinked = Boolean(profile?.telegram_chat_id);

  // Desktop navigation items
  const desktopNavItems = [
    { id: 'overview' as const, label: 'Início', icon: Home },
    { id: 'transactions' as const, label: 'Extrato', icon: Receipt },
    { id: 'accounts' as const, label: 'Contas', icon: Wallet },
    { id: 'cards' as const, label: 'Cartões', icon: CreditCard },
    { id: 'categories' as const, label: 'Categorias', icon: Tag },
    { id: 'invoices' as const, label: 'Faturas', icon: FileText },
    { id: 'bills' as const, label: 'Contas fixas', icon: CalendarClock },
    { id: 'assistant' as const, label: 'Assistente', icon: MessageSquare },
    { id: 'reports' as const, label: 'Relatórios', icon: BarChart3 },
  ];

  const userInitial = profile?.full_name
    ? profile.full_name[0].toUpperCase()
    : user?.email
    ? user.email[0].toUpperCase()
    : 'U';

  return (
    <>
      {/* TOP DESKTOP & MOBILE HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 sm:px-6 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Desktop Nav */}
          <div className="flex items-center gap-6 lg:gap-8">
            <button
              onClick={() => onTabChange('overview')}
              className="flex items-center gap-2.5 cursor-pointer text-left focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-sm shadow-emerald-600/30 flex-shrink-0">
                M
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight">
                  Monetra <span className="text-emerald-600 font-medium">Finance</span>
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">
                  Gestão Pessoal
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/60">
              {desktopNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Desktop Right Actions (New Transaction + Telegram + User Profile) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Nova Transação Button (Desktop) */}
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenNewTransaction}
              className="hidden sm:inline-flex text-xs font-bold px-3.5 py-1.5 shadow-sm shadow-emerald-600/20"
            >
              <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" /> Nova transação
            </Button>

            {/* Sino de notificações */}
            <NotificationBell onNavigate={onTabChange} />

            {/* Telegram Bot Indicator / Modal Trigger */}
            <button
              onClick={() => setIsTelegramModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                isTelegramLinked
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Configurações do Bot do Telegram"
            >
              <Bot className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="hidden lg:inline">
                {isTelegramLinked ? 'Telegram Ativo' : 'Conectar Bot'}
              </span>
            </button>

            {/* User Profile Avatar */}
            <button
              onClick={() => onTabChange('more')}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/60 transition-all cursor-pointer"
              title="Menu e Perfil"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                {userInitial}
              </div>
              <span className="hidden md:block text-xs font-semibold text-slate-700 max-w-[100px] truncate text-left">
                {profile?.full_name || user?.email?.split('@')[0] || 'Igor'}
              </span>
            </button>

            {/* Logout Button (Desktop) */}
            <button
              onClick={signOut}
              title="Encerrar Sessão"
              className="hidden sm:flex items-center justify-center p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Faithful to the attached design reference) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-3 py-2 shadow-[0_-4px_16px_rgba(0,0,0,0.03)] safe-area-pb">
        <div className="flex items-center justify-around max-w-md mx-auto relative">
          {/* Tab 1: Início */}
          <button
            onClick={() => onTabChange('overview')}
            className={`flex flex-col items-center justify-center w-14 py-1 text-[10px] font-semibold transition-all cursor-pointer ${
              activeTab === 'overview' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5 stroke-[2.2]" />
            <span>Início</span>
          </button>

          {/* Tab 2: Extrato */}
          <button
            onClick={() => onTabChange('transactions')}
            className={`flex flex-col items-center justify-center w-14 py-1 text-[10px] font-semibold transition-all cursor-pointer ${
              activeTab === 'transactions' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Receipt className="w-5 h-5 mb-0.5 stroke-[2.2]" />
            <span>Extrato</span>
          </button>

          {/* CENTRAL FLOATING (+) BUTTON */}
          <div className="relative -top-4 flex items-center justify-center">
            <button
              onClick={onOpenNewTransaction}
              className="w-13 h-13 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 active:scale-95 transition-transform cursor-pointer border-4 border-white"
              title="Nova Transação"
              aria-label="Nova Transação"
            >
              <Plus className="w-7 h-7 stroke-[2.8]" />
            </button>
          </div>

          {/* Tab 3: Contas */}
          <button
            onClick={() => onTabChange('accounts')}
            className={`flex flex-col items-center justify-center w-14 py-1 text-[10px] font-semibold transition-all cursor-pointer ${
              activeTab === 'accounts' || activeTab === 'cards' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Wallet className="w-5 h-5 mb-0.5 stroke-[2.2]" />
            <span>Contas</span>
          </button>

          {/* Tab 4: Mais */}
          <button
            onClick={() => onTabChange('more')}
            className={`flex flex-col items-center justify-center w-14 py-1 text-[10px] font-semibold transition-all cursor-pointer ${
              activeTab === 'more' ||
              activeTab === 'reports' ||
              activeTab === 'categories' ||
              activeTab === 'assistant' ||
              activeTab === 'bills' ||
              activeTab === 'invoices'
                ? 'text-emerald-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5 stroke-[2.2]" />
            <span>Mais</span>
          </button>
        </div>
      </nav>

      {/* Modal de Integração com o Telegram */}
      <TelegramIntegrationModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
      />
    </>
  );
};
