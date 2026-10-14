/**
 * Regras de fechamento e vencimento de fatura de cartão de crédito.
 * Funções puras sobre datas no formato YYYY-MM-DD (sem fuso horário), compartilhadas
 * entre o painel web e o agente (Telegram/chat).
 *
 * Regra de fechamento: compra feita NO dia de fechamento (ou depois) entra na fatura
 * do mês seguinte; compra feita antes do dia de fechamento entra na fatura atual.
 */

export interface CardInvoice {
  /** Data de fechamento da fatura (YYYY-MM-DD) */
  closingDate: string;
  /** Data de vencimento da fatura (YYYY-MM-DD) */
  dueDate: string;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toIso(year: number, month: number, day: number): string {
  const clamped = Math.min(day, daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`;
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/**
 * Descobre a fatura (fechamento e vencimento) em que uma compra cai.
 * Dias maiores que o fim do mês são ajustados para o último dia do mês.
 */
export function getInvoiceForPurchase(purchaseDate: string, closingDay: number, dueDay: number): CardInvoice {
  const [year, month, day] = purchaseDate.split('-').map(Number);

  const effectiveClosing = Math.min(closingDay, daysInMonth(year, month));
  const closingMonth = day >= effectiveClosing ? addMonths(year, month, 1) : { year, month };

  // Vencimento no mesmo mês do fechamento quando o dia de vencimento vem depois do fechamento;
  // caso contrário (ex.: fecha dia 25, vence dia 5) vence no mês seguinte.
  const dueMonth = dueDay > closingDay ? closingMonth : addMonths(closingMonth.year, closingMonth.month, 1);

  return {
    closingDate: toIso(closingMonth.year, closingMonth.month, closingDay),
    dueDate: toIso(dueMonth.year, dueMonth.month, dueDay),
  };
}

/**
 * Gera o cronograma de faturas de uma compra parcelada: a 1ª parcela cai na fatura
 * correta conforme o fechamento e as demais nas faturas dos meses seguintes.
 */
export function generateCardInstallmentSchedule(
  purchaseDate: string,
  closingDay: number,
  dueDay: number,
  count: number
): CardInvoice[] {
  const first = getInvoiceForPurchase(purchaseDate, closingDay, dueDay);
  const [closingYear, closingMonth] = first.closingDate.split('-').map(Number);
  const [dueYear, dueMonth] = first.dueDate.split('-').map(Number);

  const schedule: CardInvoice[] = [];
  for (let i = 0; i < Math.max(1, count); i++) {
    const c = addMonths(closingYear, closingMonth, i);
    const d = addMonths(dueYear, dueMonth, i);
    schedule.push({
      closingDate: toIso(c.year, c.month, closingDay),
      dueDate: toIso(d.year, d.month, dueDay),
    });
  }
  return schedule;
}

/** Formata YYYY-MM-DD como DD/MM/YYYY. */
export function formatIsoDateBR(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}
