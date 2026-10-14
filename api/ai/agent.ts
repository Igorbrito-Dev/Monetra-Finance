import { randomUUID } from 'node:crypto';
import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, AgentChannel } from '../../src/types/database';
import { splitInstallmentAmounts } from '../../src/lib/financeRules.js';
import { generateCardInstallmentSchedule, formatIsoDateBR } from '../../src/lib/creditCardRules.js';
import { escapeHtml } from '../_lib/telegram.js';
import { getBrasiliaDateParts } from '../_lib/dates.js';
import { ensureRecurringOccurrences } from '../_lib/recurring.js';

export { getBrasiliaDateParts };

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
   * Utilitários de resolução de conta/cartão por nome (sem acento, sem diferença de caixa).
   */
  const normalize = (value: string) =>
    value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  function matchByName<T extends { name: string }>(list: T[], name: string): T[] {
    const target = normalize(name);
    if (!target) return [];
    const exact = list.filter((item) => normalize(item.name) === target);
    if (exact.length > 0) return exact;
    return list.filter((item) => {
      const itemName = normalize(item.name);
      return itemName.includes(target) || target.includes(itemName);
    });
  }

  async function findCategory(categoriaNome?: string) {
    if (!categoriaNome) return { id: null as string | null, name: null as string | null };
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', `%${categoriaNome}%`)
      .limit(1);
    if (data && data.length > 0) return { id: data[0].id, name: data[0].name };
    return { id: null, name: categoriaNome };
  }

  const itemSchema = z.object({
    descricao: z.string().describe('Descrição clara do lançamento. Se houver quantidade, inclua (ex: "2 carregadores")'),
    tipo: z.enum(['income', 'expense']).describe('expense para despesa/gasto, income para receita/ganho'),
    formaPagamento: z
      .enum(['pix', 'credit', 'debit', 'cash', 'transfer', 'boleto', 'other'])
      .describe('Forma de pagamento. Só preencha se o usuário informou ou se ficou claro (ex: "no cartão" = credit)'),
    valorTotal: z.number().positive().optional().describe('Valor TOTAL da compra em reais (soma de todas as parcelas)'),
    valorParcela: z.number().positive().optional().describe('Valor de CADA parcela em reais, quando o usuário informou o valor da parcela'),
    parcelas: z.number().int().min(1).max(60).optional().describe('Número de parcelas (padrão 1, à vista)'),
    cartaoNome: z.string().optional().describe('Nome do cartão de crédito, caso o usuário tenha informado'),
    contaNome: z.string().optional().describe('Nome da conta bancária, caso o usuário tenha informado'),
    categoriaNome: z.string().optional().describe('Categoria sugerida (ex: Alimentação, Transporte, Eletrônicos)'),
    data: z.string().optional().describe('Data da compra/transação em YYYY-MM-DD. Se omitido, usa hoje (Brasília)'),
    notas: z.string().optional().describe('Anotações extras que o usuário quis registrar'),
    jaPago: z.boolean().optional().describe('Se já foi pago/recebido. Padrão: true, exceto boleto'),
  });

  /**
   * Tool: Registrar um ou mais lançamentos (suporta parcelas no cartão com fechamento/vencimento da fatura)
   */
  const registrarLancamentosTool = tool(
    async ({ itens }) => {
      const { dateStr: today } = getBrasiliaDateParts();
      const results: string[] = [];

      const [{ data: cardsData }, { data: accountsData }] = await Promise.all([
        supabase.from('credit_cards').select('id, name, closing_day, due_day').eq('user_id', userId).eq('is_active', true),
        supabase.from('accounts').select('id, name').eq('user_id', userId).eq('is_active', true),
      ]);
      const cards = cardsData || [];
      const accounts = accountsData || [];

      for (const item of itens) {
        const label = escapeHtml(item.descricao);
        try {
          const installments = item.parcelas ?? 1;

          // --- Valor ---
          let amounts: number[] | null = null;
          if (item.valorParcela && installments > 1) {
            amounts = Array(installments).fill(Math.round(item.valorParcela * 100) / 100);
          } else if (item.valorTotal) {
            amounts = splitInstallmentAmounts(item.valorTotal, installments);
          } else if (item.valorParcela) {
            amounts = [Math.round(item.valorParcela * 100) / 100];
          }
          if (!amounts) {
            results.push(`PENDENTE — "${label}": falta o valor (total ou de cada parcela).`);
            continue;
          }

          const category = await findCategory(item.categoriaNome);
          const baseNotes = item.notas?.trim() || null;

          // --- Cartão de crédito ---
          if (item.formaPagamento === 'credit') {
            if (cards.length === 0) {
              results.push(`PENDENTE — "${label}": o usuário não tem cartão cadastrado. Peça para cadastrar na aba Cartões do app.`);
              continue;
            }

            let card = null as (typeof cards)[number] | null;
            if (item.cartaoNome) {
              const matches = matchByName(cards, item.cartaoNome);
              if (matches.length === 1) card = matches[0];
            } else if (cards.length === 1) {
              card = cards[0];
            }

            if (!card) {
              const options = cards.map((c) => c.name).join(', ');
              results.push(`PENDENTE — "${label}": qual cartão foi usado? Cartões cadastrados: ${options}.`);
              continue;
            }

            const purchaseDate = item.data || today;
            const schedule = generateCardInstallmentSchedule(purchaseDate, card.closing_day, card.due_day, installments);
            const groupId = installments > 1 ? randomUUID() : null;
            const purchaseNote = `Compra em ${formatIsoDateBR(purchaseDate)}${installments > 1 ? ` — ${installments}x` : ''}`;

            const rows = schedule.map((invoice, index) => ({
              user_id: userId,
              description: installments > 1 ? `${item.descricao} (Parcela ${index + 1}/${installments})` : item.descricao,
              amount: amounts![index] ?? amounts![0],
              type: item.tipo,
              payment_method: 'credit' as const,
              transaction_date: invoice.dueDate,
              due_date: invoice.dueDate,
              category_id: category.id,
              credit_card_id: card!.id,
              account_id: null,
              is_paid: item.jaPago ?? false,
              is_invoice_payment: false,
              installment_number: installments > 1 ? index + 1 : null,
              total_installments: installments > 1 ? installments : null,
              installment_group_id: groupId,
              notes: baseNotes ? `${baseNotes} | ${purchaseNote}` : purchaseNote,
            }));

            const { error } = await supabase.from('transactions').insert(rows);
            if (error) {
              results.push(`ERRO — "${label}" não foi salvo: ${escapeHtml(error.message)}`);
              continue;
            }

            const total = amounts.reduce((sum, v) => sum + v, 0);
            const first = schedule[0];
            const lastDue = schedule[schedule.length - 1].dueDate;
            results.push(
              `SALVO — "${label}" no cartão ${escapeHtml(card.name)}: ` +
                (installments > 1
                  ? `${installments}x de R$ ${formatBRL(amounts[0])} (total R$ ${formatBRL(total)}). `
                  : `R$ ${formatBRL(total)} à vista. `) +
                `Fatura fecha em ${formatIsoDateBR(first.closingDate)} e a 1ª parcela vence em ${formatIsoDateBR(first.dueDate)}` +
                (installments > 1 ? `; última parcela em ${formatIsoDateBR(lastDue)}` : '') +
                `.` +
                (category.name ? ` Categoria: ${escapeHtml(category.name)}.` : '') +
                (baseNotes ? ` Anotação: ${escapeHtml(baseNotes)}.` : '')
            );
            continue;
          }

          // --- Demais formas de pagamento (parcela única) ---
          const total = amounts.reduce((sum, v) => sum + v, 0);
          let accountId: string | null = null;
          let accountName: string | null = null;

          if (item.contaNome) {
            const matches = matchByName(accounts, item.contaNome);
            if (matches.length === 1) {
              accountId = matches[0].id;
              accountName = matches[0].name;
            } else {
              const options = accounts.map((a) => a.name).join(', ') || 'nenhuma conta cadastrada';
              results.push(`PENDENTE — "${label}": qual conta? Contas cadastradas: ${options}.`);
              continue;
            }
          } else if (accounts.length === 1) {
            accountId = accounts[0].id;
            accountName = accounts[0].name;
          } else if (accounts.length > 1 && item.formaPagamento !== 'cash') {
            const options = accounts.map((a) => a.name).join(', ');
            results.push(`PENDENTE — "${label}": de qual conta saiu/entrou? Contas cadastradas: ${options}.`);
            continue;
          }

          const date = item.data || today;
          const isBoleto = item.formaPagamento === 'boleto';
          const { error } = await supabase.from('transactions').insert({
            user_id: userId,
            description: item.descricao,
            amount: total,
            type: item.tipo,
            payment_method: item.formaPagamento,
            transaction_date: date,
            due_date: isBoleto ? date : null,
            category_id: category.id,
            account_id: accountId,
            credit_card_id: null,
            is_paid: item.jaPago ?? !isBoleto,
            is_invoice_payment: false,
            notes: baseNotes,
          });

          if (error) {
            results.push(`ERRO — "${label}" não foi salvo: ${escapeHtml(error.message)}`);
            continue;
          }

          results.push(
            `SALVO — ${item.tipo === 'income' ? 'Receita' : 'Despesa'} "${label}": R$ ${formatBRL(total)} via ` +
              `${paymentMethodLabels[item.formaPagamento] || item.formaPagamento}` +
              (accountName ? ` (conta ${escapeHtml(accountName)})` : '') +
              ` em ${formatIsoDateBR(date)}.` +
              (category.name ? ` Categoria: ${escapeHtml(category.name)}.` : '') +
              (baseNotes ? ` Anotação: ${escapeHtml(baseNotes)}.` : '')
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Erro desconhecido';
          results.push(`ERRO — "${label}": ${escapeHtml(msg)}`);
        }
      }

      return results.join('\n');
    },
    {
      name: 'registrar_lancamentos',
      description:
        'Registra UM OU MAIS lançamentos (receitas/despesas), inclusive compras parceladas no cartão de crédito. ' +
        'Envie um item por compra/gasto citado. O servidor calcula em qual fatura cada parcela cai (fechamento/vencimento do cartão). ' +
        'Se faltar algum dado obrigatório (valor, cartão ou conta), o item volta como PENDENTE e NADA é gravado para ele — então pergunte ao usuário.',
      schema: z.object({
        itens: z.array(itemSchema).min(1).describe('Lista de lançamentos citados pelo usuário'),
      }),
    }
  );

  /**
   * Tool: Criar conta fixa mensal (despesa ou receita recorrente)
   */
  const criarContaFixaTool = tool(
    async ({ tipo, descricao, valor, diaDoMes, formaPagamento, contaNome, cartaoNome, categoriaNome, notas }) => {
      try {
        const { dateStr: today } = getBrasiliaDateParts();

        let accountId: string | null = null;
        let cardId: string | null = null;

        if (cartaoNome) {
          const { data: cards } = await supabase.from('credit_cards').select('id, name').eq('user_id', userId);
          const matches = matchByName(cards || [], cartaoNome);
          if (matches.length !== 1) {
            return `PENDENTE — qual cartão? Cartões: ${(cards || []).map((c) => c.name).join(', ') || 'nenhum cadastrado'}.`;
          }
          cardId = matches[0].id;
        } else if (contaNome) {
          const { data: accounts } = await supabase.from('accounts').select('id, name').eq('user_id', userId);
          const matches = matchByName(accounts || [], contaNome);
          if (matches.length !== 1) {
            return `PENDENTE — qual conta? Contas: ${(accounts || []).map((a) => a.name).join(', ') || 'nenhuma cadastrada'}.`;
          }
          accountId = matches[0].id;
        }

        const category = await findCategory(categoriaNome);

        const { error } = await supabase.from('recurring_bills').insert({
          user_id: userId,
          type: tipo,
          description: descricao,
          amount: valor,
          day_of_month: diaDoMes,
          category_id: category.id,
          account_id: accountId,
          credit_card_id: cardId,
          payment_method: formaPagamento ?? (cardId ? 'credit' : 'other'),
          notes: notas?.trim() || null,
          start_date: today,
        });

        if (error) return `ERRO — conta fixa não foi salva: ${escapeHtml(error.message)}`;

        const created = await ensureRecurringOccurrences(supabase, userId, today);

        return (
          `SALVO — ${tipo === 'income' ? 'Receita' : 'Despesa'} fixa "${escapeHtml(descricao)}": ` +
          `R$ ${formatBRL(valor)} todo dia ${diaDoMes}. ${created} lançamento(s) pendente(s) gerado(s) para este mês e o próximo. ` +
          `O usuário será avisado antes do vencimento.`
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        return `ERRO — ${escapeHtml(msg)}`;
      }
    },
    {
      name: 'criar_conta_fixa',
      description:
        'Cadastra uma receita ou despesa FIXA que se repete todo mês em um dia definido (aluguel, internet, salário). ' +
        'Exige descrição, valor e dia do mês. Se faltar algum, pergunte antes.',
      schema: z.object({
        tipo: z.enum(['income', 'expense']),
        descricao: z.string().describe('Nome da conta fixa (ex: Aluguel, Internet, Salário)'),
        valor: z.number().positive(),
        diaDoMes: z.number().int().min(1).max(31).describe('Dia do mês do vencimento/recebimento'),
        formaPagamento: z.enum(['pix', 'credit', 'debit', 'cash', 'transfer', 'boleto', 'other']).optional(),
        contaNome: z.string().optional(),
        cartaoNome: z.string().optional(),
        categoriaNome: z.string().optional(),
        notas: z.string().optional().describe('Anotações extras'),
      }),
    }
  );

  /**
   * Tool: Listar contas fixas
   */
  const listarContasFixasTool = tool(
    async () => {
      const { data, error } = await supabase
        .from('recurring_bills')
        .select('type, description, amount, day_of_month, active')
        .eq('user_id', userId)
        .eq('active', true)
        .order('day_of_month', { ascending: true });

      if (error) return `ERRO — ${escapeHtml(error.message)}`;
      if (!data || data.length === 0) return 'O usuário não possui contas fixas cadastradas.';

      return data
        .map(
          (b) =>
            `${b.type === 'income' ? 'Receita' : 'Despesa'} fixa "${escapeHtml(b.description)}": R$ ${formatBRL(Number(b.amount))} — dia ${b.day_of_month}`
        )
        .join('\n');
    },
    {
      name: 'listar_contas_fixas',
      description: 'Lista as receitas e despesas fixas mensais cadastradas pelo usuário.',
      schema: z.object({}),
    }
  );

  /**
   * Tool: Marcar lançamento/conta como paga
   */
  const marcarComoPagoTool = tool(
    async ({ busca }) => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('id, description, amount, due_date, transaction_date')
          .eq('user_id', userId)
          .eq('is_paid', false)
          .ilike('description', `%${busca}%`)
          .order('transaction_date', { ascending: true })
          .limit(6);

        if (error) return `ERRO — ${escapeHtml(error.message)}`;
        if (!data || data.length === 0) return `Nenhum lançamento pendente encontrado com "${escapeHtml(busca)}".`;

        if (data.length > 1) {
          const options = data
            .map((t) => `"${escapeHtml(t.description)}" R$ ${formatBRL(Number(t.amount))} vence ${formatIsoDateBR(t.due_date || t.transaction_date)}`)
            .join('; ');
          return `PENDENTE — vários lançamentos encontrados, pergunte qual: ${options}.`;
        }

        const target = data[0];
        const { error: updateError } = await supabase.from('transactions').update({ is_paid: true }).eq('id', target.id);
        if (updateError) return `ERRO — ${escapeHtml(updateError.message)}`;

        return `SALVO — "${escapeHtml(target.description)}" (R$ ${formatBRL(Number(target.amount))}) marcado como pago.`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        return `ERRO — ${escapeHtml(msg)}`;
      }
    },
    {
      name: 'marcar_como_pago',
      description: 'Marca como pago um lançamento ou conta pendente, buscando pela descrição (ex: "aluguel", "internet").',
      schema: z.object({
        busca: z.string().describe('Trecho da descrição do lançamento pendente'),
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
    registrarLancamentosTool,
    criarContaFixaTool,
    listarContasFixasTool,
    marcarComoPagoTool,
    consultarSaldoTool,
    consultarGastosMesTool,
    consultarLimiteGastosTool,
    definirLimiteGastosTool,
    consultarFaturasCompromissosTool,
  ];
}

const HISTORY_WINDOW_HOURS = 48;
const HISTORY_MAX_MESSAGES = 20;
const MAX_TOOL_ITERATIONS = 6;
const RESET_COMMANDS = ['/limpar', '/nova', 'nova conversa', 'limpar conversa'];

function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : (part as { text?: string })?.text ?? ''))
      .join('');
  }
  return '';
}

