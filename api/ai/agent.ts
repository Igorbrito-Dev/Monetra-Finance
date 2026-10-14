import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database';

/**
 * Retorna componentes de data e hora rigorosamente calculados no fuso horário oficial de Brasília (America/Sao_Paulo).
 * Garante que lançamentos e consultas coincidam com o dia civil do usuário no Brasil,
 * independente da localização dos servidores da Vercel (geralmente UTC).
 */
export function getBrasiliaDateParts() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const year = parseInt(get('year'), 10);
  const month = parseInt(get('month'), 10);
  const day = parseInt(get('day'), 10);
  const monthFormatted = get('month');
  const dayFormatted = get('day');
  const timeStr = `${get('hour')}:${get('minute')}`;
  const dateStr = `${year}-${monthFormatted}-${dayFormatted}`;
  const formattedDate = `${dayFormatted}/${monthFormatted}/${year}`;

  return { dateStr, formattedDate, timeStr, year, month, day, monthFormatted };
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  credit: 'Cartão de Crédito',
  debit: 'Cartão de Débito',
  cash: 'Dinheiro',
  transfer: 'Transferência Bancária',
  boleto: 'Boleto',
  other: 'Outro',
};

export function createFinanceTools(userId: string, supabase: SupabaseClient<Database>) {
  /**
   * Tool: Criar Transação Financeira
   */
  const criarTransacaoTool = tool(
    async ({ descricao, valor, tipo, formaPagamento, dataTransacao, categoriaNome, contaNome, cartaoNome }) => {
      try {
        let categoryId: string | null = null;
        let categoryDisplayName: string | null = null;

        // Se uma categoria foi sugerida, busca ou infere a categoria existente do usuário
        if (categoriaNome) {
          const { data: userCategories } = await supabase
            .from('categories')
            .select('id, name')
            .eq('user_id', userId)
            .ilike('name', `%${categoriaNome}%`)
            .limit(1);

          if (userCategories && userCategories.length > 0) {
            categoryId = userCategories[0].id;
            categoryDisplayName = userCategories[0].name;
          } else {
            categoryDisplayName = categoriaNome;
          }
        }

        let accountId: string | null = null;
        let creditCardId: string | null = null;
        let accountOrCardDisplayName: string | null = null;

        if (formaPagamento === 'credit') {
          // Busca cartão informado ou o primeiro do usuário
          let query = supabase.from('credit_cards').select('id, name').eq('user_id', userId);
          if (cartaoNome) {
            query = query.ilike('name', `%${cartaoNome}%`);
          }
          const { data: userCards } = await query.limit(1);

          if (userCards && userCards.length > 0) {
            creditCardId = userCards[0].id;
            accountOrCardDisplayName = userCards[0].name;
          } else if (cartaoNome) {
            // Tenta qualquer cartão se o filtro específico não bateu
            const { data: anyCard } = await supabase.from('credit_cards').select('id, name').eq('user_id', userId).limit(1);
            if (anyCard && anyCard.length > 0) {
              creditCardId = anyCard[0].id;
              accountOrCardDisplayName = anyCard[0].name;
            }
          }
        } else {
          // Busca conta informada ou a principal do usuário
          let query = supabase.from('accounts').select('id, name').eq('user_id', userId);
          if (contaNome) {
            query = query.ilike('name', `%${contaNome}%`);
          }
          const { data: userAccounts } = await query.limit(1);

          if (userAccounts && userAccounts.length > 0) {
            accountId = userAccounts[0].id;
            accountOrCardDisplayName = userAccounts[0].name;
          } else if (contaNome) {
            // Tenta primeira conta cadastrada
            const { data: anyAccount } = await supabase.from('accounts').select('id, name').eq('user_id', userId).limit(1);
            if (anyAccount && anyAccount.length > 0) {
              accountId = anyAccount[0].id;
              accountOrCardDisplayName = anyAccount[0].name;
            }
          }
        }

        const { dateStr: brasiliaDateStr, timeStr: brasiliaTimeStr } = getBrasiliaDateParts();
        const dateToUse = dataTransacao || brasiliaDateStr;

        const { error } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            description: descricao,
            amount: valor,
            type: tipo,
            payment_method: formaPagamento,
            transaction_date: dateToUse,
            category_id: categoryId,
            account_id: accountId,
            credit_card_id: creditCardId,
            is_paid: true,
            is_invoice_payment: false,
          })
          .select()
          .single();

        if (error) {
          return `⚠️ <b>Erro ao salvar lançamento no banco:</b> ${error.message}`;
        }

        const formaLabel = paymentMethodLabels[formaPagamento] || formaPagamento.toUpperCase();
        const [ano, mes, dia] = dateToUse.split('-');
        const dataExibicao = dia && mes && ano ? `${dia}/${mes}/${ano}` : dateToUse;

        return `✅ <b>${tipo === 'income' ? 'Receita' : 'Despesa'} registrada com sucesso!</b>\n\n` +
          `${tipo === 'income' ? '💰' : '💸'} <b>Valor:</b> <code>R$ ${formatBRL(valor)}</code>\n` +
          `📝 <b>Descrição:</b> ${descricao}\n` +
          (categoryDisplayName ? `🏷️ <b>Categoria:</b> ${categoryDisplayName}\n` : '') +
          (accountOrCardDisplayName ? `${formaPagamento === 'credit' ? '💳' : '🏦'} <b>${formaPagamento === 'credit' ? 'Cartão' : 'Conta'}:</b> ${accountOrCardDisplayName}\n` : '') +
          `🔄 <b>Forma de Pagamento:</b> ${formaLabel}\n` +
          `📅 <b>Data:</b> ${dataExibicao} às ${brasiliaTimeStr} <i>(Horário de Brasília)</i>`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        return `⚠️ <b>Falha na operação:</b> ${msg}`;
      }
    },
    {
      name: 'criar_transacao',
      description: 'Registra uma nova receita ou despesa financeira para o usuário no banco de dados. SÓ deve ser chamada quando a forma de pagamento for conhecida.',
      schema: z.object({
        descricao: z.string().describe('Descrição clara do lançamento (ex: Almoço no restaurante, Abastecimento, Freela)'),
        valor: z.number().positive().describe('Valor numérico da transação em reais (ex: 45.50, 120.00)'),
        tipo: z.enum(['income', 'expense']).describe('Tipo da movimentação: expense para despesa/gasto, income para receita/ganho'),
        formaPagamento: z.enum(['pix', 'credit', 'debit', 'cash', 'transfer', 'boleto', 'other']).describe('Forma de pagamento utilizada'),
        dataTransacao: z.string().optional().describe('Data da transação no formato YYYY-MM-DD. Se não informado, utilizar a data atual de Brasília'),
        categoriaNome: z.string().optional().describe('Nome ou sugestão de categoria (ex: Alimentação, Transporte, Lazer, Salário)'),
        contaNome: z.string().optional().describe('Nome da conta bancária de origem/destino (ex: Nubank, Itaú, Carteira)'),
        cartaoNome: z.string().optional().describe('Nome do cartão de crédito utilizado, caso seja pagamento em crédito'),
      }),
    }
  );

  /**
   * Tool: Consultar Saldo Geral
   */
  const consultarSaldoTool = tool(
    async () => {
      try {
        const { data: accounts, error } = await supabase
          .from('accounts')
          .select('name, current_balance, type')
          .eq('user_id', userId);

        if (error) return `⚠️ Erro ao consultar contas: ${error.message}`;
        if (!accounts || accounts.length === 0) {
          return 'ℹ️ <b>Você ainda não possui contas bancárias cadastradas.</b>\nAcesse a aba <b>Contas</b> no painel web para adicionar.';
        }

        const total = accounts.reduce((acc, curr) => acc + Number(curr.current_balance || 0), 0);
        const details = accounts
          .map((a) => `• 🏦 <b>${a.name}:</b> <code>R$ ${formatBRL(Number(a.current_balance))}</code>`)
          .join('\n');

        return `💰 <b>Saldo Consolidado</b>\n\n` +
          `<b>Detalhamento por Conta:</b>\n${details}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `💵 <b>Total Geral em Contas:</b> <code>R$ ${formatBRL(total)}</code>`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro';
        return `⚠️ Erro ao consultar saldo: ${msg}`;
      }
    },
    {
      name: 'consultar_saldo',
      description: 'Consulta o saldo consolidado de todas as contas bancárias e carteiras do usuário.',
      schema: z.object({}),
    }
  );

  /**
   * Tool: Consultar Gastos do Mês
   */
  const consultarGastosMesTool = tool(
    async () => {
      try {
        const { year, monthFormatted: month } = getBrasiliaDateParts();
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, parseInt(month, 10), 0).getDate();
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('amount, type, is_invoice_payment')
          .eq('user_id', userId)
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate);

        if (error) return `⚠️ Erro ao buscar transações: ${error.message}`;

        let totalExpense = 0;
        let totalIncome = 0;

        for (const t of transactions || []) {
          if (t.type === 'expense' && !t.is_invoice_payment) {
            totalExpense += Number(t.amount);
          } else if (t.type === 'income') {
            totalIncome += Number(t.amount);
          }
        }

        const balance = totalIncome - totalExpense;
        const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date());
        const nomeMesCapitalized = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

        return `📊 <b>Resumo Financeiro — ${nomeMesCapitalized} de ${year}</b>\n\n` +
          `💸 <b>Despesas de Consumo:</b> <code>R$ ${formatBRL(totalExpense)}</code>\n` +
          `💰 <b>Receitas Recebidas:</b> <code>R$ ${formatBRL(totalIncome)}</code>\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `${balance >= 0 ? '🟢' : '🔴'} <b>Balanço do Mês:</b> <code>R$ ${formatBRL(balance)}</code>`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro';
        return `⚠️ Erro ao buscar resumo: ${msg}`;
      }
    },
    {
      name: 'consultar_gastos_mes',
      description: 'Consulta o total de despesas e receitas do mês atual do usuário no horário de Brasília.',
      schema: z.object({}),
    }
  );

  /**
   * Tool: Consultar Limite e Teto Orçamentário
   */
  const consultarLimiteGastosTool = tool(
    async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('monthly_budget')
          .eq('id', userId)
          .single();

        const limit = Number(profile?.monthly_budget || 0);

        const { year, monthFormatted: month } = getBrasiliaDateParts();
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, parseInt(month, 10), 0).getDate();
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

        const { data: txs } = await supabase
          .from('transactions')
          .select('amount, type, is_invoice_payment')
          .eq('user_id', userId)
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate);

        let totalExpense = 0;
        for (const t of txs || []) {
          if (t.type === 'expense' && !t.is_invoice_payment) {
            totalExpense += Number(t.amount);
          }
        }

        if (!limit || limit <= 0) {
          return `📊 <b>Gastos acumulados neste mês:</b> <code>R$ ${formatBRL(totalExpense)}</code>\n\n` +
            `💡 <i>Você ainda não configurou um teto de gastos mensal.</i>\n` +
            `Diga por exemplo <i>"Definir meu limite em R$ 3.000"</i> para ativar alertas automáticos.`;
        }

        const percentage = Math.round((totalExpense / limit) * 100);
        const remaining = Math.max(0, limit - totalExpense);

        let alertMsg = '';
        if (percentage >= 100) {
          alertMsg = `\n\n🚨 <b>ALERTA DE TETO ESTOURADO:</b> Você atingiu <b>${percentage}%</b> do limite e ultrapassou o teto em <code>R$ ${formatBRL(totalExpense - limit)}</code>!`;
        } else if (percentage >= 80) {
          alertMsg = `\n\n⚠️ <b>ATENÇÃO AO ORÇAMENTO:</b> Você já consumiu <b>${percentage}%</b> do seu teto mensal! Restam apenas <code>R$ ${formatBRL(remaining)}</code> disponíveis.`;
        } else {
          alertMsg = `\n\n✅ <b>Orçamento sob controle:</b> ${percentage}% do teto consumido.`;
        }

        return `🎯 <b>Controle de Teto & Limite Mensal</b>\n\n` +
          `📌 <b>Teto Estipulado:</b> <code>R$ ${formatBRL(limit)}</code>\n` +
          `💸 <b>Gasto Acumulado:</b> <code>R$ ${formatBRL(totalExpense)}</code> (<b>${percentage}%</b>)\n` +
          `🛡️ <b>Limite Restante:</b> <code>R$ ${formatBRL(remaining)}</code>\n` +
          `━━━━━━━━━━━━━━━━━━━━━${alertMsg}`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro';
        return `⚠️ Erro ao consultar limite: ${msg}`;
      }
    },
    {
      name: 'consultar_limite_gastos',
      description: 'Consulta o teto mensal de gastos, quanto o usuário já consumiu, quanto limite ainda resta e alerta se estiver próximo ou acima de 80%.',
      schema: z.object({}),
    }
  );

  /**
   * Tool: Definir Limite de Gastos Mensal
   */
  const definirLimiteGastosTool = tool(
    async ({ novoLimite }) => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ monthly_budget: novoLimite })
          .eq('id', userId);

        if (error) return `⚠️ Erro ao configurar teto: ${error.message}`;

        return `🎯 <b>Novo Teto Mensal Configurado!</b>\n\n` +
          `📌 <b>Limite Definido:</b> <code>R$ ${formatBRL(novoLimite)}</code>\n\n` +
          `<i>Você receberá alertas automáticos sempre que atingir ou ultrapassar 80% deste valor ao longo do mês.</i>`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro';
        return `⚠️ Erro ao definir limite: ${msg}`;
      }
    },
    {
      name: 'definir_limite_gastos',
      description: 'Configura ou atualiza o teto/limite de gastos mensal do usuário.',
      schema: z.object({
        novoLimite: z.number().positive().describe('Novo valor do limite mensal em reais'),
      }),
    }
  );

  /**
   * Tool: Consultar Faturas de Cartão e Compromissos Futuros
   */
  const consultarFaturasCompromissosTool = tool(
    async ({ periodo }) => {
      try {
        const { dateStr: brasiliaTodayStr, year: currentYear, month: currentMonth } = getBrasiliaDateParts();

        if (periodo === 'hoje') {
          const { data: txs, error } = await supabase
            .from('transactions')
            .select('description, amount, type')
            .eq('user_id', userId)
            .eq('transaction_date', brasiliaTodayStr);

          if (error) return `⚠️ Erro ao buscar gastos de hoje: ${error.message}`;
          if (!txs || txs.length === 0) {
            const [ano, mes, dia] = brasiliaTodayStr.split('-');
            return `📅 <b>Lançamentos de Hoje (${dia}/${mes}/${ano}):</b>\n\n<i>Você ainda não registrou nenhum gasto ou receita hoje.</i>`;
          }

          let sumExpenses = 0;
          let sumIncomes = 0;
          const items = txs.map((t) => {
            if (t.type === 'expense') {
              sumExpenses += Number(t.amount);
              return `• 💸 <b>${t.description}:</b> <code>R$ ${formatBRL(Number(t.amount))}</code>`;
            } else {
              sumIncomes += Number(t.amount);
              return `• 💰 <b>${t.description}:</b> <code>R$ ${formatBRL(Number(t.amount))}</code>`;
            }
          }).join('\n');

          const [ano, mes, dia] = brasiliaTodayStr.split('-');
          return `📅 <b>Lançamentos de Hoje (${dia}/${mes}/${ano} — Brasília):</b>\n\n` +
            `${items}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `💸 <b>Total Despesas Hoje:</b> <code>R$ ${formatBRL(sumExpenses)}</code>\n` +
            `💰 <b>Total Receitas Hoje:</b> <code>R$ ${formatBRL(sumIncomes)}</code>`;
        }

        let targetYear = currentYear;
        let targetMonth = currentMonth;

        if (periodo === 'mes_seguinte') {
          targetMonth += 1;
          if (targetMonth > 12) {
            targetMonth = 1;
            targetYear += 1;
          }
        }

        const startMonthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(targetYear, targetMonth, 0).getDate();
        const endMonthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const { data: txs, error } = await supabase
          .from('transactions')
          .select('description, amount, type, payment_method, installment_number, total_installments, credit_card_id')
          .eq('user_id', userId)
          .gte('transaction_date', startMonthStr)
          .lte('transaction_date', endMonthStr);

        if (error) return `⚠️ Erro ao consultar compromissos: ${error.message}`;

        let cardExpenses = 0;
        let otherExpenses = 0;
        const details: string[] = [];

        for (const t of txs || []) {
          if (t.type === 'expense') {
            const val = Number(t.amount);
            if (t.payment_method === 'credit' || t.credit_card_id) {
              cardExpenses += val;
              const inst = t.installment_number && t.total_installments ? ` <i>(${t.installment_number}/${t.total_installments}x)</i>` : '';
              details.push(`• 💳 <b>${t.description}</b>${inst}: <code>R$ ${formatBRL(val)}</code>`);
            } else {
              otherExpenses += val;
              details.push(`• 📄 <b>${t.description}:</b> <code>R$ ${formatBRL(val)}</code>`);
            }
          }
        }

        const monthName = new Date(targetYear, targetMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const monthNameCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);

        return `💳 <b>Fatura & Compromissos de ${monthNameCap}</b>\n\n` +
          `💳 <b>Fatura de Cartões:</b> <code>R$ ${formatBRL(cardExpenses)}</code>\n` +
          `📄 <b>Outras Despesas Previstas:</b> <code>R$ ${formatBRL(otherExpenses)}</code>\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `💵 <b>Total Estimado:</b> <code>R$ ${formatBRL(cardExpenses + otherExpenses)}</code>\n\n` +
          `${details.length > 0 ? '<b>Detalhamento de Lançamentos:</b>\n' + details.slice(0, 10).join('\n') : '<i>Nenhuma parcela ou despesa futura registrada para este período.</i>'}`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro';
        return `⚠️ Erro ao consultar faturas: ${msg}`;
      }
    },
    {
      name: 'consultar_faturas_compromissos',
      description: 'Consulta faturas de cartão de crédito e compromissos futuros: gastos de hoje, da fatura deste mês ou da fatura do mês seguinte (parcelas futuras).',
      schema: z.object({
        periodo: z.enum(['hoje', 'mes_atual', 'mes_seguinte']).describe('Período da consulta: hoje, mes_atual ou mes_seguinte'),
      }),
    }
  );

  return [
    criarTransacaoTool,
    consultarSaldoTool,
    consultarGastosMesTool,
    consultarLimiteGastosTool,
    definirLimiteGastosTool,
    consultarFaturasCompromissosTool,
  ];
}

