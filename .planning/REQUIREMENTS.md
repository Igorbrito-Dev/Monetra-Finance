# REQUIREMENTS.md — Monetra Finance

## Requisitos Funcionais (RF)

### 1. Autenticação e Gestão de Usuários
- **RF-01 (Auth Web):** Autenticação de usuários via Supabase Auth (Email/Senha ou Magic Link) com sessão segura no SPA.
- **RF-02 (Pareamento Telegram):** O usuário logado na web pode gerar um token temporário ou deep link para vincular sua conta do Telegram ao seu `user_id`.
- **RF-03 (Isolamento RLS):** Todas as tabelas de contas, categorias, transações e configurações devem isolar dados estritamente por `user_id`.

### 2. Gestão de Contas, Categorias e Métodos de Pagamento
- **RF-04 (Contas Bancárias / Carteiras):** Cadastro de contas (ex: Nubank, Itaú, Dinheiro) com controle de saldo inicial e saldo corrente.
- **RF-05 (Cartões de Crédito):** Cadastro de cartões com definição de limite, dia de fechamento e dia de vencimento.
- **RF-06 (Categorias e Subcategorias):** Gestão de categorias com distinção entre Receitas e Despesas (com cores/ícones).

### 3. Transações e Lançamentos
- **RF-07 (Lançamentos Manuais):** Cadastro de transação com tipo (Receita, Despesa, Transferência), valor (decimal), data, conta/cartão, categoria, forma de pagamento, observações e status (Efetivado ou Pendente).
- **RF-08 (Parcelamento de Compras):** Capacidade de dividir compra em N parcelas, associando cada uma ao mês/fatura correspondente sem duplicar valor total no mês presente.
- **RF-09 (Recorrências e Compromissos Futuros):** Previsão de despesas fixas (aluguel, assinaturas) para visualização em meses futuros.
- **RF-10 (Prevenção de Dupla Contagem):** Lançamento de "Pagamento de Fatura" não deve ser computado como nova despesa no balanço de categorias, mas sim como liquidação da dívida do cartão / transferência entre contas.

### 4. Dashboard e Relatórios Analíticos
- **RF-11 (Métricas Principais):** Saldo total, receitas do mês, despesas do mês, saldo previsto e balanço mensal.
- **RF-12 (Gráficos e Visualizações):** Despesas por categoria (gráfico de pizza/rosca), evolução mensal de receitas vs. despesas (gráfico de barras) e linha do tempo de transações.
- **RF-13 (Filtros e Histórico):** Navegação entre meses anteriores e futuros, filtros por categoria, conta, cartão e forma de pagamento.

### 5. Motor de Inteligência Artificial (LangChain + OpenAI)
- **RF-14 (Parser Inteligente via LangChain):** Extração de dados estruturados (valor, data, categoria, forma de pagamento, conta/cartão, tipo) a partir de mensagens livres em linguagem natural usando `@langchain/openai` com *Structured Output / Tool Calling*.
- **RF-15 (Agente Financeiro & Function Calling):** Agente LangChain com ferramentas (tools) para executar ações no banco (ex: `registrar_transacao`, `consultar_saldo`, `obter_gastos_categoria`, `listar_faturas`) com validação de parâmetros.
- **RF-16 (Categorização Automática em Importações):** Sugestão inteligente de categoria para transações importadas com base no histórico do usuário e semântica da descrição.
- **RF-17 (Insights & Consultas em Linguagem Natural):** Capacidade de responder dúvidas financeiras com contexto seguro do usuário (ex: *"Quanto gastei em restaurantes comparado ao mês passado?"*).

### 6. Bot do Telegram
- **RF-18 (Interação Fluida com IA):** Processamento de texto via LangChain no webhook, permitindo comandos formais ou mensagens naturais casuais.
- **RF-19 (Confirmação e Feedback):** Resposta imediata confirmando a criação da transação com detalhes formatados e opção de desfeita/exclusão rápida.
- **RF-20 (Consultas Rápidas):** Comandos estruturados ou perguntas abertas para consultar saldo atual (`/saldo`), gastos do mês (`/gastos`), faturas abertas (`/fatura`) e resumo semanal/mensal.
- **RF-21 (Idempotência e Segurança):** Verificação de `secret_token` no webhook do Telegram e registro de `update_id` para evitar execuções duplicadas.

### 7. Importação Inteligente de Arquivos
- **RF-22 (Upload de Arquivos):** Suporte inicial para CSV e extratos (OFX/CSV), validando tamanho (< 5MB) e mime-type.
- **RF-23 (Pré-visualização e Mapeamento com IA):** Tela de revisão antes de gravar no banco, permitindo mapear colunas (data, descrição, valor) e utilizando a IA para inferir categorias sugeridas.
- **RF-24 (Deduplicação Inteligente):** Detecção de transações já existentes (mesma data, valor e descrição similar) com alertas de conflito.
- **RF-25 (Confirmação e Lote):** Gravação associada a um `import_batch_id` para permitir auditoria e eventual reversão em lote.

---

## Requisitos Não Funcionais (RNF)

- **RNF-01 (Custo e Infraestrutura):** 100% Serverless, compatível com o plano gratuito da Vercel e Supabase (Zero-VPS, sem servidor dedicado).
- **RNF-02 (Precisão Monetária):** Todos os valores monetários processados e armazenados com precisão fixa (`NUMERIC(14,2)` ou centavos inteiros), sem flutuação por ponto flutuante binário.
- **RNF-03 (Segurança de Chaves):** Segredos de webhook e chaves `service_role` protegidas exclusivamente nas Serverless Functions na Vercel; cliente web opera estritamente com chave anônima + RLS.
- **RNF-04 (Design & Usabilidade):** Interface moderna, responsiva (mobile-first), com modo escuro nativo, microinterações fluidas e paleta visual elegante.
- **RNF-05 (Resiliência & Idempotência):** Retries de webhooks e upload de arquivos não devem gerar lançamentos duplicados no banco.
