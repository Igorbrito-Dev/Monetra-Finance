import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database';

export function createFinanceTools(userId: string, supabase: SupabaseClient<Database>) {
  /**
   * Tool: Criar Transação Financeira
   */
  const criarTransacaoTool = tool(
    async ({ descricao, valor, tipo, formaPagamento, dataTransacao, categoriaNome }) => {
      try {
        let categoryId: string | null = null;

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
          }
        }

        // Se forma de pagamento for débito ou pix, busca uma conta principal
        let accountId: string | null = null;
        let creditCardId: string | null = null;

        if (formaPagamento === 'credit') {
          const { data: userCards } = await supabase
            .from('credit_cards')
            .select('id, name')
            .eq('user_id', userId)
            .limit(1);

          if (userCards && userCards.length > 0) {
            creditCardId = userCards[0].id;
          }
        } else {
          const { data: userAccounts } = await supabase
            .from('accounts')
            .select('id, name')
            .eq('user_id', userId)
            .limit(1);

          if (userAccounts && userAccounts.length > 0) {
            accountId = userAccounts[0].id;
          }
        }

        const today = new Date().toISOString().split('T')[0];
        const dateToUse = dataTransacao || today;

        const { data, error } = await supabase
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
          return `Erro ao salvar lançamento no banco: ${error.message}`;
        }

        return `✅ ${tipo === 'income' ? 'Receita' : 'Despesa'} registrada com sucesso!\n• Descrição: ${descricao}\n• Valor: R$ ${valor.toFixed(2)}\n• Forma: ${formaPagamento.toUpperCase()}\n• Data: ${dateToUse}`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        return `Falha na operação: ${msg}`;
      }
    },
    {
      name: 'criar_transacao',
      description: 'Registra uma nova receita ou despesa financeira para o usuário no banco de dados.',
      schema: z.object({
        descricao: z.string().describe('Descrição clara do lançamento (ex: Almoço no restaurante, Abastecimento, Freela)'),
        valor: z.number().positive().describe('Valor numérico da transação em reais (ex: 45.50, 120.00)'),
        tipo: z.enum(['income', 'expense']).describe('Tipo da movimentação: expense para despesa/gasto, income para receita/ganho'),
        formaPagamento: z.enum(['pix', 'credit', 'debit', 'cash', 'transfer', 'boleto', 'other']).describe('Forma de pagamento utilizada'),
        dataTransacao: z.string().optional().describe('Data da transação no formato YYYY-MM-DD. Se não informado, usar a data de hoje'),
        categoriaNome: z.string().optional().describe('Nome ou sugestão de categoria (ex: Alimentação, Transporte, Lazer, Salário)'),
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

        if (error) return `Erro ao consultar contas: ${error.message}`;
        if (!accounts || accounts.length === 0) return 'Você ainda não possui contas bancárias cadastradas.';

        const total = accounts.reduce((acc, curr) => acc + Number(curr.current_balance || 0), 0);
        const details = accounts
          .map((a) => `• ${a.name}: R$ ${Number(a.current_balance).toFixed(2)}`)
          .join('\n');

        return `💰 Saldo Consolidado: R$ ${total.toFixed(2)}\n\nDetalhamento por conta:\n${details}`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro';
        return `Erro ao consultar saldo: ${msg}`;
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
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('amount, type, is_invoice_payment')
          .eq('user_id', userId)
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate);

        if (error) return `Erro ao buscar transações: ${error.message}`;

        let totalExpense = 0;
        let totalIncome = 0;

        for (const t of transactions || []) {
          if (t.type === 'expense' && !t.is_invoice_payment) {
            totalExpense += Number(t.amount);
          } else if (t.type === 'income') {
            totalIncome += Number(t.amount);
          }
        }

        return `📊 Resumo do Mês (${month}/${year}):\n• Total de Despesas de Consumo: R$ ${totalExpense.toFixed(2)}\n• Total de Receitas: R$ ${totalIncome.toFixed(2)}\n• Balanço Atual: R$ ${(totalIncome - totalExpense).toFixed(2)}`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro';
        return `Erro ao buscar resumo: ${msg}`;
      }
    },
    {
      name: 'consultar_gastos_mes',
      description: 'Consulta o total de despesas e receitas do mês atual do usuário.',
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

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
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
          return `📊 Gastos acumulados neste mês: R$ ${totalExpense.toFixed(2)}.\n\n💡 Você ainda não configurou um limite de gastos mensal. Diga "Definir meu limite em R$ 3.000" para ativar alertas de controle.`;
        }

        const percentage = Math.round((totalExpense / limit) * 100);
        const remaining = Math.max(0, limit - totalExpense);

        let alertMsg = '';
        if (percentage >= 100) {
          alertMsg = `\n\n🚨 <b>ALERTA DE ORÇAMENTO:</b> Você já atingiu <b>${percentage}%</b> do seu limite e estourou seu teto em R$ ${(totalExpense - limit).toFixed(2)}! Tenha cuidado com novos gastos.`;
        } else if (percentage >= 80) {
          alertMsg = `\n\n⚠️ <b>ATENÇÃO:</b> Você já consumiu <b>${percentage}%</b> do seu teto mensal de gastos! Restam apenas R$ ${remaining.toFixed(2)}. Tenha cuidado com gastos desnecessários.`;
        } else {
          alertMsg = `\n\n✅ Orçamento sob controle (${percentage}% consumido).`;
        }

        return `🎯 <b>Limite & Orçamento Mensal:</b>\n• Teto Estipulado: R$ ${limit.toFixed(2)}\n• Gasto Acumulado: R$ ${totalExpense.toFixed(2)}\n• Limite Restante Disponível: R$ ${remaining.toFixed(2)}${alertMsg}`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro';
        return `Erro ao consultar limite: ${msg}`;
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

        if (error) return `Erro ao configurar teto: ${error.message}`;

        return `🎯 Teto de gastos mensal definido para <b>R$ ${novoLimite.toFixed(2)}</b> com sucesso! O sistema avisará quando você se aproximar desse valor.`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro';
        return `Erro ao definir limite: ${msg}`;
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
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        if (periodo === 'hoje') {
          const { data: txs, error } = await supabase
            .from('transactions')
            .select('description, amount, type')
            .eq('user_id', userId)
            .eq('transaction_date', todayStr);

          if (error) return `Erro ao buscar gastos de hoje: ${error.message}`;
          if (!txs || txs.length === 0) return 'Você não possui nenhum lançamento registrado hoje.';

          let sumExpenses = 0;
          let sumIncomes = 0;
          const items = txs.map((t) => {
            if (t.type === 'expense') sumExpenses += Number(t.amount);
            else sumIncomes += Number(t.amount);
            return `• ${t.description}: R$ ${Number(t.amount).toFixed(2)}`;
          }).join('\n');

          return `📅 <b>Lançamentos de Hoje (${todayStr}):</b>\n${items}\n\nTotal de despesas hoje: R$ ${sumExpenses.toFixed(2)}\nTotal de receitas hoje: R$ ${sumIncomes.toFixed(2)}`;
        }

        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

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

        if (error) return `Erro ao consultar compromissos: ${error.message}`;

        let cardExpenses = 0;
        let otherExpenses = 0;
        const details: string[] = [];

        for (const t of txs || []) {
          if (t.type === 'expense') {
            const val = Number(t.amount);
            if (t.payment_method === 'credit' || t.credit_card_id) {
              cardExpenses += val;
              const inst = t.installment_number && t.total_installments ? ` (${t.installment_number}/${t.total_installments}x)` : '';
              details.push(`• 💳 ${t.description}${inst}: R$ ${val.toFixed(2)}`);
            } else {
              otherExpenses += val;
              details.push(`• 📄 ${t.description}: R$ ${val.toFixed(2)}`);
            }
          }
        }

        const monthName = new Date(targetYear, targetMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        return `💳 <b>Fatura & Compromissos de ${monthName}:</b>\n• Total da Fatura de Cartão: R$ ${cardExpenses.toFixed(2)}\n• Outras Despesas Previstas: R$ ${otherExpenses.toFixed(2)}\n• <b>Total Geral: R$ ${(cardExpenses + otherExpenses).toFixed(2)}</b>\n\n${details.length > 0 ? 'Detalhamento:\n' + details.slice(0, 8).join('\n') : 'Nenhuma parcela ou despesa futura registrada para este período.'}`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro';
        return `Erro ao consultar faturas: ${msg}`;
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
    return '⚠️ OPENAI_API_KEY não configurada no ambiente da Vercel. Por favor, adicione sua chave nas variáveis de ambiente.';
  }

  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0,
    openAIApiKey: apiKey,
  });

  const tools = createFinanceTools(userId, supabase);
  const modelWithTools = model.bindTools(tools);

  const systemPrompt = `Você é o Monetra Assistant, o assistente inteligente de gestão financeira pessoal do usuário.
Suas diretrizes:
1. Responda SEMPRE em Português do Brasil de forma amigável, concisa e direta.
2. Quando o usuário disser que gastou, comprou ou recebeu algo (ex: "gastei 35 de combustível no pix", "comprei uma pizza"), execute imediatamente a ferramenta 'criar_transacao' com os parâmetros corretos.
3. Se o usuário perguntar o saldo geral, use a ferramenta 'consultar_saldo'.
4. Se o usuário perguntar os gastos do mês, use 'consultar_gastos_mes'.
5. Se o usuário perguntar quanto ainda pode gastar, qual é o seu limite, ou quanto já comprometeu do teto, use 'consultar_limite_gastos'.
6. Se o usuário pedir para definir, alterar ou ajustar seu limite/teto mensal de gastos (ex: "defina meu limite em 2500"), use 'definir_limite_gastos'.
7. Se o usuário perguntar sobre gastos de hoje, da fatura deste mês, da fatura do mês que vem ou compromissos futuros, use 'consultar_faturas_compromissos'.
8. Se faltar informação em um lançamento, utilize valores padrão razoáveis (ex: data de hoje, forma de pagamento pix ou débito se não especificado) e confirme o que foi gravado.
9. Nunca exponha chaves secretas ou IDs técnicos de banco.`;

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
        // Executa a tool
        const toolResult = await (selectedTool as any).invoke(toolCall.args);
        return String(toolResult);
      }
    }

    return response.content as string;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro ao processar mensagem com IA';
    console.error('Erro no agente LangChain:', err);
    return `Desculpe, ocorreu uma instabilidade ao processar sua solicitação: ${errorMsg}`;
  }
}
