# ROADMAP.md — Monetra Finance

## Visão Geral das Fases

```text
[x] Fase 1: Fundação & Infraestrutura Base (Vite + Tailwind + Supabase Schema & RLS)
[x] Fase 2: Autenticação, Contas & Categorias (Web Auth + Configurações de Dados)
[x] Fase 3: Gestão de Transações & Regras de Negócio (Lançamentos, Parcelas, Prevenção de Dupla Contagem)
[x] Fase 4: Dashboard Analítico & Relatórios Web (Métricas, Gráficos, Filtros e Linha do Tempo)
[x] Fase 5: Motor de IA com LangChain & Bot Telegram (Serverless Webhook, Agente OpenAI, Function Calling, Pareamento)
[x] Fase 6: Módulo de Importação Inteligente & Auto-categorização com IA (Upload CSV/Extratos, Mapeamento, Deduplicação)
[x] Fase 7: Polimento, Auditoria de Segurança & Deploy de Produção (Vercel + Supabase)
```

---

### Fase 1: Fundação & Infraestrutura Base
- **Objetivo:** Inicializar o projeto frontend SPA com Vite, React, TypeScript, Tailwind CSS, shadcn/ui e preparar a infraestrutura Supabase (migrations versionadas, schema inicial de dados e políticas RLS).
- **Entregáveis:**
  - Setup do projeto frontend com Vite + React + TS + Tailwind + Lucide Icons.
  - Configuração do cliente Supabase e tipagem TypeScript (`types/database.ts`).
  - Migration inicial: tabelas `profiles`, `accounts`, `categories`, `credit_cards`, `transactions` com chaves estrangeiras, índices e RLS ativado.
  - Configuração de `.env.example` e scripts de teste e lint.
- **Critérios de Aceitação:**
  - Frontend inicializa com design base limpo e responsivo.
  - Script/migração Supabase roda sem erros e impede acessos cruzados entre usuários diferentes.

### Fase 2: Autenticação, Contas & Categorias
- **Objetivo:** Implementar o fluxo de autenticação completo no frontend e o cadastro de contas bancárias e categorias.
- **Entregáveis:**
  - Telas de Login, Registro e Recuperação de Senha com Supabase Auth.
  - Tela de Gestão de Contas e Carteiras (saldo inicial, tipo de conta).
  - Tela de Gestão de Cartões de Crédito (limite, datas de fechamento e vencimento).
  - Tela de Gestão de Categorias (com cores personalizadas e distinção receita/despesa).
- **Critérios de Aceitação:**
  - Usuário consegue criar conta, logar e gerenciar suas contas/categorias de forma isolada por RLS.

### Fase 3: Gestão de Transações & Lógica Financeira
- **Objetivo:** Implementar o motor de lançamentos manuais, despesas, receitas, transferências, parcelamentos e regras de cartões.
- **Entregáveis:**
  - Modal/Formulário rápido e completo de cadastro de transações.
  - Tabela interativa de lançamentos com paginação, busca e filtros.
  - Suporte a compras parceladas gerando registros futuros associados.
  - Lógica estrita para liquidação de faturas de cartão sem dupla contagem de despesas.
  - Testes unitários para cálculos de saldos e parcelamento.
- **Critérios de Aceitação:**
  - Saldo atual reflete transações efetivadas com precisão decimal.
  - Compras parceladas não debitam saldo integral imediato.

### Fase 4: Dashboard Analítico & Relatórios Web
- **Objetivo:** Criar o painel visual principal com gráficos dinâmicos, métricas financeiras consolidadas e visão temporal.
- **Entregáveis:**
  - Cards de KPI: Saldo Geral, Receitas do Mês, Despesas do Mês, Balanço Líquido e Faturas Abertas.
  - Gráfico de Composição de Despesas por Categoria.
  - Gráfico de Evolução Financeira (Receitas vs. Despesas últimos 6 meses).
  - Navegador mensal (mês atual, retroativo e previsões futuras).
  - Extrato detalhado com filtros rápidos.
- **Critérios de Aceitação:**
  - Dashboard carrega dados em tempo real respeitando o mês selecionado e com estética de alto nível.

### Fase 5: Integração Telegram Bot (Serverless Webhook)
- **Objetivo:** Conectar o bot do Telegram via função serverless na Vercel para lançamentos ágeis por mensagem e consultas.
- **Entregáveis:**
  - Endpoint Serverless em `/api/telegram/webhook.ts` na Vercel.
  - Validação de segredo do webhook (`X-Telegram-Bot-Api-Secret-Token`).
  - Fluxo de pareamento seguro entre conta do Telegram e conta da web (token temporário/deep link).
  - Parser inteligente de mensagens de texto em português (ex: *"Gastei 50 no almoço no debito"*).
  - Comandos de consulta: `/saldo`, `/gastos`, `/fatura`.
  - Mecanismo de deduplicação e idempotência para reenvios do Telegram (`update_id`).
- **Critérios de Aceitação:**
  - Enviar mensagem no Telegram registra a transação no banco com categoria inferida e responde confirmando com rapidez.
  - Usuários não autorizados têm o acesso barrado.

### Fase 6: Módulo de Importação Inteligente de Arquivos
- **Objetivo:** Permitir upload de extratos bancários e faturas (CSV/OFX) com tela de conferência, deduplicação e confirmação em lote.
- **Entregáveis:**
  - Parser no cliente/servidor para arquivos CSV e OFX com tratamento de valores em formato brasileiro (`R$ 1.250,50`).
  - Tela de pré-visualização com detecção automática de colunas (Data, Descrição, Valor).
  - Algoritmo de identificação de duplicidades contra lançamentos existentes.
  - Confirmação do lote vinculada a um `batch_id` para auditoria e possibilidade de descarte/reversão.
- **Critérios de Aceitação:**
  - Usuário importa arquivo, revisa possíveis conflitos e confirma antes de qualquer gravação permanente no banco.

### Fase 7: Polimento, Auditoria de Segurança & Deploy de Produção
- **Objetivo:** Revisão geral de segurança, performance, testes de regressão, tratamento de erros e deploy de produção na Vercel.
- **Entregáveis:**
  - Checklist de RLS e validações de API.
  - Verificação de políticas de inatividade e limites do plano gratuito do Supabase e Vercel.
  - Documentação final com guia de configuração das variáveis de ambiente e setup do bot no BotFather.
  - Deploy final da aplicação web e do webhook.
- **Critérios de Aceitação:**
  - Sistema 100% operacional no ambiente de produção da Vercel integrado ao Supabase e ao Telegram, cumprindo a meta de Zero-VPS e menor custo possível.
