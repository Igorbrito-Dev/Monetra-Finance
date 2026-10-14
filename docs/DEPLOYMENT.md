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

## 6. Checklist de Segurança

- [x] O frontend SPA **não** contém chaves privadas (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` ou `TELEGRAM_BOT_TOKEN`).
- [x] Todas as tabelas do Supabase possuem RLS (`ENABLE ROW LEVEL SECURITY`) com isolamento por `user_id = auth.uid()`.
- [x] O webhook do Telegram valida o header `x-telegram-bot-api-secret-token` em todas as requisições recebidas.
- [x] Idempotência ativada na tabela `telegram_updates` contra reenvio repetido de mensagens.
- [x] Arquivos CSV de importação são validados no cliente (tamanho limite de 5MB) e inspecionados em prévia antes de qualquer gravação.
