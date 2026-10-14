# AGENTS.md — Sistema de Gestão Financeira

## 1. Objetivo do projeto

Construir um sistema de gestão financeira pessoal acessível pela web e pelo Telegram, priorizando custo zero ou o menor custo possível. O projeto não deve depender de uma VPS, de um servidor dedicado ou de um computador pessoal ligado continuamente.

O sistema deve permitir que o usuário registre e consulte receitas e despesas pelo Telegram ou pela interface web, importe arquivos financeiros e acompanhe sua situação financeira por meio de um dashboard analítico.

## 2. Requisitos principais

### Telegram
- Receber mensagens de texto para registrar receitas e despesas.
- Responder confirmando operações concluídas e informar erros de forma clara.
- Permitir consultas financeiras em linguagem simples, como saldo, gastos do mês e despesas por categoria.
- Restringir o acesso aos usuários autorizados.
- Considerar suporte a áudio como funcionalidade futura, sem torná-la requisito para o MVP.

### Aplicação web
- Oferecer dashboard analítico com receitas, despesas, saldo, categorias e evolução ao longo do tempo.
- Permitir inclusão, consulta, edição e exclusão de lançamentos manualmente.
- Permitir filtrar dados por período, categoria, tipo de transação e forma de pagamento.
- Consultar meses anteriores, o mês atual e compromissos futuros, incluindo parcelas e despesas recorrentes quando implementadas.
- Permitir importação de arquivos, como planilhas, extratos bancários e faturas de cartão.
- Antes de gravar uma importação, apresentar uma prévia para revisão, informar possíveis duplicidades e permitir confirmar ou cancelar.
- Manter os dados importados vinculados à origem e, quando possível, ao arquivo/lote de importação para auditoria.

### Dados financeiros
- Diferenciar receitas e despesas.
- Guardar valor, descrição, data da transação, categoria, forma de pagamento e outros campos necessários ao tipo de lançamento.
- Modelar separadamente transações efetivas e compromissos futuros quando necessário, evitando contar uma parcela futura como despesa já paga.
- Tratar faturas de cartão com cuidado para evitar dupla contagem: compras da fatura e pagamento da fatura não devem ser contabilizados como duas despesas de consumo.
- Guardar valores monetários com precisão decimal apropriada; não usar ponto flutuante binário para cálculos financeiros.
- Definir e documentar regras para datas, fuso horário, fechamento e vencimento de faturas, parcelas, recorrências e estornos.

## 3. Arquitetura e hospedagem

A arquitetura deve evitar servidores persistentes:

- **Frontend:** aplicação web moderna, preferencialmente React + TypeScript (ou a stack aprovada no planejamento), hospedada na Vercel.
- **Backend & Inteligência Artificial:** funções serverless da Vercel para endpoints seguros e orquestração de IA via LangChain (`@langchain/openai`, `@langchain/core`) utilizando a OpenAI API (`OPENAI_API_KEY`) para interpretação de linguagem natural, function calling / tools, categorização automática e insights. Não presumir que o frontend pode executar com segurança operações privilegiadas.
- **Banco de dados:** Supabase PostgreSQL com RLS.
- **Telegram:** Telegram Bot API usando webhook apontado para uma função serverless da Vercel integrada ao agente LangChain.
- **Arquivos importados:** avaliar armazenamento do Supabase Storage ou alternativa compatível com o plano gratuito. Não armazenar arquivos sensíveis publicamente.
- **Controle de versão:** Git.

Verificar os limites, políticas de inatividade, cotas e preços atuais de cada serviço antes de depender de uma funcionalidade. Priorizar o plano gratuito, mas não prometer disponibilidade ou custo zero permanente.

Não adicionar VPS, Docker em servidor próprio, processos persistentes ou dependência de um PC ligado continuamente sem aprovação explícita.

## 4. Segurança obrigatória

