# PLAN.md — Fase 3: Gestão de Transações & Regras de Negócio

## Objetivo da Fase
Implementar o motor central de transações financeiras do Monetra Finance: cadastro manual de despesas, receitas, transferências e pagamentos de fatura, gerenciamento de compras parceladas com distribuição exata de centavos, regras estritas de prevenção de dupla contagem em cartões de crédito e listagem interativa com filtros avançados e buscas por período.

---

## Metadados da Fase
- **Fase:** 03
- **Nome:** Gestão de Transações & Regras de Negócio
- **Status:** Planejado / Pronto para Execução
- **Dependências:** Fase 01 e Fase 02 concluídas com sucesso
- **Risco Técnico:** Médio (Cálculos de parcelas, precisão decimal e regras de faturas de cartão)

---

## Tarefas de Execução

### Tarefa 3.1: Motor de Lógica Financeira & Regras de Domínio (`src/lib/financeRules.ts`)
- **Ação:**
  - Criar funções utilitárias puras e testáveis:
    - `splitInstallmentAmounts(totalAmount: number, installmentsCount: number): number[]`: divisão exata de parcelas com ajuste no primeiro centavo para evitar perdas decimais (ex: R$ 100,00 em 3x resulta em 33,34 + 33,33 + 33,33).
    - `generateInstallmentDates(startDate: string, count: number): string[]`: progressão de datas mensais respeitando o dia da transação.
    - `isInvoicePayment(transaction)`: identificação de pagamentos de fatura para excluí-los do balanço de categorias de despesa de consumo (prevenindo dupla contagem com as compras já lançadas na fatura).
    - `calculateBalances(accounts, transactions)`: consolidação dos saldos das contas bancárias baseado em transações efetivadas (`is_paid = true`).
- **Critério de Aceitação:** Zero uso de aproximações com ponto flutuante perigoso; soma das parcelas sempre bate 100% com o valor original.

### Tarefa 3.2: Hook Reativo de Transações (`src/hooks/useTransactions.ts`)
- **Ação:**
  - Criar hook com estados de carregamento, filtros (mês, ano, tipo, categoria, conta, cartão, busca por descrição) e persistência no Supabase com isolamento RLS.
  - Implementar métodos:
    - `createTransaction`: cadastro de lançamento único ou em lote (compras parceladas com `installment_group_id`).
    - `updateTransaction`: edição de valores, datas ou categorias.
    - `deleteTransaction`: exclusão de transação única ou opção de excluir todo o grupo de parcelas vinculadas.
    - `togglePaidStatus`: alternar rapidamente entre Efetivado e Pendente.
  - Suporte a dados mockados no modo demonstração com exemplos realistas (compras parceladas, pagamentos no débito e receitas).
- **Critério de Aceitação:** Transações gravadas e recuperadas com paginação e ordenação por data decrescente.

### Tarefa 3.3: Modal de Cadastro de Lançamento (`TransactionModal.tsx`)
- **Ação:**
  - Criar formulário completo com visual escuro moderno:
    - Seletor de Tipo: Despesa, Receita, Transferência ou Pagamento de Fatura.
    - Valor (input numérico com máscara de moeda).
    - Descrição e Data da Transação.
    - Seletor de Conta Bancária ou Cartão de Crédito.
    - Seletor de Categoria (vinculado às categorias da Fase 2).
    - Forma de Pagamento (Pix, Cartão de Crédito, Cartão de Débito, Dinheiro, Boleto, Transferência).
    - Toggle de Compra Parcelada (ativa seletor de 2x a 48x).
    - Status de pagamento (Efetivado ou Pendente/Agendado).
- **Critério de Aceitação:** Formulário valida campos obrigatórios, bloqueia envio incorreto e cria parcelas futuras quando selecionado.

### Tarefa 3.4: Tabela Interativa de Lançamentos & Filtros (`TransactionList.tsx`)
- **Ação:**
  - Construir tela de extrato e listagem de transações:
    - Seletor de Mês/Ano com botões "Mês Anterior" / "Próximo Mês".
    - Cards de resumo do período selecionado: Total Receitas, Total Despesas, Balanço do Mês.
    - Barra de pesquisa textual e filtros por Tipo (Todas, Receitas, Despesas), Conta e Categoria.
    - Listagem com visual moderno: badges de categoria, tag de parcelas (ex: "2/6"), indicador de cartão/conta, botão de alternância pago/pendente e exclusão.
- **Critério de Aceitação:** Filtros aplicados instantaneamente na UI, navegação de meses fluida e indicação visual clara de status.

### Tarefa 3.5: Testes Unitários de Regras Financeiras (`tests/financeRules.test.ts`)
- **Ação:**
  - Configurar testes automatizados (Vitest ou script de teste) validando:
    - Divisão de parcelas sem perda de centavos.
    - Prevenção de dupla contagem em pagamentos de fatura.
    - Consolidação de saldo bancário.
- **Critério de Aceitação:** Todos os testes passam sem divergência de centavos.

### Tarefa 3.6: Integração no App & Compilação
- **Ação:**
  - Adicionar a aba "Transações" na barra de navegação (`AppNavbar.tsx`).
  - Atualizar `src/App.tsx` para permitir gerenciar transações diretamente.
  - Executar `npm run build` e validar compilação sem erros de tipo.
- **Critério de Aceitação:** Build compilado com sucesso e navegação 100% funcional.

---

## Verificação e Critérios de Conclusão da Fase
1. `npm run build` executado com código 0 e zero erros no TypeScript.
2. Compras parceladas geram N parcelas com centavos preservados e datas mensais corretas.
3. Pagamentos de fatura não duplicam despesas de consumo.
4. Extrato mensal com navegação temporal e filtros responsivos.
