# PLAN.md — Fase 4: Dashboard Analítico & Relatórios Web

## Objetivo da Fase
Desenvolver o painel analítico central do Monetra Finance: consolidação de métricas-chave em tempo real (patrimônio em contas, receitas, despesas, faturas abertas e taxa de economia), gráficos visuais de alto impacto (composição de gastos por categoria e evolução temporal dos últimos 6 meses com barras comparativas interativas), visão preditiva de compromissos futuros (parcelas a vencer) e atalhos de ação rápida.

---

## Metadados da Fase
- **Fase:** 04
- **Nome:** Dashboard Analítico & Relatórios Web
- **Status:** Planejado / Pronto para Execução
- **Dependências:** Fase 01, Fase 02 e Fase 03 concluídas com sucesso
- **Risco Técnico:** Baixo (Construção de componentes visuais, agregação de dados e visualizações analíticas)

---

## Tarefas de Execução

### Tarefa 4.1: Motor de Agregação de Dados & Relatórios (`src/lib/dashboardMetrics.ts`)
- **Ação:**
  - Criar funções puras de agregação analítica:
    - `getCategoryExpensesBreakdown(transactions, categories)`: cálculo do total e percentual gasto em cada categoria no período selecionado, ordenado de forma decrescente com paleta de cores.
    - `getSixMonthsHistory(transactions)`: geração da série histórica dos últimos 6 meses (Receitas vs. Despesas vs. Balanço).
    - `getFutureCommitments(transactions, monthsAhead)`: projeção de parcelas futuras já programadas para os próximos 3 a 6 meses.
    - `calculateSavingsRate(income, expense)`: cálculo da taxa de poupança percentual (`(receita - despesa) / receita * 100`).
- **Critério de Aceitação:** Cálculos matemáticos precisos, tratando divisão por zero e respeitando a regra de exclusão de pagamentos de fatura das despesas de consumo.

### Tarefa 4.2: Componentes de Visualização & Gráficos Modernos
- **Ação:**
  - Criar `src/components/dashboard/CategoryBreakdownChart.tsx`:
    - Visualização de barras de distribuição percentual por categoria com cores dinâmicas e listagem detalhada com valores em reais e porcentagens.
  - Criar `src/components/dashboard/EvolutionBarChart.tsx`:
    - Gráfico moderno de barras comparativas dos últimos 6 meses (Receitas em esmeralda vs. Despesas em rosé) feito em SVG limpo, responsivo, com tooltips em hover e sem bibliotecas pesadas de terceiros.
- **Critério de Aceitação:** Renderização fluida, responsiva em desktop e mobile, com estética dark mode de alto padrão.

### Tarefa 4.3: Projeção de Compromissos Futuros (`UpcomingCommitments.tsx`)
- **Ação:**
  - Criar `src/components/dashboard/UpcomingCommitments.tsx`:
    - Painel exibindo parcelas futuras agendadas para os próximos meses (ex: "Parcela 2/5 Notebook Dell").
    - Visão de previsibilidade financeira para evitar surpresas na fatura do mês seguinte.
- **Critério de Aceitação:** Usuário visualiza com clareza o total já comprometido em meses futuros.

### Tarefa 4.4: Painel Principal do Dashboard (`DashboardView.tsx`)
- **Ação:**
  - Criar `src/components/dashboard/DashboardView.tsx` consolidando:
    - Top bar com seletor de mês e ano.
    - 4 Cards de KPI: Saldo Total em Contas, Receitas do Mês, Despesas do Mês, Taxa de Economia / Saldo Líquido.
    - Grid principal: Gráfico de Evolução (6 meses) + Composição por Categorias.
    - Seção inferior: Compromissos Futuros + Últimos Lançamentos com atalho para o extrato completo.
- **Critério de Aceitação:** Interface envolvente, fluida e integrada aos dados do Supabase / Modo Demo.

### Tarefa 4.5: Integração no App, Testes & Compilação
- **Ação:**
  - Integrar `DashboardView` como a aba principal "Visão Geral" do `src/App.tsx`.
  - Adicionar testes de agregação em `tests/dashboardMetrics.test.ts`.
  - Validar com `npm test` e `npm run build`.
- **Critério de Aceitação:** Build compilando com código 0 e todos os testes passando.

---

## Verificação e Critérios de Conclusão da Fase
1. `npm test` e `npm run build` executados com 100% de aprovação.
2. Gráficos de barras temporais e composição por categorias funcionando de forma responsiva.
3. KPIs analíticos e taxa de economia calculados dinamicamente.
4. Painel de compromissos futuros exibindo compras parceladas programadas.
