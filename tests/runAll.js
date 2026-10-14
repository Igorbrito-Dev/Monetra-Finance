import { spawnSync } from 'child_process';

const testFiles = [
  'tests/financeRules.test.ts',
  'tests/dashboardMetrics.test.ts',
  'tests/telegramParser.test.ts',
  'tests/fileParser.test.ts',
  'tests/whisperParser.test.ts',
  'tests/creditCardRules.test.ts',
  'tests/billRules.test.ts',
];

let failed = false;

for (const file of testFiles) {
  console.log(`\n========================================`);
  console.log(`Rodando: ${file}`);
  console.log(`========================================`);

  const result = spawnSync('node', ['--experimental-strip-types', file], {
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    failed = true;
    break;
  }
}

if (failed) {
  console.error('\n❌ Um ou mais testes falharam.');
  process.exit(1);
} else {
  console.log('\n========================================');
  console.log('🎉 TODOS OS SUÍTES DE TESTE PASSARAM!');
  console.log('========================================\n');
  process.exit(0);
}
