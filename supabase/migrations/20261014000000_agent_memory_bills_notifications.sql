-- Migration: memória do agente, contas fixas recorrentes, notificações e preferências de lembretes.
-- Apenas ADITIVA: não remove nem altera dados existentes.
-- Reexecutável (idempotente): pode ser rodada novamente sem erro.

-- =====================================================================
-- 1. Memória de conversa do agente (Telegram e chat web)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('telegram', 'web')),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários leem apenas suas próprias mensagens do agente" ON public.agent_messages;
CREATE POLICY "Usuários leem apenas suas próprias mensagens do agente"
    ON public.agent_messages FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários removem apenas suas próprias mensagens do agente" ON public.agent_messages;
CREATE POLICY "Usuários removem apenas suas próprias mensagens do agente"
    ON public.agent_messages FOR DELETE
    USING (auth.uid() = user_id);

-- Inserções são feitas pelo backend (service_role), que ignora RLS.
CREATE INDEX IF NOT EXISTS idx_agent_messages_user_channel
    ON public.agent_messages(user_id, channel, created_at DESC);

-- =====================================================================
-- 2. Receitas e despesas fixas mensais
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.recurring_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    description TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    day_of_month INT NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
    payment_method TEXT NOT NULL DEFAULT 'other'
        CHECK (payment_method IN ('pix', 'credit', 'debit', 'cash', 'transfer', 'boleto', 'other')),
    notes TEXT,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários gerenciam apenas suas próprias contas fixas" ON public.recurring_bills;
CREATE POLICY "Usuários gerenciam apenas suas próprias contas fixas"
    ON public.recurring_bills FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_recurring_bills_user ON public.recurring_bills(user_id, active);

DROP TRIGGER IF EXISTS update_recurring_bills_updated_at ON public.recurring_bills;
CREATE TRIGGER update_recurring_bills_updated_at
    BEFORE UPDATE ON public.recurring_bills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ocorrências mensais: cada conta fixa gera uma transação por vencimento (idempotente).
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS recurring_bill_id UUID REFERENCES public.recurring_bills(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_recurring_occurrence
    ON public.transactions(recurring_bill_id, due_date)
    WHERE recurring_bill_id IS NOT NULL;

-- =====================================================================
-- 3. Preferências de notificação no perfil
-- =====================================================================
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS daily_report_enabled BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS daily_report_hour INT NOT NULL DEFAULT 20
        CHECK (daily_report_hour BETWEEN 0 AND 23),
    ADD COLUMN IF NOT EXISTS bill_reminder_days INT NOT NULL DEFAULT 1
        CHECK (bill_reminder_days BETWEEN 0 AND 30),
    ADD COLUMN IF NOT EXISTS card_reminder_days INT NOT NULL DEFAULT 2
        CHECK (card_reminder_days BETWEEN 0 AND 30);

-- =====================================================================
-- 4. Notificações (sino no app + espelho no Telegram)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('bill_due', 'bill_today', 'bill_overdue', 'card_invoice', 'daily_report')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link_tab TEXT,
    dedupe_key TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    telegram_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, dedupe_key)
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários leem apenas suas próprias notificações" ON public.notifications;
CREATE POLICY "Usuários leem apenas suas próprias notificações"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários atualizam apenas suas próprias notificações" ON public.notifications;
CREATE POLICY "Usuários atualizam apenas suas próprias notificações"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON public.notifications(user_id, created_at DESC);
