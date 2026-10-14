import type { Transaction } from '../types/database';

/**
 * Divide um valor total em N parcelas distribuindo centavos de forma justa,
 * garantindo que a soma exata de todas as parcelas seja estritamente igual ao total.
 * Evita o problema clássico de dízimas periódicas como R$ 100,00 em 3x (33,34 + 33,33 + 33,33).
 */
export function splitInstallmentAmounts(totalAmount: number, installmentsCount: number): number[] {
  if (installmentsCount <= 1) {
    return [Math.round(totalAmount * 100) / 100];
  }

  // Trabalhar com inteiros em centavos
  const totalCents = Math.round(totalAmount * 100);
  const baseCentsPerInstallment = Math.floor(totalCents / installmentsCount);
  const remainderCents = totalCents % installmentsCount;

  const amounts: number[] = [];

  for (let i = 0; i < installmentsCount; i++) {
    // Adiciona 1 centavo nas primeiras parcelas para absorver o resto
    const currentCents = i < remainderCents ? baseCentsPerInstallment + 1 : baseCentsPerInstallment;
    amounts.push(currentCents / 100);
  }

  return amounts;
}

/**
 * Gera as datas mensais sucessivas para N parcelas a partir de uma data inicial (YYYY-MM-DD),
 * mantendo o dia original ou ajustando para o último dia válido do mês.
 */
export function generateInstallmentDates(startDateString: string, count: number): string[] {
  const [startYear, startMonth, startDay] = startDateString.split('-').map(Number);
  const dates: string[] = [];

  for (let i = 0; i < count; i++) {
    // Calcula o novo mês e ano
    const targetMonthIndex = startMonth - 1 + i;
    const targetYear = startYear + Math.floor(targetMonthIndex / 12);
    const targetMonth = (targetMonthIndex % 12) + 1;

    // Descobre o último dia do mês alvo
    const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
    const actualDay = Math.min(startDay, daysInTargetMonth);

    const formattedMonth = String(targetMonth).padStart(2, '0');
    const formattedDay = String(actualDay).padStart(2, '0');

    dates.push(`${targetYear}-${formattedMonth}-${formattedDay}`);
  }

  return dates;
}

/**
 * Calcula o resumo financeiro mensal para um conjunto de transações:
 * - Total de Receitas
 * - Total de Despesas de consumo (desconsiderando transferências e pagamentos de fatura para evitar dupla contagem)
 * - Balanço Líquido
 */
export function calculateMonthSummary(transactions: Transaction[]) {
  let totalIncome = 0;
  let totalExpense = 0;
  let totalPendingExpense = 0;

  for (const t of transactions) {
    // Pagamento de fatura não é despesa de consumo (as compras individuais já foram lançadas na fatura)
    if (t.is_invoice_payment) {
      continue;
    }

    if (t.type === 'income') {
      if (t.is_paid) {
        totalIncome += Number(t.amount);
      }
    } else if (t.type === 'expense') {
      if (t.is_paid) {
        totalExpense += Number(t.amount);
      } else {
        totalPendingExpense += Number(t.amount);
      }
    }
  }

  const netBalance = totalIncome - totalExpense;

  return {
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    totalPendingExpense: Math.round(totalPendingExpense * 100) / 100,
    netBalance: Math.round(netBalance * 100) / 100,
  };
}
