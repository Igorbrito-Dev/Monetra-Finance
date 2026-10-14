/**
 * Regras da importação de fatura de cartão: detecção de parcelas, separação de pagamentos
 * e estornos, geração das parcelas futuras e detecção de duplicidades.
 * Funções puras (sem acesso a rede ou banco) para serem testadas isoladamente.
 */

export type StatementKind = 'purchase' | 'payment' | 'refund';

export interface InstallmentInfo {
  number: number;
  total: number;
  /** Descrição sem o trecho "Parcela n/N" */
  baseDescription: string;
}

/**
 * Detecta "Parcela 2/5", "PARC 02/05", "Parcela 2 de 5" na descrição.
 * Retorna null quando não houver marcação válida de parcela.
 */
export function detectInstallment(description: string): InstallmentInfo | null {
  if (!description) return null;
  const match = description.match(/parc(?:ela)?\.?\s*(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})/i);
  if (!match) return null;

  const number = parseInt(match[1], 10);
  const total = parseInt(match[2], 10);
  if (!(total >= 2 && total <= 60 && number >= 1 && number <= total)) return null;

  const baseDescription = description
    .replace(match[0], '')
    .replace(/\s*[-–—(]\s*$/, '')
    .replace(/^\s*[-–—)]\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[-–—\s]+$/, '')
    .trim();

  return { number, total, baseDescription: baseDescription || description.trim() };
}

/**
 * Em fatura de cartão, valores negativos são créditos: pagamento da fatura ou estorno.
 */
