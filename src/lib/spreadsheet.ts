/**
 * Converte as linhas lidas de uma planilha (.xlsx) para texto CSV (separador ";"),
 * reaproveitando o mesmo interpretador de colunas do CSV.
 */
function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function cellToText(cell: unknown): string {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date) {
    return `${pad(cell.getUTCDate())}/${pad(cell.getUTCMonth() + 1)}/${cell.getUTCFullYear()}`;
  }
  if (typeof cell === 'number') {
    // Vírgula decimal para o interpretador monetário brasileiro
    return String(cell).replace('.', ',');
  }
  return String(cell).replace(/[;\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

export function sheetRowsToCsv(rows: unknown[][]): string {
  return rows
    .filter((row) => row.some((cell) => cellToText(cell) !== ''))
    .map((row) => row.map(cellToText).join(';'))
    .join('\n');
}
