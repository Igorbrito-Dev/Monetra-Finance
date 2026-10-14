# PLAN.md — Fase 2: Autenticação, Contas & Categorias

## Objetivo da Fase
Implementar o sistema de autenticação completo no cliente web via Supabase Auth (Login, Cadastro e Logout), estabelecer o contexto reativo de autenticação (`AuthContext`) e construir as interfaces interativas de gerenciamento das entidades base de finanças: Contas Bancárias/Carteiras, Cartões de Crédito e Categorias de Receitas/Despesas, operando sob isolamento estrito de Row Level Security (RLS).

---

## Metadados da Fase
- **Fase:** 02
- **Nome:** Autenticação, Contas & Categorias
- **Status:** Planejado / Pronto para Execução
- **Dependências:** Fase 01 concluída com sucesso
- **Risco Técnico:** Baixo a Médio (Interação com Supabase Auth e RLS no PostgreSQL)

---

## Tarefas de Execução

### Tarefa 2.1: Provedor de Autenticação (`AuthContext`) & Hooks
- **Ação:**
  - Criar `src/contexts/AuthContext.tsx` gerenciando sessão ativa, perfil do usuário (`profiles`), estado de loading e funções assíncronas:
    - `signIn(email, password)`
    - `signUp(email, password, fullName)`
    - `signOut()`
    - `resetPassword(email)`
  - Escutar mudanças de sessão via `supabase.auth.onAuthStateChange`.
  - Criar hook customizado `useAuth()` para consumo seguro nos componentes.
- **Critério de Aceitação:** Aplicação detecta instantaneamente quando o usuário está autenticado, recupera seu perfil e reflete o estado na UI sem flashes indevidos.

### Tarefa 2.2: Interfaces de Autenticação (Login & Cadastro)
- **Ação:**
  - Criar `src/components/auth/AuthPage.tsx` ou modal de autenticação com visual premium:
    - Alternância suave entre abas: "Entrar na Conta" e "Criar Nova Conta".
    - Tratamento de erros amigáveis em português (ex: "Senha deve ter no mínimo 6 caracteres", "E-mail ou senha incorretos").
    - Modo Demo / Feedback claro caso o `.env` ainda não possua as credenciais ativas do Supabase.
- **Critério de Aceitação:** Usuário consegue submeter credenciais, receber feedback visual em tempo real e acessar o sistema autenticado.

### Tarefa 2.3: Módulo de Contas Bancárias & Carteiras
- **Ação:**
  - Criar `src/hooks/useAccounts.ts` para CRUD de contas bancárias vinculadas ao `user_id`.
  - Criar `src/components/accounts/AccountCard.tsx` e `src/components/accounts/AccountModal.tsx`:
    - Campos: Nome da conta (ex: Nubank, Itaú, Carteira), Tipo (Corrente, Poupança, Investimento, Dinheiro), Saldo Inicial, Cor e Ícone.
    - Exibição de cards modernos com saldo formatado em reais (`R$`).
- **Critério de Aceitação:** Criação, edição e exclusão de contas funcionando e persistindo no Supabase com isolamento por RLS.

### Tarefa 2.4: Módulo de Cartões de Crédito
- **Ação:**
  - Criar `src/hooks/useCreditCards.ts` para CRUD de cartões de crédito.
  - Criar `src/components/cards/CreditCardItem.tsx` e `src/components/cards/CreditCardModal.tsx`:
    - Campos: Nome do Cartão, Limite Total, Dia de Fechamento da Fatura (1 a 31) e Dia de Vencimento (1 a 31), Cor personalizada.
    - Design visual de cartão com barra de progresso de limite disponível.
- **Critério de Aceitação:** Usuário cadastra e visualiza seus cartões com suas respectivas datas de fechamento e vencimento.

### Tarefa 2.5: Módulo de Categorias (Receitas & Despesas) + Auto-seed
- **Ação:**
  - Criar `src/hooks/useCategories.ts` para listagem e criação de categorias.
  - Criar `src/components/categories/CategoryManager.tsx` e `CategoryModal.tsx`:
    - Filtro por tipo: "Despesas" e "Receitas".
    - Seletor de cor e ícone para cada categoria.
    - Função de inicialização rápida com categorias padrão brasileiras (Alimentação, Transporte, Moradia, Lazer, Saúde, Salário, Freela, Rendimentos) caso a conta seja nova.
- **Critério de Aceitação:** Categorias criadas e listadas com distinção visual clara entre entradas e saídas.

### Tarefa 2.6: Layout Principal & Navegação Integrada
- **Ação:**
  - Criar `src/components/layout/AppNavbar.tsx` com dados do usuário, avatar e botão de logout.
  - Atualizar `src/App.tsx` para chavear entre estado não autenticado (AuthPage) e autenticado com barra de navegação (Visão Geral, Contas, Cartões, Categorias).
  - Validar compilação limpa com `npm run build`.
- **Critério de Aceitação:** Transição fluida entre abas, feedback em tempo real e compilação sem erros.

---

## Verificação e Critérios de Conclusão da Fase
1. `npm run build` executado com 100% de sucesso sem erros de tipo no TypeScript.
2. Fluxo completo de autenticação funcional com Supabase Auth.
3. CRUD de Contas Bancárias, Cartões de Crédito e Categorias operacional e protegido por RLS.
4. Auto-seeding opcional de categorias essenciais para novos usuários.
5. Interface intuitiva, responsiva e com design system dark mode consistente.
