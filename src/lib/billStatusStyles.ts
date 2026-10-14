import { getBillStatus, type BillStatus } from './billRules';

/** Data de hoje no fuso local do navegador (YYYY-MM-DD). */
export function getLocalToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export interface BillStatusStyle {
  status: BillStatus;
  label: string;
  /** Classes do texto/etiqueta de status */
  text: string;
  /** Classes de pílula (fundo + borda + texto) */
  pill: string;
}

const STYLES: Record<BillStatus, Omit<BillStatusStyle, 'status'>> = {
  paid: {
    label: 'Pago',
    text: 'text-emerald-600',
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  due_today: {
    label: 'Vence hoje',
    text: 'text-amber-600',
    pill: 'bg-amber-50 text-amber-700 border-amber-300',
  },
  overdue: {
    label: 'Atrasado',
    text: 'text-rose-600',
    pill: 'bg-rose-50 text-rose-700 border-rose-300',
  },
  upcoming: {
    label: 'A vencer',
    text: 'text-slate-500',
    pill: 'bg-slate-50 text-slate-600 border-slate-200',
  },
};

/** Verde = pago, amarelo = vence hoje, vermelho = atrasado. */
export function getBillStatusStyle(dueDate: string, isPaid: boolean, today = getLocalToday()): BillStatusStyle {
  const status = getBillStatus(dueDate, isPaid, today);
  return { status, ...STYLES[status] };
}
