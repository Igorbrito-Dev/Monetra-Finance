import type { Category, Transaction } from '../types/database';
import type { ParsedTransactionRow } from './fileParser';

const KEYWORD_MAPPING: Record<string, string[]> = {
  'Alimentação': ['ifood', 'uber eats', 'restaurante', 'mercado', 'supermercado', 'carrefour', 'pao de acucar', 'padaria', 'lanches', 'mcdonald', 'burger', 'outback', 'acai', 'cafe'],
  'Transporte': ['uber', '99app', 'posto', 'gasolina', 'combustivel', 'ipiranga', 'shell', 'estacionamento', 'pedagio', 'sem parar', 'veloe', 'tag'],
  'Moradia': ['aluguel', 'condominio', 'enel', 'sabesp', 'cpfl', 'luz', 'agua', 'energia', 'gas', 'claro', 'vivo', 'internet'],
  'Saúde': ['farmacia', 'drogasil', 'droga raia', 'drogaria', 'hospital', 'clinica', 'laboratorio', 'medico', 'dentista', 'consulta'],
  'Lazer': ['netflix', 'spotify', 'cinema', 'steam', 'playstation', 'prime video', 'disney', 'ingresso', 'show', 'jogos'],
  'Educação': ['curso', 'escola', 'faculdade', 'udemy', 'alura', 'livraria', 'livro'],
  'Salário': ['salario', 'ted recebida', 'pix recebido', 'transferencia recebida', 'remuneracao', 'folha de pagamento'],
};

/**
 * Sugere uma categoria existente com base no texto da transação
 */
export function suggestCategory(
  description: string,
  categories: Category[]
): string | null {
  if (!description) return null;

  const descNorm = description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const [targetCatName, keywords] of Object.entries(KEYWORD_MAPPING)) {
    const hasMatch = keywords.some((kw) => descNorm.includes(kw));

    if (hasMatch) {
      // Busca uma categoria do usuário com nome similar
      const found = categories.find((c) =>
        c.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .includes(
            targetCatName
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
          )
      );
      if (found) {
        return found.id;
      }
    }
  }

  return null;
}

/**
 * Detecta duplicidades entre as linhas importadas e transações já existentes no banco
 */
export function detectDuplicates(
  rows: ParsedTransactionRow[],
  existingTransactions: Transaction[]
): ParsedTransactionRow[] {
  return rows.map((row) => {
    // Procura transação com mesma data e mesmo valor (tolerância de centavos)
    const matchingTx = existingTransactions.find((tx) => {
      const sameDate = tx.transaction_date === row.normalizedDate;
      const sameAmount = Math.abs(Number(tx.amount) - row.amount) < 0.01;
      return sameDate && sameAmount;
    });

    if (matchingTx) {
      return {
        ...row,
        isDuplicate: true,
        duplicateReason: `Possível duplicidade com: "${matchingTx.description}" registrada em ${matchingTx.transaction_date}`,
        selected: false, // Desmarca por segurança
      };
    }

    return {
      ...row,
      isDuplicate: false,
      selected: true,
    };
  });
}
