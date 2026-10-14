/**
 * Regras de categorização aprendidas: ao corrigir a categoria de um lançamento, guarda-se
 * uma palavra-chave da descrição e a categoria escolhida para aplicar nos próximos.
 */
export interface CategoryRule {
  keyword: string;
  category_id: string;
}

function normalize(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(?\s*parc(?:ela)?\.?\s*\d+\s*(?:\/|de)\s*\d+\s*\)?/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'para', 'por', 'com', 'pix', 'compra']);

/**
 * Chave de aprendizado: as duas primeiras palavras significativas ("Padaria Pão Quente 123" -> "padaria pao").
 * Retorna null quando a descrição não tem informação suficiente.
 */
export function ruleKeyFromDescription(description: string): string | null {
  const tokens = normalize(description)
    .split(' ')
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
  if (tokens.length === 0) return null;
  return tokens.slice(0, 2).join(' ');
}

/**
 * Procura a regra que casa com a descrição (a de palavra-chave mais longa vence).
 */
export function matchCategoryRule(description: string, rules: CategoryRule[]): string | null {
  const text = ` ${normalize(description)} `;
  let best: CategoryRule | null = null;

  for (const rule of rules) {
    const key = normalize(rule.keyword);
    if (!key || !text.includes(` ${key}`)) continue;
    if (!best || key.length > normalize(best.keyword).length) best = rule;
  }

  return best ? best.category_id : null;
}