/**
 * Orquestrador do Agente LangChain com OpenAI.
 * - Mantém memória da conversa por canal (agent_messages, janela de 48h).
 * - Executa TODAS as ferramentas pedidas pelo modelo, em loop, e deixa o modelo redigir a resposta final.
 */
export async function runFinanceAgent(
  userId: string,
  userMessage: string,
  supabase: SupabaseClient<Database>,
  channel: AgentChannel = 'telegram'
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return '⚠️ <b>OPENAI_API_KEY</b> não configurada no ambiente da Vercel. Por favor, adicione sua chave nas variáveis de ambiente.';
  }

  // Comando para reiniciar o contexto da conversa
  if (RESET_COMMANDS.includes(userMessage.trim().toLowerCase())) {
    await supabase.from('agent_messages').delete().eq('user_id', userId).eq('channel', channel);
    return '🧹 <b>Conversa reiniciada.</b>\n\nPode me contar um novo lançamento ou fazer uma consulta!';
  }

  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0,
    openAIApiKey: apiKey,
  });

  const tools = createFinanceTools(userId, supabase);
  const modelWithTools = model.bindTools(tools);

  const { formattedDate: hojeBrasilia, timeStr: horaBrasilia, dateStr: dataIsoBrasilia } = getBrasiliaDateParts();

  // Contexto do usuário: contas, cartões (com fechamento/vencimento) e histórico recente
  const since = new Date(Date.now() - HISTORY_WINDOW_HOURS * 3600 * 1000).toISOString();
  const [{ data: userAccounts }, { data: userCards }, { data: historyRows }] = await Promise.all([
    supabase.from('accounts').select('name, type').eq('user_id', userId),
    supabase.from('credit_cards').select('name, closing_day, due_day').eq('user_id', userId),
    supabase
      .from('agent_messages')
      .select('role, content')
      .eq('user_id', userId)
      .eq('channel', channel)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(HISTORY_MAX_MESSAGES),
  ]);

  const accountsList = (userAccounts || []).map((a) => a.name).join(', ') || 'Nenhuma conta cadastrada';
  const cardsList =
    (userCards || []).map((c) => `${c.name} (fecha dia ${c.closing_day}, vence dia ${c.due_day})`).join('; ') ||
    'Nenhum cartão cadastrado';

  const systemPrompt = `Você é o Monetra Assistant, o assistente inteligente de gestão financeira pessoal do usuário.
Canal atual: ${channel === 'telegram' ? 'Telegram' : 'chat do aplicativo web'}. Suas respostas devem ser objetivas, bem diagramadas e agradáveis de ler.

📅 Data e Hora Atual de Brasília: ${hojeBrasilia} às ${horaBrasilia} (Data ISO: ${dataIsoBrasilia}).
🏦 Contas cadastradas do usuário: ${accountsList}
💳 Cartões de crédito cadastrados: ${cardsList}

FORMATAÇÃO (OBRIGATÓRIA):
- Responda SEMPRE em Português do Brasil, usando SOMENTE as tags HTML <b>, <i> e <code> (nenhuma outra tag).
- Use <b>negrito</b> para rótulos, <code>R$ 0,00</code> para valores, emojis pertinentes e linhas em branco para separar blocos.

MEMÓRIA: você recebe o histórico recente da conversa. Use-o: se o usuário responde "Nubank" ou "5x", isso complementa o lançamento que você acabou de perguntar. Nunca peça de novo algo que já foi informado.

REGISTRO DE LANÇAMENTOS (use 'registrar_lancamentos'):
1. Cada compra/gasto/receita citada vira UM item no array. Se o usuário citar vários lançamentos na mesma mensagem, envie todos numa única chamada.
2. Dados obrigatórios por item: descrição, valor e forma de pagamento. Se for cartão de crédito, também qual cartão. Se o usuário tem mais de uma conta, qual conta nos demais casos.
3. NUNCA invente cartão, conta, valor ou forma de pagamento. Se faltar algo, NÃO chame a ferramenta para aquele item: pergunte ao usuário, reunindo TODAS as perguntas pendentes numa única mensagem.
   Exemplo: "comprei parcelado no cartão" → pergunte o que foi comprado, qual o valor de cada parcela (ou o total), em quantas vezes e qual cartão.
4. Parcelado: preencha 'parcelas'. Se o usuário informou o valor de CADA parcela, use 'valorParcela'; se informou o total, use 'valorTotal'. Se estiver ambíguo se o valor é por parcela ou total, pergunte.
   Ex.: "comprei 2 carregadores parcelados em 5x de 40 no cartão" é UMA compra ("2 carregadores"), 5 parcelas; valor de cada parcela = 40 (confirme se o 40 é de cada parcela somando os dois carregadores, caso haja dúvida).
5. Fatura: o servidor decide em qual fatura cada parcela cai (compra no dia do fechamento ou depois vai para a próxima fatura). Após salvar, informe ao usuário o vencimento da 1ª parcela exatamente como retornado pela ferramenta.
6. Se o usuário citar anotações extras ("anota que foi presente"), envie em 'notas'.
7. O resultado da ferramenta é a verdade: itens "SALVO" foram gravados; "PENDENTE" NÃO foram gravados (pergunte o que falta); "ERRO" falhou. Nunca afirme que algo foi salvo se a ferramenta não retornou SALVO.

CONTAS FIXAS (use 'criar_conta_fixa', 'listar_contas_fixas', 'marcar_como_pago'):
- Para despesa/receita que se repete todo mês, exija descrição, valor e dia do mês; pergunte o que faltar.
- Quando o usuário disser que pagou/recebeu uma conta pendente, use 'marcar_como_pago'.

CONSULTAS:
- Saldo → 'consultar_saldo'; gastos do mês → 'consultar_gastos_mes'; teto/limite → 'consultar_limite_gastos'; definir teto → 'definir_limite_gastos'; gastos de hoje, fatura do cartão ou parcelas futuras → 'consultar_faturas_compromissos'.

REGRAS GERAIS:
- Considere sempre o fuso de Brasília. Para lançamentos de hoje use ${dataIsoBrasilia}.
- Ao final de operações de gravação, resuma o que foi salvo de forma clara (um bloco por item).
- Nunca divulgue credenciais, chaves de API, senhas ou IDs técnicos de banco.`;

  const history = (historyRows || [])
    .slice()
    .reverse()
    .map((row) => (row.role === 'assistant' ? new AIMessage(row.content) : new HumanMessage(row.content)));

  const messages: BaseMessage[] = [new SystemMessage(systemPrompt), ...history, new HumanMessage(userMessage)];

  let finalReply = '';

  try {
    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await modelWithTools.invoke(messages);
      messages.push(response);

      const toolCalls = response.tool_calls ?? [];
      if (toolCalls.length === 0) {
        finalReply = contentToText(response.content).trim();
        break;
      }

      for (const toolCall of toolCalls) {
        const selectedTool = tools.find((t) => t.name === toolCall.name);
        let result: string;
        if (!selectedTool) {
          result = `ERRO — ferramenta desconhecida: ${toolCall.name}`;
        } else {
          try {
            result = String(await (selectedTool as any).invoke(toolCall.args));
          } catch (toolErr: unknown) {
            result = `ERRO — ${toolErr instanceof Error ? toolErr.message : 'falha na ferramenta'}`;
          }
        }
        messages.push(new ToolMessage({ content: result, tool_call_id: toolCall.id ?? toolCall.name }));
      }
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro ao processar mensagem com IA';
    console.error('Erro no agente LangChain:', err);
    return `⚠️ Desculpe, ocorreu uma instabilidade ao processar sua solicitação: ${escapeHtml(errorMsg)}`;
  }

  if (!finalReply) {
    finalReply = '⚠️ Não consegui concluir essa solicitação. Pode repetir ou detalhar um pouco mais?';
  }

  // Persiste a troca para dar contexto às próximas mensagens (falha de persistência não bloqueia a resposta)
  const { error: persistError } = await supabase.from('agent_messages').insert([
    { user_id: userId, channel, role: 'user', content: userMessage },
    { user_id: userId, channel, role: 'assistant', content: finalReply },
  ]);
  if (persistError) {
    console.error('Erro ao salvar memória do agente:', persistError.message);
  }

  return finalReply;
}
