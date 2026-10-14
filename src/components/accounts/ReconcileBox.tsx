import React, { useState } from 'react';
import { Scale } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { planReconciliation } from '../../lib/accountBalance';
import { getLocalToday } from '../../lib/billStatusStyles';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../ui/Button';

interface ReconcileBoxProps {
  accountId: string;
  accountName: string;
  appBalance: number;
  onAdjusted: () => void;
}

/**
 * Conciliação: compara o saldo do app com o saldo informado pelo banco e, se quiser,
 * registra a diferença como lançamento de ajuste.
 */
export const ReconcileBox: React.FC<ReconcileBoxProps> = ({ accountId, accountName, appBalance, onAdjusted }) => {
  const { user, isDemoMode } = useAuth();
  const [bankValue, setBankValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = bankValue.trim()
    ? parseFloat(bankValue.replace(/\./g, '').replace(',', '.'))
    : NaN;
  const plan = Number.isFinite(parsed) ? planReconciliation(appBalance, parsed) : null;

  const handleAdjust = async () => {
    if (!plan || plan.type === null || !user || isDemoMode) return;
    setBusy(true);
    setError(null);

    const { error: insertError } = await supabase.from('transactions').insert({
      user_id: user.id,
      account_id: accountId,
      description: `Ajuste de conciliação — ${accountName}`,
      amount: plan.amount,
      type: plan.type,
      payment_method: 'other',
      transaction_date: getLocalToday(),
      is_paid: true,
      notes: `Saldo do app ${formatCurrency(appBalance)} ajustado para o saldo do banco`,
    });

    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setBankValue('');
    onAdjusted();
  };

  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
        <Scale className="w-4 h-4 text-indigo-600" /> Conferir saldo com o banco
      </div>
      <input
        value={bankValue}
        onChange={(e) => setBankValue(e.target.value)}
        inputMode="decimal"
        placeholder="Saldo que aparece no banco (R$)"
        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
        aria-label="Saldo do banco"
      />

      {plan && (
        <div
          className={`text-xs rounded-xl px-3 py-2 border ${
            plan.type === null
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          {plan.type === null ? (
            'Os saldos batem. Está tudo conciliado.'
          ) : (
            <>
              Diferença de <strong className="font-mono">{formatCurrency(plan.amount)}</strong>:{' '}
              {plan.type === 'income'
                ? 'o banco tem mais do que o app (falta lançar uma entrada).'
                : 'o app tem mais do que o banco (falta lançar uma saída).'}
            </>
          )}
        </div>
      )}

      {plan && plan.type !== null && !isDemoMode && (
        <Button variant="outline" size="sm" isLoading={busy} onClick={handleAdjust} className="w-full text-xs">
          Lançar ajuste de {formatCurrency(plan.amount)}
        </Button>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
};
