-- Migration: saldo real das contas (calculado) e alerta de teto de gastos.
-- Apenas ADITIVA: cria uma view e amplia a lista de tipos de notificação.

-- =====================================================================
-- 1. Saldo calculado por conta
--    saldo = saldo inicial + receitas pagas - despesas pagas (transferências não entram)
--    security_invoker garante que o RLS das tabelas base continue valendo.
-- =====================================================================
CREATE OR REPLACE VIEW public.account_balances
WITH (security_invoker = true) AS
SELECT
    a.id AS account_id,
    a.user_id,
    a.initial_balance
      + COALESCE(SUM(
          CASE
            WHEN t.is_paid AND t.type = 'income'  THEN t.amount
            WHEN t.is_paid AND t.type = 'expense' THEN -t.amount
            ELSE 0
          END
        ), 0) AS balance
FROM public.accounts a
LEFT JOIN public.transactions t ON t.account_id = a.id
GROUP BY a.id, a.user_id, a.initial_balance;

-- =====================================================================
-- 2. Novo tipo de notificação: alerta de teto de gastos
-- =====================================================================
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('bill_due', 'bill_today', 'bill_overdue', 'card_invoice', 'daily_report', 'budget_alert'));
