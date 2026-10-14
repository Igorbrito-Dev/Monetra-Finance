# DEPLOYMENT.md — Guia de Deploy em Produção (Zero-VPS)

Este guia orienta passo a passo a publicação do **Monetra Finance** em ambiente de produção utilizando a arquitetura **Zero-VPS / 100% Serverless**, garantindo custo zero e sem necessidade de manter servidores dedicados ou computadores ligados 24 horas por dia.

---

## 1. Visão Geral da Infraestrutura

- **Frontend & Serverless Functions:** [Vercel](https://vercel.com) (Plano Hobby Gratuito)
  - Aplicação SPA construída com Vite + React 19 + TypeScript + Tailwind CSS.
  - Endpoints de backend e Webhook do Telegram em `/api/telegram/webhook.ts` executando como Vercel Functions.
- **Banco de Dados & Autenticação:** [Supabase](https://supabase.com) (Plano Free)
  - PostgreSQL com Row Level Security (RLS) estrito em todas as tabelas.
  - Supabase Auth para controle de acesso multi-inquilino.
- **Inteligência Artificial & Áudio:**
  - LangChain + OpenAI API (`gpt-4o-mini` para comandos e ferramentas).
  - OpenAI Whisper (`whisper-1`) para transcrição direta de mensagens de voz e áudios enviados no Telegram.

---

## 2. Passo 1: Configurar o Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e inicie um novo projeto.
2. Acesse a aba **SQL Editor** no painel do Supabase.
3. Execute o conteúdo das migrações na ordem:
   - `supabase/migrations/20261013000000_initial_schema.sql` (Criação de tabelas, índices, triggers e políticas RLS).
   - `supabase/migrations/20261013000001_add_monthly_budget.sql` (Adiciona coluna de teto orçamentário).
4. No menu lateral do Supabase, acesse **Project Settings $\rightarrow$ API** e guarde:
   - **Project URL:** `https://xxxxxxxxxxxx.supabase.co`
   - **anon public:** `eyJhbGciOiJI...`
   - **service_role (secret):** `eyJhbGciOiJI...` (⚠️ Mantenha privado, nunca exponha no frontend).

---

## 3. Passo 2: Configurar o Repositório no GitHub

1. Faça o commit e push de todo o código para o seu repositório GitHub.
2. Certifique-se de que o arquivo `.gitignore` esteja protegendo `.env`, `node_modules` e `.vercel`.

---

## 4. Passo 3: Deploy na Vercel

1. Acesse [vercel.com](https://vercel.com) e clique em **Add New $\rightarrow$ Project**.
2. Conecte sua conta do GitHub e selecione o repositório **Monetra Finance**.
3. Em **Framework Preset**, a Vercel detectará automaticamente **Vite**.
4. Expanda a seção **Environment Variables** e preencha as variáveis de ambiente:

| Variável | Descrição | Onde Obter |
|---|---|---|
| `VITE_SUPABASE_URL` | URL pública da API do Supabase | Supabase $\rightarrow$ Settings $\rightarrow$ API |
| `VITE_SUPABASE_ANON_KEY` | Chave pública anônima do Supabase | Supabase $\rightarrow$ Settings $\rightarrow$ API |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta de serviço (apenas serverless) | Supabase $\rightarrow$ Settings $\rightarrow$ API |
| `OPENAI_API_KEY` | Chave de API da OpenAI (GPT-4o-mini + Whisper) | [platform.openai.com](https://platform.openai.com) |
| `TELEGRAM_BOT_TOKEN` | Token do Bot gerado pelo BotFather | Telegram `@BotFather` |
| `TELEGRAM_WEBHOOK_SECRET` | String aleatória para validar chamadas do Telegram | Crie uma senha segura (ex: `sec_monetra_99x1`) |
| `VITE_TELEGRAM_BOT_USERNAME` | Username do seu bot sem o `@` | Telegram `@BotFather` (ex: `MonetraBot`) |
| `CRON_SECRET` | Segredo que autoriza o agendador a chamar `/api/cron/tick` | Gere uma string longa e aleatória (ex: `openssl rand -hex 32`) |

5. Clique em **Deploy**. A Vercel criará o build de produção e disponibilizará sua URL pública (ex: `https://monetra-finance.vercel.app`).

---

## 5. Passo 4: Conectar o Webhook do Telegram

Após a Vercel concluir a publicação:
1. Abra seu navegador ou terminal (curl/Postman).
2. Execute a chamada para registrar o webhook oficial da Telegram Bot API:
   ```bash
   curl -F "url=https://seu-app.vercel.app/api/telegram/webhook" \
        -F "secret_token=seu-segredo-aleatorio-configurado" \
        https://api.telegram.org/bot<SEU_TELEGRAM_BOT_TOKEN>/setWebhook
   ```
3. A resposta esperada será:
   ```json
   {"ok": true, "result": true, "description": "Webhook was set"}
   ```

Para instruções detalhadas de configuração do Bot, consulte [TELEGRAM_SETUP.md](file:///d:/desenvolvimento%20de%20projetos/Monetra%20Finance/docs/TELEGRAM_SETUP.md).

---

## 5.1 Passo 5: Migration de memória, contas fixas e notificações

Aplique manualmente no **SQL Editor** do Supabase (a migration é apenas aditiva, não remove dados):

`supabase/migrations/20261014000000_agent_memory_bills_notifications.sql`

Ela cria `agent_messages` (memória do agente), `recurring_bills` (receitas/despesas fixas), `notifications` (sino do app),
a coluna `transactions.recurring_bill_id` e as preferências de lembrete em `profiles`
(`daily_report_enabled`, `daily_report_hour`, `bill_reminder_days`, `card_reminder_days`).

## 5.2 Passo 6: Agendador de lembretes e relatório diário (Supabase pg_cron)

O endpoint `POST /api/cron/tick` roda **de hora em hora**: gera as ocorrências das contas fixas, cria os lembretes
(contas e faturas de cartão), o relatório diário no horário configurado por cada usuário e envia o que estiver pendente ao Telegram.
O endpoint exige o header `x-cron-secret` igual à variável `CRON_SECRET`.

No **SQL Editor** do Supabase (substitua a URL e o segredo; o segredo fica no Vault, não em arquivos do repositório):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- guarda o segredo no Vault do Supabase
select vault.create_secret('<MESMO_VALOR_DE_CRON_SECRET>', 'monetra_cron_secret');

select cron.schedule(
  'monetra-tick',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://seu-app.vercel.app/api/cron/tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'monetra_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Teste manual: `curl -X POST -H "x-cron-secret: <CRON_SECRET>" https://seu-app.vercel.app/api/cron/tick`
(resposta esperada: `{"ok":true,"occurrencesCreated":0,"notificationsCreated":0,"telegramSent":0}`; sem o header, `401`).

Para pausar: `select cron.unschedule('monetra-tick');`

## 5.2.1 Migrations adicionais

Rode também, no SQL Editor (todas são aditivas e reexecutáveis):

- `20261015000000_account_balances_budget_alerts.sql`: saldo calculado das contas e alerta de teto.
- `20261016000000_budgets_rules_ai_usage.sql`: orçamento por categoria, regras de categorização aprendidas e controle de uso da IA.

## 5.2.2 Leitura de comprovante por foto

`POST /api/ai/receipt` usa o modelo de visão da OpenAI (`OPENAI_API_KEY`). Há limite de **15 leituras por usuário a cada 24h**
(constante `DAILY_LIMIT` em `api/ai/receipt.ts`) para controlar custo. A foto é reduzida no navegador (1280px, JPEG) e
**nada é gravado automaticamente**: o app preenche o formulário e o usuário confirma.

## 5.2.3 App instalável (PWA)

O app publica `manifest.webmanifest`, ícones e `sw.js`. Em produção, navegadores compatíveis oferecem "Instalar app" /
"Adicionar à tela inicial". O service worker não intercepta `/api` nem o Supabase, então dados financeiros nunca vêm de cache.

## 5.3 Regras de negócio relevantes (cartão e contas fixas)

- **Fechamento do cartão:** compra feita **no dia do fechamento ou depois** entra na fatura do **mês seguinte**; antes do fechamento, na fatura atual.
- **Vencimento:** se o dia de vencimento é maior que o de fechamento, vence no mesmo mês do fechamento; caso contrário, no mês seguinte.
- **Parcelas no cartão** são gravadas com `transaction_date` = `due_date` = vencimento da fatura em que caem (`is_paid = false` no agente).
- **Status de contas:** pago = verde, vence hoje = amarelo, atrasado = vermelho.
- **Lembretes:** conta fixa/pendente avisa `bill_reminder_days` antes (padrão 1), no dia e quando atrasa; fatura do cartão avisa `card_reminder_days` antes (padrão 2).

---

## 6. Checklist de Segurança

- [x] O frontend SPA **não** contém chaves privadas (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` ou `TELEGRAM_BOT_TOKEN`).
- [x] Todas as tabelas do Supabase possuem RLS (`ENABLE ROW LEVEL SECURITY`) com isolamento por `user_id = auth.uid()`.
- [x] O webhook do Telegram valida o header `x-telegram-bot-api-secret-token` em todas as requisições recebidas.
- [x] Idempotência ativada na tabela `telegram_updates` contra reenvio repetido de mensagens.
- [x] `/api/cron/tick` exige `x-cron-secret` e as notificações usam `dedupe_key` único para não duplicar avisos.
- [x] `/api/ai/chat` valida o JWT do Supabase no servidor (a identidade nunca vem do corpo da requisição).
- [x] Arquivos CSV de importação são validados no cliente (tamanho limite de 5MB) e inspecionados em prévia antes de qualquer gravação.
