import React, { useEffect, useState } from 'react';
import { BellRing, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

const selectClass =
  'px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:bg-white focus:border-emerald-500';

export const NotificationSettings: React.FC = () => {
  const { profile, updateNotificationSettings } = useAuth();

  const [enabled, setEnabled] = useState(true);
  const [hour, setHour] = useState(20);
  const [billDays, setBillDays] = useState(1);
  const [cardDays, setCardDays] = useState(2);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!profile) return;
    setEnabled(profile.daily_report_enabled ?? true);
    setHour(profile.daily_report_hour ?? 20);
    setBillDays(profile.bill_reminder_days ?? 1);
    setCardDays(profile.card_reminder_days ?? 2);
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    const { error } = await updateNotificationSettings({
      daily_report_enabled: enabled,
      daily_report_hour: hour,
      bill_reminder_days: billDays,
      card_reminder_days: cardDays,
    });
    setSaving(false);
    setFeedback(
      error
        ? { ok: false, text: `Não foi possível salvar: ${error.message}` }
        : { ok: true, text: 'Preferências salvas.' }
    );
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
          <BellRing className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div>
          <span className="text-sm font-bold text-slate-800 block">Notificações e lembretes</span>
          <span className="text-xs text-slate-400 block">
            Avisos no app e no Telegram (horário de Brasília)
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs sm:text-sm font-semibold text-slate-700">Receber relatório diário</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs sm:text-sm text-slate-600">Horário do relatório diário</span>
          <select
            value={hour}
            disabled={!enabled}
            onChange={(e) => setHour(parseInt(e.target.value, 10))}
            className={`${selectClass} disabled:opacity-50`}
          >
            {Array.from({ length: 24 }, (_, h) => h).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs sm:text-sm text-slate-600">Avisar contas a vencer com antecedência de</span>
          <select value={billDays} onChange={(e) => setBillDays(parseInt(e.target.value, 10))} className={selectClass}>
            {[0, 1, 2, 3, 5, 7].map((d) => (
              <option key={d} value={d}>
                {d === 0 ? 'Só no dia' : `${d} dia${d === 1 ? '' : 's'}`}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs sm:text-sm text-slate-600">Avisar fatura do cartão com antecedência de</span>
          <select value={cardDays} onChange={(e) => setCardDays(parseInt(e.target.value, 10))} className={selectClass}>
            {[0, 1, 2, 3, 5, 7].map((d) => (
              <option key={d} value={d}>
                {d === 0 ? 'Só no dia' : `${d} dia${d === 1 ? '' : 's'}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <span
          className={`text-xs font-semibold flex items-center gap-1 ${feedback?.ok ? 'text-emerald-600' : 'text-rose-600'}`}
        >
          {feedback?.ok && <Check className="w-3.5 h-3.5" />}
          {feedback?.text}
        </span>
        <Button variant="primary" size="sm" onClick={handleSave} isLoading={saving} className="text-xs font-bold">
          Salvar
        </Button>
      </div>
    </div>
  );
};
