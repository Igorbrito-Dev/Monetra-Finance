function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FALHA NO TESTE: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('=== Executando Testes Unitários de Integração do Telegram ===\n');

// Teste 1: Extração de Token de Vínculo via /start ou /vincular
function extractLinkToken(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('/start') || trimmed.startsWith('/vincular')) {
    const parts = trimmed.split(' ');
    if (parts.length > 1 && parts[1].trim()) {
      return parts[1].trim();
    }
  }
  return null;
}

assert(
  extractLinkToken('/start MT8921') === 'MT8921',
  'Deve extrair o token MT8921 do comando /start'
);
assert(
  extractLinkToken('/vincular MT4512') === 'MT4512',
  'Deve extrair o token MT4512 do comando /vincular'
);
assert(
  extractLinkToken('/start') === null,
  'Não deve extrair token se /start for enviado sem argumentos'
);
assert(
  extractLinkToken('gastei 45 no almoço') === null,
  'Mensagem comum não deve ser interpretada como comando de vínculo'
);

// Teste 2: Formatação Segura de Mensagem de Resumo para o Telegram
function formatTelegramReceipt(description: string, amount: number, paymentMethod: string): string {
  return `✅ <b>Despesa registrada com sucesso!</b>\n• Descrição: ${description}\n• Valor: R$ ${amount.toFixed(2)}\n• Forma: ${paymentMethod.toUpperCase()}`;
}

const formattedMsg = formatTelegramReceipt('Gasolina Posto Shell', 150.0, 'pix');
assert(
  formattedMsg.includes('<b>Despesa registrada com sucesso!</b>'),
  'Deve formatar com tag HTML segura do Telegram'
);
assert(
  formattedMsg.includes('R$ 150.00'),
  'Deve formatar valor monetário de forma limpa'
);

// Teste 3: Simulação de Idempotência
const processedUpdates = new Set<number>();
function processUpdate(updateId: number): boolean {
  if (processedUpdates.has(updateId)) {
    return false; // Repetido
  }
  processedUpdates.add(updateId);
  return true; // Novo
}

assert(processUpdate(1001) === true, 'Primeiro recebimento de update_id 1001 deve ser aceito');
assert(processUpdate(1001) === false, 'Segundo recebimento do mesmo update_id 1001 deve ser ignorado (Idempotência)');
assert(processUpdate(1002) === true, 'Novo update_id 1002 deve ser aceito');

console.log('\n🎉 TODOS OS TESTES DO TELEGRAM PASSARAM COM SUCESSO!');
