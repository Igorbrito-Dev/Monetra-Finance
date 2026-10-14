import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCategories } from '../../hooks/useCategories';
import { useAccounts } from '../../hooks/useAccounts';
import { useCreditCards } from '../../hooks/useCreditCards';
import { useTransactions } from '../../hooks/useTransactions';
import { TelegramIntegrationModal } from '../telegram/TelegramIntegrationModal';
import { ImportModal } from '../import/ImportModal';
import { NotificationSettings } from './NotificationSettings';
import {
  Target,
  Bot,
  Upload,
  BarChart3,
  Tag,
  LogOut,
  ChevronRight,
  Shield,
  CheckCircle2,
  MessageSquare,
  CalendarClock,
  FileText,
  PiggyBank,
} from 'lucide-react';

interface MoreViewProps {
  onNavigateToTab: (
    tab: 'overview' | 'transactions' | 'accounts' | 'cards' | 'categories' | 'reports' | 'assistant' | 'bills' | 'invoices' | 'planning'
  ) => void;
}

export const MoreView: React.FC<MoreViewProps> = ({ onNavigateToTab }) => {
  const { user, profile, signOut, isDemoMode } = useAuth();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const { cards } = useCreditCards();
  const { refetch } = useTransactions();

  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fullName = profile?.full_name || 'Igor Brito';
  const email = user?.email || 'igorbrito@gmail.com';
  const userInitial = fullName ? fullName[0].toUpperCase() : 'I';
  const isTelegramLinked = Boolean(profile?.telegram_chat_id);

  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-in fade-in duration-200">
      
      {/* 1. HEADER */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Mais
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Ajustes, conexões, ferramentas e perfil.
        </p>
      </div>

      {/* 2. USER PROFILE HERO CARD (Matches Screen 8 of Reference) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-xs flex-shrink-0">
            {userInitial}
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              {fullName}
            </h2>
            <span className="text-xs text-slate-400 block mt-0.5">
              {email}
            </span>
            {isDemoMode && (
              <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full mt-1.5 border border-amber-200">
                Modo Demonstração
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-slate-300" />
      </div>

      {/* Preferências de notificação */}
      <NotificationSettings />

      {/* 3. MENU ITEMS LIST (Matches Screen 8 of Reference) */}
      <div className="bg-white border border-slate-100 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden">
        {/* Item: Assistente IA (chat) */}
        <button
          onClick={() => onNavigateToTab('assistant')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 block">Assistente IA</span>
              <span className="text-xs text-slate-400 block">
                Registre gastos conversando, com memória e parcelas no cartão
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Item: Planejar */}
        <button
          onClick={() => onNavigateToTab('planning')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <PiggyBank className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 block">Planejar</span>
              <span className="text-xs text-slate-400 block">
                Quanto posso gastar hoje, previsão do mês e orçamentos
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Item: Faturas dos cartões */}
        <button
          onClick={() => onNavigateToTab('invoices')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 block">Faturas</span>
              <span className="text-xs text-slate-400 block">
                Veja cada fatura por cartão e registre o pagamento
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Item: Contas fixas */}
        <button
          onClick={() => onNavigateToTab('bills')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0">
              <CalendarClock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 block">Contas fixas</span>
              <span className="text-xs text-slate-400 block">
                Receitas e despesas mensais com lembrete de vencimento
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Item 1: Metas Financeiras (Teto Orçamentário) */}
        <button
          onClick={() => onNavigateToTab('overview')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 block">
                Metas financeiras
              </span>
              <span className="text-xs text-slate-400 block">
                Defina seus objetivos e teto de gastos mensal
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Item 2: Telegram Bot & Áudio Whisper */}
        <button
          onClick={() => setIsTelegramModalOpen(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800 block">
                  Telegram & Assistente IA
                </span>
                {isTelegramLinked && (
                  <span className="px-2 py-0.2 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                    Conectado
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 block">
                Vincule seu Telegram com código numérico ou deep link
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Item 3: Importação de Extrato (CSV / OFX) */}
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 block">
                Importar extrato
              </span>
              <span className="text-xs text-slate-400 block">
                Planilhas CSV e extratos com prevenção de duplicidades
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Item 4: Relatórios & Gráficos */}
        <button
          onClick={() => onNavigateToTab('reports')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 block">
                Relatórios e evolução
              </span>
              <span className="text-xs text-slate-400 block">
                Gráficos de receitas, despesas e categorias
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Item 5: Categorias */}
        <button
          onClick={() => onNavigateToTab('categories')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Tag className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 block">
                Categorias
              </span>
              <span className="text-xs text-slate-400 block">
                Gerencie rótulos para classificação de despesas e receitas
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Item 6: Ajuda & Segurança */}
        <div className="w-full flex items-center justify-between p-4 text-left">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 block">
                Segurança & Arquitetura
              </span>
              <span className="text-xs text-slate-400 block">
                Supabase RLS com isolamento por usuário • 100% Serverless
              </span>
            </div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>

        {/* Item 7: Sair */}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-between p-4 hover:bg-rose-50/50 transition-colors cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-rose-600 block">
                Sair
              </span>
              <span className="text-xs text-slate-400 block">
                Encerrar sessão no dispositivo
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-300 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>

      {/* Modais */}
      <TelegramIntegrationModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        categories={categories}
        accounts={accounts}
        cards={cards}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
