import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { AppNotification } from '../types/database';

const POLL_INTERVAL_MS = 60_000;

/**
 * Notificações do app (sino): lembretes de contas/faturas e relatório diário gerados pelo cron.
 */
export function useNotifications() {
  const { user, isDemoMode } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (isDemoMode || !user) {
      setNotifications([]);
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (!error && data) setNotifications(data as AppNotification[]);
  }, [user, isDemoMode]);

  useEffect(() => {
    fetchNotifications();
    if (isDemoMode || !user) return;

    const timer = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications, isDemoMode, user]);

  const markAsRead = async (id: string) => {
    const readAt = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? readAt } : n)));
    await supabase.from('notifications').update({ read_at: readAt }).eq('id', id);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const readAt = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? readAt })));
    await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('user_id', user.id)
      .is('read_at', null);
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return { notifications, unreadCount, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
