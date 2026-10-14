# PLAN.md — Fase 7: Suporte a Áudio (Whisper), Pareamento Numérico, Orçamento Mensal & Deploy

## Objetivo da Fase
Implementar a transcrição e interpretação de áudios via OpenAI Whisper no Telegram, sincronização rápida por código numérico de 6 dígitos e deep link direto, gestão de limites/tetos de gastos mensais com alertas inteligentes, auditoria de segurança rigorosa e preparação completa para deploy na Vercel e Supabase (Zero-VPS).

---

## Metadados da Fase
- **Fase:** 07
- **Nome:** Suporte a Áudio (Whisper), Pareamento Numérico de 6 Dígitos, Orçamento & Preparação para Deploy
- **Status:** Planejado / Pronto para Execução
- **Dependências:** Fases 01 a 06 concluídas com sucesso
- **Risco Técnico:** Médio (Download e conversão de stream de áudio do Telegram para o Whisper em ambiente serverless, sem persistência local)

---

## Tarefas de Execução

### Tarefa 7.1: Transcrição de Áudio com OpenAI Whisper no Telegram (`api/telegram/webhook.ts`)
- **Ação:**
  - Tratar mensagens do tipo `voice` ou `audio` recebidas no webhook da Vercel.
  - Obter URL de download do áudio através do endpoint `getFile` da Telegram Bot API.
  - Fazer download do buffer do arquivo `.oga`/`.ogg` em memória (sem gravar em disco local para conformidade Zero-VPS/Serverless).
  - Enviar o arquivo para a API de áudio da OpenAI (`openai.audio.transcriptions.create` com model `whisper-1` e `language: 'pt'`).
  - Passar o texto transcrito diretamente ao agente LangChain (`runFinancialAgent`), executando os comandos financeiros e respondendo com a confirmação e transcrição.
- **Critério de Aceitação:** Áudio enviado no Telegram é transcrito em PT-BR e processado pelo agente financeiro com sucesso.

### Tarefa 7.2: Pareamento Simplificado com Código de 6 Dígitos & Deep Link Direto
- **Ação:**
  - Atualizar o gerador de tokens efêmeros em `api/telegram/auth.ts` e `src/hooks/useTelegramIntegration.ts` para gerar códigos numéricos aleatórios de 6 dígitos (ex: `839201`).
  - Implementar no webhook do Telegram o reconhecimento automático de mensagem contendo apenas os 6 dígitos numéricos, vinculando o chat do usuário instantaneamente.
  - Na interface web (`TelegramIntegrationModal.tsx`), adicionar botão "Abrir no Telegram" com URL direta `https://t.me/<BOT_USERNAME>?start=<CODIGO>` e campo fácil de cópia do código de 6 dígitos.
- **Critério de Aceitação:** Usuário sincroniza sua conta enviando apenas o código de 6 dígitos ou clicando no botão do Telegram.

### Tarefa 7.3: Teto/Limite Mensal de Gastos e Alertas Proativos
- **Ação:**
  - Adicionar suporte a `monthly_budget` no perfil do usuário (`profiles` ou state local/Supabase).
  - Criar ferramenta no agente LangChain (`consultarLimiteGastosTool`) permitindo ao usuário perguntar no Telegram:
    - *"Quanto ainda posso gastar esse mês?"*
    - *"Qual é o meu limite e quanto já comprometi?"*
    - *"Quanto gastei hoje / na fatura deste mês / do mês que vem?"*
  - Emitir aviso no Telegram e no Dashboard quando as despesas ultrapassarem 80% do limite estipulado.
  - Permitir configurar o teto mensal na interface web (modal de perfil/configurações).
- **Critério de Aceitação:** Agente informa limites, percentual comprometido e projeta gastos de faturas atuais e futuras.

### Tarefa 7.4: Testes Automatizados da Fase 7
- **Ação:**
  - Criar `tests/whisperParser.test.ts` validando:
    - Validação e parsing de códigos numéricos de 6 dígitos.
    - Simulação do payload de voz do Telegram.
    - Cálculo de consumo do teto orçamentário e disparos de alertas de limite percentual.
  - Integrar ao `tests/runAll.js` e validar que 100% dos testes passam.
- **Critério de Aceitação:** Todos os testes unitários passando.

### Tarefa 7.5: Documentação Completa de Deploy e Configuração de Produção
- **Ação:**
  - Criar `docs/DEPLOYMENT.md` com instruções detalhadas para publicação na Vercel e Supabase (execução de migrations, configuração de variáveis de ambiente, verificação de RLS).
  - Criar `docs/TELEGRAM_SETUP.md` com o passo a passo para registrar o bot no `@BotFather`, configurar comandos e setar o webhook na Vercel (`setWebhook`).
  - Atualizar `.env.example` com todas as variáveis necessárias (`VITE_TELEGRAM_BOT_USERNAME`, `OPENAI_API_KEY`, etc.).
  - Validar build de produção limpo com `npm run build`.
- **Critério de Aceitação:** Guias claros e documentados, sem segredos versionados e build 100% verde.

---

## Verificação e Critérios de Conclusão da Fase 7
1. Suporte a áudio via Whisper integrado ao webhook serverless.
2. Código numérico de 6 dígitos e botão direto do Telegram funcionando.
3. Controle de teto de gastos orçamentário configurável e consultável via IA.
4. Suíte de testes automatizados expandida e com 100% de aprovação.
5. Documentação de deploy pronta para colocar o sistema no ar com custo zero.
