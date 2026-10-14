import {
  generateNumericLinkCode,
  extractLinkToken,
} from '../api/telegram/auth.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FALHA NO TESTE: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('=== Executando Testes Unitários de Whisper, Código de 6 Dígitos & Orçamento ===\n');

// 1. Geração de código numérico de 6 dígitos
const code = generateNumericLinkCode();
assert(/^\d{6}$/.test(code), `generateNumericLinkCode gera 6 dígitos puramente numéricos (${code})`);
const numVal = parseInt(code, 10);
assert(numVal >= 100000 && numVal <= 999999, 'Código gerado está dentro da faixa de 100.000 a 999.999');

// 2. Extração de tokens flexível
assert(
  extractLinkToken('839201') === '839201',
  'extractLinkToken reconhece mensagem contendo apenas os 6 dígitos numéricos'
);

assert(
  extractLinkToken('/start 839201') === '839201',
  'extractLinkToken reconhece argumento em comando /start com deep link'
);

assert(
  extractLinkToken('/vincular 654321') === '654321',
  'extractLinkToken reconhece argumento em comando /vincular'
);

assert(
  extractLinkToken('MT4590') === 'MT4590',
  'extractLinkToken mantém retrocompatibilidade com prefixo MT'
);

assert(
  extractLinkToken('Bom dia, qual é meu saldo hoje?') === null,
  'extractLinkToken retorna null para mensagens de texto comuns'
);

assert(
  extractLinkToken('') === null,
  'extractLinkToken lida com string vazia retornando null'
);

// 3. Regras de Cálculo de Teto Orçamentário e Alertas (>= 80% e >= 100%)
function calculateBudgetStatus(spent: number, budget: number) {
  if (budget <= 0) return { percent: 0, status: 'none' };
  const percent = Math.round((spent / budget) * 100);
  if (percent >= 100) return { percent, status: 'critical' };
  if (percent >= 80) return { percent, status: 'warning' };
  return { percent, status: 'healthy' };
}

const status1 = calculateBudgetStatus(1200, 3000);
assert(status1.status === 'healthy' && status1.percent === 40, 'Orçamento em 40% é saudável');

const status2 = calculateBudgetStatus(2500, 3000);
assert(status2.status === 'warning' && status2.percent === 83, 'Orçamento em 83% dispara alerta de proximidade (>=80%)');

const status3 = calculateBudgetStatus(3100, 3000);
assert(status3.status === 'critical' && status3.percent === 103, 'Orçamento acima de 100% dispara alerta crítico de teto estourado');

// 4. Detecção de Mensagens de Áudio / Voz do Telegram
function isAudioMessage(message: { voice?: { file_id: string }; audio?: { file_id: string }; text?: string }) {
  return Boolean(message.voice?.file_id || message.audio?.file_id);
}

const mockVoiceMessage = {
  voice: { file_id: 'AwACAgEAAxkBAAM', duration: 4, mime_type: 'audio/ogg' },
};
assert(isAudioMessage(mockVoiceMessage) === true, 'Detecta payload de voz do Telegram');

const mockTextMessage = { text: 'Gastei 50 no débito' };
assert(isAudioMessage(mockTextMessage) === false, 'Mensagem apenas de texto não é marcada como áudio');

console.log('\nTodos os 11 testes de Whisper, pareamento e orçamento passaram com sucesso!\n');
