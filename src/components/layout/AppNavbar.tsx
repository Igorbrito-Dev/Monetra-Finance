import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { TelegramIntegrationModal } from '../telegram/TelegramIntegrationModal';
import {
  LayoutDashboard,
  ReceiptText,
  Building2,
  CreditCard,
  Tag,
  LogOut,
  User,
  Bot,
} from 'lucide-react';

export type ActiveTab = 'overview' | 'transactions' | 'accounts' | 'cards' | 'categories';

interface AppNavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { user, profile, signOut, isDemoMode } = useAuth();
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);

  const isTelegramLinked = Boolean(profile?.telegram_chat_id);

  const navItems = [
    { id: 'overview', label: 'Visão Geral', shortLabel: 'Início', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transações', shortLabel: 'Extrato', icon: ReceiptText },
    { id: 'accounts', label: 'Contas', shortLabel: 'Contas', icon: Building2 },
    { id: 'cards', label: 'Cartões', shortLabel: 'Cartões', icon: CreditCard },
    { id: 'categories', label: 'Categorias', shortLabel: 'Categorias', icon: Tag },
  ] as const;

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-4 sm:px-6 py-2.5 sm:py-3 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo & Desktop Nav */}
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer" onClick={() => onTabChange('overview')}>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black text-base sm:text-lg flex-shrink-0">
                M
              </div>
              <div>
                <span className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1">
                  Monetra <span className="text-emerald-400 font-medium">Finance</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 block -mt-1 font-mono hidden xs:block">
                  Multi-Tenant Serverless
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links (hidden on mobile, visible on md+) */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Controls & Telegram Bot Action */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Telegram Bot Button */}
            <button
              onClick={() => setIsTelegramModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                isTelegramLinked
                  ? 'bg-teal-500/10 text-teal-300 border-teal-500/30 hover:bg-teal-500/20'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
              title="Configurar Bot do Telegram, Áudios Whisper & IA"
            >
              <Bot className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span className="hidden sm:inline">
                {isTelegramLinked ? 'Telegram Conectado' : 'Telegram Bot'}
              </span>
              <span className="sm:hidden text-[11px] font-bold">
                {isTelegramLinked ? 'Bot Conectado' : 'Bot'}
              </span>
            </button>

            {isDemoMode && (
              <Badge variant="amber" className="text-[10px] hidden sm:inline-flex">
                Demo
              </Badge>
            )}

            {/* User Profile Avatar */}
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {profile?.full_name ? profile.full_name[0].toUpperCase() : <User className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left hidden lg:block">
                <span className="font-semibold text-slate-200 block leading-tight max-w-[120px] truncate">
                  {profile?.full_name || user?.email?.split('@')[0] || 'Usuário'}
                </span>
              </div>
            </div>

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              title="Encerrar Sessão"
              className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 p-2 sm:px-3"
            >
              <LogOut className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline text-xs">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Fixed at the bottom of smartphone screens) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/80 px-2 py-1.5 shadow-2xl safe-area-pb">
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 mb-0.5 transition-transform ${isActive ? 'scale-110 text-emerald-400' : ''}`} />
                <span className="truncate max-w-[55px] text-center leading-tight">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
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
