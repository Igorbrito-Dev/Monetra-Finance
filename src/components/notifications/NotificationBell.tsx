import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import type { ActiveTab } from '../layout/AppNavbar';

interface NotificationBellProps {
  onNavigate: (tab: ActiveTab) => void;
}

const VALID_TABS: ActiveTab[] = [
  'overview', 'transactions', 'accounts', 'cards', 'categories', 'reports', 'assistant', 'bills', 'more',
];

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
        title="Notificações"
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-96 max-h-[70vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white">
            <span className="text-sm font-bold text-slate-900">Notificações</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8 px-4">
              Nenhuma notificação por enquanto. Avisos de contas e faturas aparecem aqui.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      markAsRead(n.id);
                      const tab = VALID_TABS.find((t) => t === n.link_tab);
                      if (tab) onNavigate(tab);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                      n.read_at ? '' : 'bg-emerald-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800">{n.title}</span>
                      {!n.read_at && <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-line break-words">{n.body}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">{formatWhen(n.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
