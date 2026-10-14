export interface ParsedTransactionRow {
  rawDate: string;
  normalizedDate: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  suggestedCategoryId?: string | null;
  isDuplicate?: boolean;
  duplicateReason?: string;
  selected: boolean;
}

/**
 * Detecta o delimitador mais provável em um texto CSV (vírgula, ponto-e-vírgula ou tab)
 */
export function detectDelimiter(text: string): string {
  const sample = text.slice(0, 2000);
  const commaCount = (sample.match(/,/g) || []).length;
  const semicolonCount = (sample.match(/;/g) || []).length;
  const tabCount = (sample.match(/\t/g) || []).length;

  if (semicolonCount >= commaCount && semicolonCount >= tabCount) {
    return ';';
  }
  if (tabCount >= commaCount && tabCount >= semicolonCount) {
    return '\t';
  }
  return ',';
}

/**
 * Converte strings monetárias brasileiras e internacionais para number decimal seguro
 * Exemplos: "R$ 1.250,50" -> 1250.5, "-45,00" -> 45.0, "1250.50" -> 1250.5
 */
export function parseCurrencyString(valueStr: string): { amount: number; isNegative: boolean } {
  if (!valueStr) return { amount: 0, isNegative: false };

  let clean = valueStr.trim().replace(/^R\$\s*/i, '').trim();

  // Detecta sinal negativo
  const isNegative = clean.startsWith('-') || clean.endsWith('-');
  clean = clean.replace(/[-+]/g, '').trim();

  // Trata formato brasileiro com pontos de milhar e vírgula decimal (ex: 1.250,50)
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.indexOf('.') < clean.indexOf(',')) {
      // 1.250,50
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,250.50
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes(',')) {
    // 45,50
    clean = clean.replace(',', '.');
  }

  const parsed = parseFloat(clean);
  const validAmount = isNaN(parsed) ? 0 : Math.abs(Math.round(parsed * 100) / 100);

  return {
    amount: validAmount,
    isNegative,
  };
}

/**
 * Normaliza datas variadas para o formato ISO YYYY-MM-DD
 * Suporta DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
 */
export function normalizeDateString(dateStr: string): string {
  if (!dateStr) {
    return new Date().toISOString().split('T')[0];
  }

  const clean = dateStr.trim();

  // DD/MM/YYYY ou DD-MM-YYYY
  const brMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Faz o parsing de um conteúdo CSV e extrai as linhas normalizadas
 */
export function parseCSVContent(csvText: string): ParsedTransactionRow[] {
  if (!csvText || !csvText.trim()) {
    return [];
  }

  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return [];
  }

  const delimiter = detectDelimiter(csvText);

  // Divide o cabeçalho
  const headerLine = lines[0];
  const headers = headerLine.split(delimiter).map((h) => h.trim().toLowerCase().replace(/["']/g, ''));

  // Localiza índices prováveis das colunas
  let dateIdx = headers.findIndex((h) => h.includes('data') || h.includes('date'));
  let descIdx = headers.findIndex((h) => h.includes('descri') || h.includes('hist') || h.includes('memo') || h.includes('estabelecimento') || h.includes('title'));
  let amountIdx = headers.findIndex((h) => h.includes('valor') || h.includes('amount') || h.includes('total') || h.includes('quantia'));

  // Fallbacks caso os cabeçalhos não tenham nomes usuais
  if (dateIdx === -1) dateIdx = 0;
  if (descIdx === -1) descIdx = headers.length > 1 ? 1 : 0;
  if (amountIdx === -1) amountIdx = headers.length > 2 ? 2 : headers.length - 1;

  const rows: ParsedTransactionRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split respeitando aspas simples
    const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length <= Math.max(dateIdx, descIdx, amountIdx)) {
      continue;
    }

    const rawDate = cols[dateIdx];
    const description = cols[descIdx];
    const rawAmount = cols[amountIdx];

    const { amount, isNegative } = parseCurrencyString(rawAmount);
    if (amount === 0 && !description) continue;

    // Detecta tipo por sinal negativo ou termos conhecidos de proventos/receitas
    const INCOME_KEYWORDS = [
      'salario', 'ted recebida', 'pix recebido', 'transferencia recebida',
      'remuneracao', 'folha de pagamento', 'deposito', 'rendimento', 'proventos', 'restituicao'
    ];
    const descLower = (description || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const isIncomeByKeyword = INCOME_KEYWORDS.some((kw) => descLower.includes(kw));

    const type: 'income' | 'expense' = isNegative ? 'expense' : (isIncomeByKeyword ? 'income' : 'expense');

    rows.push({
      rawDate,
      normalizedDate: normalizeDateString(rawDate),
      description: description || 'Transação Importada',
      amount,
      type,
      selected: true,
    });
  }

  return rows;
}
