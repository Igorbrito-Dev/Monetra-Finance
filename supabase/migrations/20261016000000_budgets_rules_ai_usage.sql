-- Migration: orçamento por categoria, regras de categorização aprendidas e controle de uso da IA.
-- Apenas ADITIVA e reexecutável (idempotente).

-- =====================================================================
-- 1. Orçamento mensal por categoria
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.category_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    monthly_limit NUMERIC(14, 2) NOT NULL CHECK (monthly_limit > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, category_id)
);

ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários gerenciam apenas seus próprios orçamentos por categoria" ON public.category_budgets;
CREATE POLICY "Usuários gerenciam apenas seus próprios orçamentos por categoria"
    ON public.category_budgets FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_category_budgets_updated_at ON public.category_budgets;
CREATE TRIGGER update_category_budgets_updated_at
    BEFORE UPDATE ON public.category_budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- 2. Regras de categorização aprendidas (palavra-chave -> categoria)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.category_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    hits INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, keyword)
);

ALTER TABLE public.category_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários gerenciam apenas suas próprias regras de categoria" ON public.category_rules;
CREATE POLICY "Usuários gerenciam apenas suas próprias regras de categoria"
    ON public.category_rules FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_category_rules_updated_at ON public.category_rules;
CREATE TRIGGER update_category_rules_updated_at
    BEFORE UPDATE ON public.category_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- 3. Uso de IA por usuário (limite diário de leitura de comprovantes)
--    Inserções são feitas pelo backend (service_role).
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('receipt')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários leem apenas o próprio uso de IA" ON public.ai_usage;
CREATE POLICY "Usuários leem apenas o próprio uso de IA"
    ON public.ai_usage FOR SELECT
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_kind_created
    ON public.ai_usage(user_id, kind, created_at DESC);

-- =====================================================================
-- 4. Novo tipo de notificação: orçamento de categoria
-- =====================================================================
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('bill_due', 'bill_today', 'bill_overdue', 'card_invoice', 'daily_report', 'budget_alert', 'category_budget'));
