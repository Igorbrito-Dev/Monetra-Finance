# PROJECT.md — Monetra Finance

## 1. Visão Geral
**Monetra Finance** é um sistema moderno de gestão financeira pessoal e multi-inquilino, projetado para operar com custo zero ou o menor custo possível. O ecossistema é composto por duas interfaces integradas:
1. **Aplicação Web (SPA):** Dashboard analítico, relatórios, cadastros manuais, gestão de categorias, contas, cartões e importação inteligente de arquivos (extratos, faturas e CSV).
2. **Bot do Telegram:** Registro ágil de transações em linguagem natural e consultas rápidas (saldo, gastos do mês, limites de fatura) via webhooks serverless.

## 2. Princípios de Arquitetura e Hospedagem (Zero-VPS)
- **Hospedagem Frontend & Serverless:** Vercel (SPA Vite + React + TypeScript + Tailwind CSS + shadcn/ui; endpoints serverless em `/api`).
- **Motor de Inteligência Artificial:** LangChain (`@langchain/openai`, `@langchain/core`) rodando em Vercel Functions para processamento de linguagem natural, function calling / tools para registro financeiro no Telegram, auto-categorização de importações e insights analíticos.
- **Banco de Dados & Autenticação:** Supabase PostgreSQL com **Row Level Security (RLS)** estrito em todas as tabelas.
- **Telegram Webhook:** Webhook Serverless seguro na Vercel integrado ao agente LangChain, validando tokens secretos e deduplicando mensagens (`update_id`).
- **Armazenamento:** Supabase Storage para retenção temporária/auditoria de lotes de importação se necessário.
- **Restrição Crucial:** Nenhuma dependência de VPS, Docker persistente, daemons contínuos ou computador local ligado.

## 3. Segurança e Multi-Inquilino (Multi-Tenant)
- **Isolamento de Dados:** Cada usuário possui seu `user_id` vinculado via Supabase Auth. Políticas RLS garantem que nenhum usuário acesse dados de terceiros (`auth.uid() = user_id`).
- **Vínculo do Telegram:** Pareamento seguro via código efêmero gerado na web (`/vincular <token>` ou deep link `/start <token>`), persistindo a associação `telegram_chat_id <-> user_id`.
- **Segurança de Chaves e Credenciais:** Nenhuma chave `service_role`, token de bot do Telegram ou `OPENAI_API_KEY` no frontend. Acesso direto do cliente apenas via chave anônima pública do Supabase com RLS. Segredos residem exclusivamente nas variáveis de ambiente seguras da Vercel (`.env`).

## 4. Diretrizes Financeiras Essenciais
- **Precisão Decimal:** Uso de tipos `NUMERIC(14,2)` no banco de dados. Nunca usar float binário em cálculos monetários.
- **Prevenção de Dupla Contagem (Cartão de Crédito):** Distinção clara entre *compras na fatura* (despesas efetivas de consumo) e *pagamento da fatura* (transferência de saldo bancário para liquidação do passivo).
- **Compromissos Futuros:** Parcelas e despesas recorrentes futuras modeladas separadamente para não inflar despesas já liquidadas no mês corrente.
- **Auditoria de Importações:** Lotes de importação identificados, com pré-visualização, cálculo de hash para deduplicação e confirmação obrigatória antes da persistência.
