# PLAN.md — Fase 1: Fundação & Infraestrutura Base

## Objetivo da Fase
Estabelecer a fundação técnica completa do Monetra Finance: inicializar a aplicação frontend (Vite + React + TypeScript + Tailwind CSS + Lucide Icons), criar o cliente Supabase tipado e seguro com base no schema SQL já versionado, configurar o ambiente (`.env.example`) e entregar uma tela de Walking Skeleton (status de infraestrutura e design system inicial) testada e operacional.

---

## Metadados da Fase
- **Fase:** 01
- **Nome:** Fundação & Infraestrutura Base
- **Status:** Planejado / Pronto para Execução
- **Dependências:** Nenhuma (Primeira fase)
- **Risco Técnico:** Baixo (Setup e integração de ferramental base)

---

## Tarefas de Execução

### Tarefa 1.1: Inicialização do Projeto Frontend & Dependências
- **Ação:**
  - Configurar `package.json` com scripts (`dev`, `build`, `lint`, `preview`).
  - Instalar dependências de produção: `react`, `react-dom`, `@supabase/supabase-js`, `lucide-react`, `clsx`, `tailwind-merge`.
  - Instalar dependências de desenvolvimento: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `tailwindcss`, `@tailwindcss/vite` (ou PostCSS).
  - Configurar `tsconfig.json`, `tsconfig.node.json` e `vite.config.ts` com alias `@/` apontando para `src/`.
- **Critério de Aceitação:** `npm install` executa sem conflitos e `npm run build` compila sem erros de TypeScript.

### Tarefa 1.2: Design System Base & Utilitários de Estilo
- **Ação:**
  - Configurar CSS base (`src/index.css`) com paleta moderna HSL (modo escuro nativo, slate/emerald/indigo, glassmorphism e tipografia Inter/Sans).
  - Criar `src/lib/utils.ts` com função utilitária `cn()` (`clsx` + `twMerge`).
  - Criar componentes atômicos fundamentais (Button, Card, Badge) seguindo a convenção shadcn/ui.
- **Critério de Aceitação:** Estilos do Tailwind renderizam corretamente, com suporte a microanimações e modo escuro.

### Tarefa 1.3: Tipagem TypeScript & Cliente Supabase
- **Ação:**
  - Criar `src/types/database.ts` mapeando 100% dos tipos das tabelas da migração inicial (`profiles`, `accounts`, `credit_cards`, `categories`, `transactions`, `import_batches`, `telegram_link_tokens`, `telegram_updates`).
  - Criar `src/lib/supabase.ts` instanciando o cliente Supabase utilizando `import.meta.env.VITE_SUPABASE_URL` e `import.meta.env.VITE_SUPABASE_ANON_KEY`.
  - Criar `.env.example` detalhando todas as variáveis necessárias do projeto (Web, Supabase, Vercel Functions, Telegram e OpenAI).
- **Critério de Aceitação:** Nenhum segredo ou chave privada exposta no frontend; tipagem TypeScript estrita nos retornos do Supabase.

### Tarefa 1.4: Walking Skeleton & Verificação End-to-End
- **Ação:**
  - Criar componente raiz `src/App.tsx` apresentando o Walking Skeleton do Monetra Finance:
    - Topbar e identidade visual moderna.
    - Card de Diagnóstico de Conexão com Supabase (verificando se as credenciais anônimas estão configuradas).
    - Card de Resumo do Schema e Migrações prontas.
    - Indicador de prontidão para a Fase 2 (Autenticação).
  - Testar execução do servidor local com `npm run build`.
- **Critério de Aceitação:** Servidor compila sem avisos nem erros de tipo; a interface exibe o design refinado do Monetra Finance.

---

## Verificação e Critérios de Conclusão da Fase
1. `npm run build` executado com sucesso e zero erros de tipo.
2. Arquivo `.env.example` documentando `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`.
3. Tipagem de dados em `src/types/database.ts` perfeitamente alinhada com a migration `20261013000000_initial_schema.sql`.
4. Interface Walking Skeleton esteticamente refinada, responsiva e pronta para receber o fluxo de Auth na Fase 2.
