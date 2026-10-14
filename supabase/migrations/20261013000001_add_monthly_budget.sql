-- Migration: Adicionar teto de gastos mensal ao perfil do usuário
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_budget NUMERIC(14,2) DEFAULT NULL;

COMMENT ON COLUMN profiles.monthly_budget IS 'Limite/teto de gastos mensal definido pelo usuário para alertas de orçamento e controle financeiro';