export function classifyCardNegative(description: string): Exclude<StatementKind, 'purchase'> {
  const clean = (description || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (/^pagamento\b|pagamento (recebido|efetuado|da fatura|de fatura|em)|pgto|pag\.? fatura/.test(clean)) {
    return 'payment';
  }
  return 'refund';
}

export function normalizeText(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Soma `months` meses a uma data YYYY-MM-DD, mantendo o dia (ajustado ao fim do mês). */
export function addMonthsToIso(iso: string, months: number, dayOverride?: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const index = year * 12 + (month - 1) + months;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const d = Math.min(dayOverride ?? day, lastDay);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export interface StatementRow {
  normalizedDate: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  kind?: StatementKind;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
  baseDescription?: string;
  externalId?: string | null;
  suggestedCategoryId?: string | null;
  selected: boolean;
  isDuplicate?: boolean;
  duplicateReason?: string;
}

export interface ExistingCardTransaction {
  description: string;
  amount: number | string;
  transaction_date: string;
  installment_number: number | null;
  total_installments: number | null;
}

/**
 * Marca como duplicadas (e desmarca) as linhas que já existem para o cartão:
 * - parcelas: mesma descrição-base, mesmo total e mesmo número de parcela;
 * - demais: mesma descrição, mesmo valor e mesma data de vencimento da fatura.
 */
export function markCardDuplicates<T extends StatementRow>(
  rows: T[],
  existing: ExistingCardTransaction[],
  invoiceDueDate: string
): T[] {
  return rows.map((row) => {
    if (row.kind === 'payment') return row;

    if (row.installmentNumber && row.totalInstallments) {
      const base = normalizeText(row.baseDescription || row.description);
      const found = existing.find((tx) => {
        if (tx.installment_number !== row.installmentNumber || tx.total_installments !== row.totalInstallments) {
          return false;
        }
        const existingBase = normalizeText(detectInstallment(tx.description)?.baseDescription || tx.description);
        return existingBase === base || existingBase.startsWith(base) || base.startsWith(existingBase);
      });
      if (found) {
        return {
          ...row,
          isDuplicate: true,
          duplicateReason: `Parcela ${row.installmentNumber}/${row.totalInstallments} já registrada`,
          selected: false,
        };
      }
      return row;
    }

    const description = normalizeText(row.description);
    const found = existing.find(
      (tx) =>
        tx.transaction_date === invoiceDueDate &&
        Math.abs(Number(tx.amount) - row.amount) < 0.01 &&
        normalizeText(tx.description) === description
    );
    if (found) {
      return { ...row, isDuplicate: true, duplicateReason: `Já registrado em ${tx_date(found)}`, selected: false };
    }
    return row;
  });
}

function tx_date(tx: ExistingCardTransaction): string {
  const [y, m, d] = tx.transaction_date.split('-');
  return `${d}/${m}/${y}`;
}

export interface CardImportRecord {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  transaction_date: string;
  due_date: string | null;
  is_paid: boolean;
  is_invoice_payment: boolean;
  installment_number: number | null;
  total_installments: number | null;
  installment_group_id: string | null;
  notes: string | null;
  external_id: string | null;
  category_id: string | null;
}

export interface BuildCardImportOptions {
  /** Vencimento da fatura que está sendo importada (YYYY-MM-DD) */
  invoiceDueDate: string;
  /** Dia de vencimento do cartão, usado nas parcelas futuras */
  dueDay: number;
  /** Cria as parcelas restantes (n+1..N) como compromissos futuros pendentes */
  createFutureInstallments: boolean;
  makeId: () => string;
  /** Ids de grupo já existentes (chave = descrição-base normalizada|total) para reaproveitar vínculo */
  knownGroups?: Map<string, string>;
}

function formatBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Converte as linhas selecionadas da fatura em registros prontos para gravar.
 */
export function buildCardImportRecords(rows: StatementRow[], options: BuildCardImportOptions): CardImportRecord[] {
  const groups = new Map<string, string>(options.knownGroups ?? []);
  const records: CardImportRecord[] = [];

  for (const row of rows) {
    if (!row.selected) continue;

    const purchaseNote = `Compra em ${formatBR(row.normalizedDate)}`;

    if (row.kind === 'payment') {
      records.push({
        description: row.description,
        amount: row.amount,
        type: 'expense',
        transaction_date: row.normalizedDate,
        due_date: null,
        is_paid: true,
        is_invoice_payment: true,
        installment_number: null,
        total_installments: null,
        installment_group_id: null,
        notes: null,
        external_id: row.externalId ?? null,
        category_id: null,
      });
      continue;
    }

    if (row.kind === 'refund') {
      records.push({
        description: row.description,
        amount: row.amount,
        type: 'income',
        transaction_date: options.invoiceDueDate,
        due_date: null,
        is_paid: true,
        is_invoice_payment: false,
        installment_number: null,
        total_installments: null,
        installment_group_id: null,
        notes: `Estorno/crédito na fatura — ${purchaseNote}`,
        external_id: row.externalId ?? null,
        category_id: row.suggestedCategoryId ?? null,
      });
      continue;
    }

    const isInstallment = Boolean(row.installmentNumber && row.totalInstallments);
    let groupId: string | null = null;

    if (isInstallment) {
      const base = row.baseDescription || row.description;
      const key = `${normalizeText(base)}|${row.totalInstallments}`;
      groupId = groups.get(key) ?? options.makeId();
      groups.set(key, groupId);

      const total = row.totalInstallments!;
      const number = row.installmentNumber!;
      const label = (n: number) => `${base} (Parcela ${n}/${total})`;

      records.push({
        description: label(number),
        amount: row.amount,
        type: 'expense',
        transaction_date: options.invoiceDueDate,
        due_date: options.invoiceDueDate,
        is_paid: false,
        is_invoice_payment: false,
        installment_number: number,
        total_installments: total,
        installment_group_id: groupId,
        notes: purchaseNote,
        external_id: row.externalId ?? null,
        category_id: row.suggestedCategoryId ?? null,
      });

      if (options.createFutureInstallments) {
        for (let n = number + 1; n <= total; n++) {
          const due = addMonthsToIso(options.invoiceDueDate, n - number, options.dueDay);
          records.push({
            description: label(n),
            amount: row.amount,
            type: 'expense',
            transaction_date: due,
            due_date: due,
            is_paid: false,
            is_invoice_payment: false,
            installment_number: n,
            total_installments: total,
            installment_group_id: groupId,
            notes: `${purchaseNote} — parcela futura gerada na importação`,
            external_id: null,
            category_id: row.suggestedCategoryId ?? null,
          });
        }
      }
      continue;
    }

    records.push({
      description: row.description,
      amount: row.amount,
      type: 'expense',
      transaction_date: options.invoiceDueDate,
      due_date: options.invoiceDueDate,
      is_paid: false,
      is_invoice_payment: false,
      installment_number: null,
      total_installments: null,
      installment_group_id: null,
      notes: purchaseNote,
      external_id: row.externalId ?? null,
      category_id: row.suggestedCategoryId ?? null,
    });
  }

  return records;
}