- Nunca colocar tokens do Telegram, `OPENAI_API_KEY`, `service_role` do Supabase, chaves privadas ou outros segredos no frontend ou no repositório.
- Usar variáveis de ambiente na Vercel e manter `.env.example` apenas com nomes e exemplos fictícios.
- Usar Supabase Auth quando houver autenticação web e configurar Row Level Security (RLS) em todas as tabelas acessíveis pelo cliente.
- Validar identidade e autorização no servidor em cada endpoint.
- Validar o segredo do webhook do Telegram e autorizar explicitamente os IDs de usuário/chat permitidos.
- Validar e limitar tamanho, formato e conteúdo de arquivos importados; tratar todo arquivo como entrada não confiável.
- Não executar macros, fórmulas, scripts ou conteúdo ativo de arquivos enviados.
- Evitar expor informações financeiras em logs; não registrar tokens ou dados bancários sensíveis desnecessariamente.
- Não confiar em validações feitas exclusivamente no frontend.
- Aplicar proteção contra requisições repetidas e duplicação de lançamentos, incluindo tratamento idempotente de atualizações do Telegram e importações.
- Não afirmar que uma operação foi concluída antes de confirmar a persistência no banco.

## 5. Princípios de desenvolvimento

1. Antes de mudar código, leia este arquivo, o `README.md`, os documentos relevantes em `docs/` e inspecione a implementação existente.
2. Não invente funcionalidades já concluídas. Confirme no código, nas migrations e nos testes.
3. Planeje tarefas grandes em etapas pequenas, com critérios objetivos de aceitação.
4. Prefira código simples, modular, tipado e testável. Evite abstrações prematuras.
5. Separe interface, regras de negócio, acesso a dados e integração com serviços externos.
6. Não duplicar regras financeiras entre Telegram e dashboard: ambos devem usar a mesma lógica de domínio ou os mesmos serviços de backend.
7. Não incluir dependências, serviços pagos ou APIs de IA pagas sem avaliar alternativas e obter aprovação.
8. Nunca modificar schema, apagar dados, aplicar migrações destrutivas ou alterar credenciais de produção sem explicar o impacto e obter autorização.
9. Não guardar segredos reais em arquivos de documentação, testes, screenshots ou commits.
10. Se houver ambiguidade em regras financeiras que possa afetar os saldos, explicitar a suposição ou perguntar antes de implementar.

## 6. Testes e validação

- Criar testes para cálculos de saldo, totais mensais, filtros, parcelas, recorrências e prevenção de dupla contagem.
- Testar importações com cabeçalhos diferentes, linhas inválidas, datas ambíguas, valores em formato brasileiro e transações duplicadas.
- Testar autorização para garantir que um usuário não consiga acessar dados de outro.
- Testar falhas de rede, indisponibilidade do Supabase, mensagens malformadas e reenvio de webhooks.
- Executar os testes pertinentes e informar quais passaram, falharam ou não foram executados. Nunca alegar testes não realizados.
- Manter migrations versionadas e revisar alterações no banco.

## 7. Documentação e continuidade entre IAs

Ao iniciar uma tarefa:
1. Ler o `README.md` e este `AGENTS.md`.
2. Consultar `docs/TASKS.md`, se existir, e os documentos relevantes.
3. Conferir o estado real do repositório, das migrations e dos testes.
4. Apresentar um plano curto para mudanças com múltiplas etapas.

Ao terminar:
1. Atualizar o status das tarefas no documento de planejamento existente.
2. Atualizar a documentação se houver mudança de arquitetura, esquema, configuração ou comportamento.
3. Registrar decisões técnicas relevantes quando houver consequências duradouras.
4. Informar arquivos alterados, validações executadas, pendências, limitações e próximo passo.
5. Não marcar como concluído algo que não foi implementado ou validado.

## 8. Escopo inicial sugerido (MVP)

1. Criar estrutura do projeto e configuração segura.
2. Configurar Supabase, autenticação e políticas de acesso.
3. Implementar cadastro manual de receitas e despesas.
4. Implementar consultas e dashboard mensal básico.
5. Conectar o Telegram por webhook serverless.
6. Adicionar importação de CSV e planilhas com pré-visualização e confirmação.
7. Adicionar suporte a formatos de extratos e faturas com mapeamento de colunas e prevenção de duplicidades.
8. Evoluir para parcelas, recorrências, compromissos futuros e análises avançadas.

A ordem pode mudar por decisão explícita, mas cada fase deve ter critérios de aceitação e testes.
