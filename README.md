# Sistema de Gestão Financeira

Sistema de gestão financeira pessoal com duas interfaces complementares: um bot no Telegram para registrar e consultar movimentações rapidamente e uma aplicação web com dashboard analítico, lançamentos manuais e importação de arquivos financeiros.

O projeto foi pensado para funcionar sem VPS, sem servidor dedicado e sem depender de um computador pessoal ligado continuamente, usando hospedagem e serviços gerenciados/serverless.

## Objetivos

- Registrar receitas e despesas por mensagens no Telegram.
- Registrar e administrar movimentações manualmente pela aplicação web.
- Importar planilhas, extratos bancários e faturas de cartão.
- Visualizar receitas, despesas, saldo e categorias em um dashboard.
- Consultar períodos anteriores, o mês atual e compromissos futuros.
- Organizar parcelas, recorrências e faturas sem duplicar despesas.
- Manter os dados privados e acessíveis somente a usuários autorizados.
- Começar com serviços gratuitos sempre que possível e acompanhar os limites de cada plano.

## Arquitetura planejada

```text
Telegram Bot
    |
    | Telegram Bot API / webhook
    v
Vercel Functions  <---->  Supabase PostgreSQL
    ^                          ^
    |                          |
    | API segura               | acesso protegido
    |                          |
Aplicação web na Vercel -------+
    |
    +-- Dashboard analítico
    +-- Cadastro manual
    +-- Importação e revisão de arquivos
```

### Componentes

- **Frontend web:** React + TypeScript é a opção inicial sugerida; a stack final deve ser confirmada antes da implementação.
- **Hospedagem web:** Vercel.
- **Backend:** funções serverless da Vercel para webhooks e operações que exigem validação ou acesso a segredos.
- **Banco de dados:** Supabase PostgreSQL.
- **Bot:** Telegram Bot API com webhook direcionado a uma função serverless.
- **Arquivos:** avaliar Supabase Storage ou alternativa compatível com os limites do plano utilizado.
- **Versionamento:** Git.

Não há previsão de manter um servidor persistente, uma VPS ou um computador ligado continuamente. Os planos gratuitos têm limites e condições que devem ser verificados antes da implantação; custo zero não é garantido indefinidamente.

## Funcionalidades previstas

### 1. Telegram

- Registrar uma despesa ou receita por mensagem.
- Receber confirmação após o lançamento ser salvo.
- Consultar saldo, gastos do mês e totais por categoria.
- Consultar informações de faturas e compromissos futuros conforme essas funções forem implementadas.
- Restringir o bot aos usuários autorizados.
- Suporte a mensagens de áudio é uma possível evolução, não um requisito do primeiro MVP.

Exemplo de interação planejada:

> Usuário: Gastei R$ 35,00 de gasolina no Pix.
>
> Bot: Despesa registrada — R$ 35,00, categoria Transporte, pagamento Pix.

A resposta acima é apenas um exemplo de comportamento esperado, não uma indicação de que o recurso já esteja implementado.

### 2. Dashboard web

- Resumo de receitas, despesas e saldo.
- Gráficos de evolução financeira.
- Gastos agrupados por categoria e forma de pagamento.
- Filtros por período e consulta de meses anteriores.
- Visão do mês atual e dos compromissos dos próximos meses.
- Consulta, edição e exclusão de lançamentos.
- Análises e relatórios que evoluam conforme as necessidades.

### 3. Cadastro manual

Permitir adicionar receitas e despesas, editar dados, categorizar lançamentos e informar datas, descrições e formas de pagamento.

### 4. Importação de arquivos

Permitir selecionar e importar arquivos como:

- CSV e planilhas compatíveis.
- Extratos bancários.
- Faturas de cartões de crédito.

O fluxo de importação deve mostrar uma prévia, permitir mapear colunas quando necessário, apontar linhas inválidas e possíveis duplicidades e exigir confirmação antes de salvar. O suporte exato a formatos de PDF ou arquivos específicos deve ser definido por etapas, pois nem todos os documentos possuem estrutura legível e padronizada.

### 5. Cartões, parcelas e recorrências

Planeja-se suportar compras parceladas, faturas, vencimentos, pagamentos e despesas recorrentes. A modelagem deve distinguir compras e despesas efetivas de pagamentos de fatura, evitando contabilizar a mesma despesa duas vezes. Compromissos futuros devem ser apresentados separadamente dos valores já realizados quando isso for relevante.

**Implementado:** o agente (Telegram e chat do app) mantém memória da conversa, registra vários lançamentos por mensagem e pergunta o que faltar (ex.: qual cartão). Compras parceladas no crédito caem na fatura correta conforme fechamento/vencimento do cartão (compra no dia do fechamento ou depois vai para a próxima fatura). Há contas fixas mensais com status por cor (verde pago, amarelo vence hoje, vermelho atrasado), anotações nos lançamentos, sino de notificações e lembretes/relatório diário no Telegram, configuráveis em **Mais**. Veja `docs/DEPLOYMENT.md` (seções 5.1 a 5.3) para a migration e o agendador.

## Segurança e privacidade

- Segredos ficam em variáveis de ambiente no backend, nunca no código do navegador.
- A chave privilegiada do Supabase não deve ser exposta ao frontend.
- As tabelas devem usar políticas RLS e regras de autorização adequadas.
- Os endpoints devem validar o usuário e os dados recebidos.
- O webhook do Telegram deve validar seu segredo e restringir os usuários permitidos.
- Arquivos importados são entradas não confiáveis e precisam ser validados.
- Dados financeiros não devem aparecer desnecessariamente em logs.
- Importações e webhooks devem tratar reenvios e duplicidades com segurança.

## Organização sugerida

A estrutura real pode evoluir durante o desenvolvimento. Uma proposta inicial:

```text
.
├── AGENTS.md
├── README.md
├── .env.example
├── docs/
│   ├── PROJECT.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── ROADMAP.md
│   ├── TASKS.md
│   ├── CHANGELOG.md
│   ├── decisions/
│   └── plans/
├── src/
├── api/
├── tests/
└── supabase/
    └── migrations/
```

Não criar diretórios vazios apenas para corresponder a esse desenho; adaptar a estrutura à stack escolhida e às convenções reais do projeto.

## Plano inicial

1. Definir stack e criar o repositório.
2. Preparar a aplicação e as variáveis de ambiente.
3. Criar o projeto Supabase, o esquema inicial e as políticas de acesso.
4. Implementar cadastro e consulta de receitas e despesas.
5. Criar o dashboard inicial.
6. Configurar o bot e o webhook serverless.
7. Implementar importação de CSV/planilhas com pré-visualização.
8. Expandir para extratos, faturas, parcelas, recorrências e relatórios avançados.
9. Testar segurança, cálculos e implantação.

A ordem deve ser refinada no documento de tarefas, com critérios de conclusão verificáveis.

## Desenvolvimento

Antes de implementar, leia `AGENTS.md` e a documentação pertinente em `docs/`. Confirme o estado real do código e das migrations; não presuma que funcionalidades descritas como planejadas já existem.

As instruções de instalação, execução local, testes, variáveis de ambiente e deploy devem ser preenchidas quando a stack e os comandos reais estiverem definidos. Nunca colocar valores secretos reais no `.env.example`.

## Estado do projeto

**Planejamento inicial.** As funcionalidades descritas neste README são objetivos e requisitos propostos; não significam que já estejam implementadas.
