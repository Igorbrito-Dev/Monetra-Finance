/**
 * Leitor de arquivos OFX (extratos bancários e de cartão).
 * Aceita OFX 1.x (SGML, sem tags de fechamento) e 2.x (XML). Só extrai texto: nunca executa conteúdo.
 */
export interface OfxTransaction {
  /** YYYY-MM-DD */
  date: string;
  description: string;
  /** Valor com sinal (negativo = saída) */
  amount: number;
  /** Identificador único do banco (FITID), útil contra duplicidade */
  fitId: string | null;
}

function readTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'));
  return match ? match[1].trim() : null;
}

function parseOfxDate(raw: string | null): string | null {
  if (!raw) return null;
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function parseOfxAmount(raw: string | null): number | null {
  if (!raw) return null;
  const normalized = raw.replace(/\s/g, '').replace(',', '.');
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

export function parseOfxContent(text: string): OfxTransaction[] {
  if (!text || !/<STMTTRN>/i.test(text)) return [];

  const blocks = text.split(/<STMTTRN>/i).slice(1);
  const result: OfxTransaction[] = [];

  for (const rawBlock of blocks) {
    const block = rawBlock.split(/<\/STMTTRN>/i)[0];

    const date = parseOfxDate(readTag(block, 'DTPOSTED'));
    const amount = parseOfxAmount(readTag(block, 'TRNAMT'));
    if (!date || amount === null) continue;

    const memo = readTag(block, 'MEMO');
    const name = readTag(block, 'NAME');
    const description = (memo || name || 'Transação OFX').replace(/\s{2,}/g, ' ').trim();

    result.push({ date, description, amount, fitId: readTag(block, 'FITID') });
  }

  return result;
}
