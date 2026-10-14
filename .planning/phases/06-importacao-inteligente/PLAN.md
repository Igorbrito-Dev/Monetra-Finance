# PLAN.md — Fase 6: Módulo de Importação Inteligente & Auto-categorização com IA

## Objetivo da Fase
Construir o módulo completo de importação de arquivos financeiros (extratos bancários e faturas de cartão em CSV/OFX) com análise no navegador, pré-visualização interativa com mapeamento de colunas, motor de deduplicação inteligente contra lançamentos existentes, sugestão automática de categorias e gravação de lotes de auditoria (`import_batches`) protegidos por RLS.

---

## Metadados da Fase
- **Fase:** 06
- **Nome:** Módulo de Importação Inteligente & Auto-categorização com IA
- **Status:** Planejado / Pronto para Execução
- **Dependências:** Fases 01 a 05 concluídas com sucesso
- **Risco Técnico:** Médio (Parsing de formatos variados de extratos brasileiros, delimitação de colunas e deduplicação)

---

## Tarefas de Execução

### Tarefa 6.1: Motor de Parsing de Arquivos Financeiros (`src/lib/fileParser.ts`)
- **Ação:**
  - Criar parser puro no cliente capaz de ler arquivos CSV e textos de extratos:
    - Detecção automática de separador (vírgula `,`, ponto-e-vírgula `;` ou tab).
    - Normalização de valores monetários brasileiros e internacionais (`R$ 1.540,90`, `-45,00`, `1540.90`).
    - Normalização de datas (`DD/MM/YYYY`, `YYYY-MM-DD`, `DD-MM-YYYY`).
    - Validação de segurança: limite de 5MB, sanitização de caracteres e bloqueio de injeções de fórmulas.
- **Critério de Aceitação:** Parser extrai linhas válidas, ignora cabeçalhos incorretos e trata valores negativos/positivos de extratos de forma segura.

### Tarefa 6.2: Motor de Deduplicação & Sugestão de Categorias (`src/lib/importMatching.ts`)
- **Ação:**
  - Criar função `detectDuplicates(importedRows, existingTransactions)`:
    - Compara data, valor absoluto e similaridade na descrição.
    - Marca linhas com flag `isDuplicate: true` e referência da transação conflitante.
  - Criar função `suggestCategory(description, categories)`:
    - Heurística semântica e palavras-chave (ex: "uber" -> Transporte, "ifood" -> Alimentação, "posto" -> Transporte, "drogasil" -> Saúde, "salario" -> Salário).
- **Critério de Aceitação:** Detecção precisa de possíveis conflitos para evitar lançamentos duplicados sem intervenção do usuário.

### Tarefa 6.3: Tela & Modal de Importação com Pré-visualização (`ImportModal.tsx`)
- **Ação:**
  - Criar fluxo em 3 etapas no modal de importação:
    1. **Upload do Arquivo:** Drag-and-drop de arquivos `.csv` com feedback visual imediato.
    2. **Mapeamento & Pré-visualização:** Tabela interativa mostrando as linhas extraídas, permitindo selecionar Conta Bancária ou Cartão de Crédito de destino, alterar a categoria sugerida e desmarcar linhas indesejadas/duplicadas.
    3. **Confirmação & Gravação em Lote:** Criação do registro em `import_batches` e inserção em lote de todas as transações selecionadas no Supabase.
- **Critério de Aceitação:** Nenhuma gravação ocorre antes da revisão e confirmação explícita do usuário.

### Tarefa 6.4: Integração de Importação na UI & Histórico de Lotes (`ImportManager.tsx`)
- **Ação:**
  - Criar hook `src/hooks/useImportBatches.ts` para registrar e listar lotes de importação de auditoria (`import_batches`).
  - Adicionar botão de ação "Importar Extrato / Fatura" na tela de Transações e na navegação.
  - Permitir visualizar lotes importados anteriormente com data, nome do arquivo e total de lançamentos.
- **Critério de Aceitação:** Usuário acessa o fluxo de importação facilmente a partir do extrato de transações.

### Tarefa 6.5: Testes Automatizados & Validação de Build
- **Ação:**
  - Criar testes unitários para o parser de CSV e motor de deduplicação em `tests/fileParser.test.ts`.
  - Executar suíte completa via `npm test`.
  - Validar compilação limpa com `npm run build`.
- **Critério de Aceitação:** Testes passando com 100% de sucesso e build de produção sem erros.

---

## Verificação e Critérios de Conclusão da Fase
1. `npm test` e `npm run build` executados com 100% de sucesso.
2. Parser de CSV lidando corretamente com formatos de extratos brasileiros (Nubank, Itaú, Bradesco, etc.).
3. Pré-visualização interativa com conferência de linhas e desmarcação de duplicidades.
4. Lote de auditoria registrado na tabela `import_batches`.