/**
 * Orquestrador do Agente LangChain com OpenAI
 */
export async function runFinanceAgent(
  userId: string,
  userMessage: string,
  supabase: SupabaseClient<Database>
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return '⚠️ <b>OPENAI_API_KEY</b> não configurada no ambiente da Vercel. Por favor, adicione sua chave nas variáveis de ambiente.';
  }

  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0,
    openAIApiKey: apiKey,
  });

  const tools = createFinanceTools(userId, supabase);
  const modelWithTools = model.bindTools(tools);

  // Busca contas e cartões do usuário para enriquecer o contexto de diálogo do assistente
  const { data: userAccounts } = await supabase
    .from('accounts')
    .select('name, type')
    .eq('user_id', userId);

  const { data: userCards } = await supabase
    .from('credit_cards')
    .select('name')
    .eq('user_id', userId);

  const accountsList = (userAccounts || []).map((a) => a.name).join(', ') || 'Nenhuma conta cadastrada';
  const cardsList = (userCards || []).map((c) => c.name).join(', ') || 'Nenhum cartão cadastrado';
  const { formattedDate: hojeBrasilia, timeStr: horaBrasilia, dateStr: dataIsoBrasilia } = getBrasiliaDateParts();

  const systemPrompt = `Você é o Monetra Assistant, o assistente inteligente de gestão financeira pessoal do usuário.
Você se comunica pelo Telegram e suas respostas devem ser extremamente bem diagramadas, organizadas e agradáveis de ler.

📅 Data e Hora Atual de Brasília: ${hojeBrasilia} às ${horaBrasilia} (Data ISO: ${dataIsoBrasilia}).
🏦 Contas cadastradas do usuário: ${accountsList}
💳 Cartões de crédito cadastrados: ${cardsList}

DIRETRIZES DE FORMATAÇÃO E COMPORTAMENTO (OBRIGATÓRIAS):
1. Responda SEMPRE em Português do Brasil com formatação HTML nativa do Telegram.
   - Use <b>negrito</b> para títulos, rótulos e termos importantes.
   - Use <code>R$ 0,00</code> para valores numéricos e dinheiro.
   - Use emojis pertinentes (💸, 💰, 💳, 🏦, 📅, 📊, 🎯, 🏷️, 🚨).
   - NUNCA envie textos amontoados em um único bloco. Use quebras de linha duplas para espaçamento limpo e elegante.

2. REGRA MANDATÓRIA PARA REGISTRO DE TRANSAÇÕES (DESPESAS E RECEITAS):
   - Para registrar uma despesa ou receita, são estritamente necessários: (1) Descrição, (2) Valor e (3) Forma de pagamento (ex: PIX, Cartão de Crédito, Débito, Dinheiro) e/ou a Conta/Cartão utilizada.
   - SE O USUÁRIO DISSER QUE GASTOU OU RECEBEU ALGO, MAS NÃO INFORMAR A FORMA DE PAGAMENTO OU CONTA:
     • NÃO invente nem deduza a forma de pagamento!
     • NÃO chame a ferramenta 'criar_transacao' ainda.
     • Responda educadamente perguntando qual foi a forma de pagamento e qual conta/cartão foi utilizado.
     • Exemplo de resposta para despesa sem forma de pagamento:
       "Entendido! Para registrar essa despesa de <code>R$ 45,00</code> no <b>Mercado</b>:\n\n💳 <b>Como você realizou esse pagamento?</b>\n(Ex: PIX, Cartão de Crédito, Débito ou Dinheiro? Se foi em uma conta ou cartão específico, me informe qual!)"
     • Exemplo de resposta para receita sem conta:
       "Excelente entrada! Para registrar esse ganho de <code>R$ 200,00</code>:\n\n🏦 <b>Em qual conta ou forma você recebeu esse valor?</b>\n(Ex: PIX no Nubank, Transferência, etc.)"

3. SE O USUÁRIO INFORMAR A FORMA DE PAGAMENTO (ou se já tiver informado tudo na mensagem, ex: "gastei 50 no mercado no pix nubank", "comprei remédio de 30 no cartão"):
   • Chame IMEDIATAMENTE a ferramenta 'criar_transacao' preenchendo todos os parâmetros disponíveis.

4. SE O USUÁRIO PERGUNTAR SALDO:
   • Use 'consultar_saldo'.

5. SE O USUÁRIO PERGUNTAR OS GASTOS DO MÊS:
   • Use 'consultar_gastos_mes'.

6. SE O USUÁRIO PERGUNTAR SOBRE LIMITE / TETO OU QUANTO AINDA PODE GASTAR:
   • Use 'consultar_limite_gastos'.

7. SE O USUÁRIO PEDIR PARA DEFINIR OU ALTERAR O LIMITE MENSAL:
   • Use 'definir_limite_gastos'.

8. SE O USUÁRIO PERGUNTAR GASTOS DE HOJE, FATURA DO CARTÃO OU PARCELAS FUTURAS:
   • Use 'consultar_faturas_compromissos'.

9. HORÁRIO E DATA: Considere sempre o fuso horário de Brasília (${hojeBrasilia}). Ao registrar uma transação realizada hoje, utilize ${dataIsoBrasilia}.
10. SEGURANÇA: Nunca divulgue credenciais, chaves de API, senhas ou IDs técnicos de banco.`;

  try {
    const response = await modelWithTools.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);

    // Se o modelo invocou ferramentas
    if (response.tool_calls && response.tool_calls.length > 0) {
      const toolCall = response.tool_calls[0];
      const selectedTool = tools.find((t) => t.name === toolCall.name);

      if (selectedTool) {
        const toolResult = await (selectedTool as any).invoke(toolCall.args);
        return String(toolResult);
      }
    }

    return response.content as string;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro ao processar mensagem com IA';
    console.error('Erro no agente LangChain:', err);
    return `⚠️ Desculpe, ocorreu uma instabilidade ao processar sua solicitação: ${errorMsg}`;
  }
}
