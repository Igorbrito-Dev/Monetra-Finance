# PLAN.md — Fase 5: Motor de IA com LangChain & Bot Telegram

## Objetivo da Fase
Implementar a infraestrutura de inteligência artificial e mensageria serverless do Monetra Finance: endpoint de webhook do Telegram na Vercel (`api/telegram/webhook.ts`), agente inteligente com LangChain (`@langchain/openai`, `@langchain/core`) utilizando a OpenAI API com Function Calling / Tools para registrar transações em linguagem natural e responder consultas financeiras, mecanismo seguro de pareamento Web <-> Telegram via token efêmero e tela de configuração do bot na interface web.

---

## Metadados da Fase
- **Fase:** 05
- **Nome:** Motor de IA com LangChain & Bot Telegram
- **Status:** Planejado / Pronto para Execução
- **Dependências:** Fases 01, 02, 03 e 04 concluídas com sucesso
- **Risco Técnico:** Médio (Integração serverless Vercel, Telegram Bot API, LangChain e OpenAI API)

---

## Tarefas de Execução

### Tarefa 5.1: Dependências do Backend & Agente LangChain
- **Ação:**
  - Instalar dependências necessárias: `@langchain/openai`, `@langchain/core`, `zod`.
  - Configurar `api/ai/agent.ts`:
    - Inicializar `ChatOpenAI` (modelo `gpt-4o-mini` por padrão com temperatura 0 para precisão financeira).
    - Criar ferramentas (LangChain `DynamicStructuredTool` com Zod Schema):
      - `criarTransacaoTool`: extrai valor (numérico), descrição, tipo (receita/despesa), data (YYYY-MM-DD), categoria inferida e forma de pagamento, persistindo no Supabase com `user_id` autenticado.
      - `consultarSaldoTool`: calcula e formata o saldo consolidado das contas do usuário.
      - `consultarGastosMesTool`: calcula gastos agrupados por categoria e total do mês corrente.
      - `consultarFaturaTool`: resume os compromissos em aberto e limites dos cartões.
- **Critério de Aceitação:** Agente responde e executa tools de forma determinística, segura e com parsing rigoroso de valores monetários brasileiros.

### Tarefa 5.2: Mecanismo de Pareamento Seguro & Idempotência (`api/telegram/auth.ts`)
- **Ação:**
  - Criar funções de validação e vinculação:
    - Validação de idempotência via tabela `telegram_updates` (`update_id`) para ignorar retentativas de envio da rede do Telegram.
    - Validação de autorização: verificar se `telegram_chat_id` já está associado a um usuário na tabela `profiles`.
    - Processamento de comando de vínculo `/start <token>` ou `/vincular <token>`: busca na tabela `telegram_link_tokens`, valida se o token não expirou, atualiza `profiles.telegram_chat_id = chat_id` e apaga o token utilizado.
- **Critério de Aceitação:** Usuários desconhecidos não conseguem lançar despesas nem consultar dados sem antes vincular sua conta via token gerado na web.

### Tarefa 5.3: Webhook Serverless da Vercel (`api/telegram/webhook.ts`)
- **Ação:**
  - Criar a Serverless Function padrão Vercel (`api/telegram/webhook.ts`):
    - Validação de cabeçalho secreto: `X-Telegram-Bot-Api-Secret-Token === process.env.TELEGRAM_WEBHOOK_SECRET`.
    - Extração do payload do Telegram (`message.text`, `message.chat.id`, `update_id`).
    - Envio do prompt e histórico para o Agente LangChain.
    - Envio da resposta de volta para o Telegram usando a Telegram Bot API (`sendMessage`).
- **Critério de Aceitação:** Webhook responde com status 200 HTTP em menos de 3 segundos, executa as tools do LangChain e entrega a mensagem de confirmação formatada ao usuário.

### Tarefa 5.4: Interface Web de Pareamento do Telegram (`TelegramIntegrationModal.tsx`)
- **Ação:**
  - Criar hook `src/hooks/useTelegramIntegration.ts`:
    - Gerar token efêmero de 6 dígitos ou alfanumérico com validade de 15 minutos na tabela `telegram_link_tokens`.
    - Verificar status de vinculação do Telegram (se `profile.telegram_chat_id` existe).
    - Desvincular conta do Telegram quando solicitado.
  - Criar componente `src/components/telegram/TelegramIntegrationModal.tsx`:
    - Status de conexão ("Conectado" ou "Não Vinculado").
    - Botão "Gerar Código de Vínculo" e botão de Deep Link direto (`https://t.me/SeuBot?start=TOKEN`).
    - Guia ilustrado de como conversar com o bot e exemplos de mensagens (ex: *"Gastei 45 no almoço no débito"*).
  - Adicionar botão de acesso ao Telegram na `AppNavbar.tsx`.
- **Critério de Aceitação:** Usuário logado na web gera token em 1 clique, visualiza instruções claras e acompanha se o bot está conectado à sua conta.

### Tarefa 5.5: Testes Automatizados & Validação de Build
- **Ação:**
  - Criar testes unitários para o parser de comandos e formatação de mensagens do Telegram (`tests/telegramParser.test.ts`).
  - Executar suíte de testes completa com `npm test`.
  - Validar compilação limpa com `npm run build`.
- **Critério de Aceitação:** Build compilado sem erros e testes unitários 100% aprovados.

---

## Verificação e Critérios de Conclusão da Fase
1. `npm test` e `npm run build` executados com 100% de sucesso.
2. Endpoint `/api/telegram/webhook.ts` pronto para execução serverless na Vercel com proteção por secret token.
3. Agente LangChain configurado com tools seguras conectadas ao Supabase.
4. Interface web com fluxo completo de geração de token e pareamento.
5. Idempotência e segurança comprovadas.
