import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Camera, Mic, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { suggestCategory } from '../../lib/importMatching';
import { matchCategoryRule, type CategoryRule } from '../../lib/categoryRules';
import { buildDescriptionSuggestions, detectAnomaly, type DescriptionSuggestion } from '../../lib/spendingInsights';
import { getLocalToday } from '../../lib/billStatusStyles';
import { formatCurrency } from '../../lib/utils';
import type { Account, Category, CreditCard, PaymentMethod, Transaction } from '../../types/database';

export interface QuickAddPayload {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  payment_method: PaymentMethod;
  transaction_date: string;
  account_id: string | null;
  credit_card_id: string | null;
  category_id: string | null;
  is_paid: boolean;
  installments_count: number;
  card_closing_day?: number;
  card_due_day?: number;
}

interface QuickAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onMoreDetails: () => void;
  history: Transaction[];
  categories: Category[];
  accounts: Account[];
  cards: CreditCard[];
  rules: CategoryRule[];
  onSubmit: (payload: QuickAddPayload) => Promise<{ ids: string[]; error: Error | null }>;
  onLearn: (description: string, categoryId: string | null) => void;
  onSaved: (info: { ids: string[]; message: string; warning?: string }) => void;
}

type Method = 'pix' | 'credit' | 'debit' | 'cash';

const METHODS: { id: Method; label: string }[] = [
  { id: 'pix', label: 'Pix' },
  { id: 'credit', label: 'Crédito' },
  { id: 'debit', label: 'Débito' },
  { id: 'cash', label: 'Dinheiro' },
];

const DEFAULTS_KEY = 'monetra:quick-defaults';

function readDefaults(): { method?: Method; accountId?: string; cardId?: string } {
  try {
    return JSON.parse(localStorage.getItem(DEFAULTS_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeDefaults(value: { method: Method; accountId: string; cardId: string }) {
  try {
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(value));
  } catch {
    /* ignora */
  }
}

/** Reduz a foto para no máximo 1280px (JPEG) antes de enviar. */
async function resizeImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
}

const fieldClass =
  'w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-base placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15';

export const QuickAddSheet: React.FC<QuickAddSheetProps> = ({
  isOpen,
  onClose,
  onMoreDetails,
  history,
  categories,
  accounts,
  cards,
  rules,
  onSubmit,
  onLearn,
  onSaved,
}) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [method, setMethod] = useState<Method>('pix');
  const [accountId, setAccountId] = useState('');
  const [cardId, setCardId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [date, setDate] = useState(getLocalToday());
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Estado inicial a cada abertura: últimos meios de pagamento usados
  useEffect(() => {
    if (!isOpen) return;
    const defaults = readDefaults();
    setType('expense');
    setAmount('');
    setDescription('');
    setMethod(defaults.method ?? 'pix');
    setAccountId(defaults.accountId ?? '');
    setCardId(defaults.cardId ?? '');
    setCategoryId('');
    setCategoryTouched(false);
    setInstallments(1);
    setDate(getLocalToday());
    setError(null);
    setTimeout(() => amountRef.current?.focus(), 50);
  }, [isOpen]);

  const suggestions = useMemo<DescriptionSuggestion[]>(
    () => buildDescriptionSuggestions(history, description, 5),
    [history, description]
  );

  const speechSupported =
    typeof window !== 'undefined' &&
    Boolean((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition);

  if (!isOpen) return null;

  const expenseOrIncomeCategories = categories.filter((c) => c.type === type);
  const selectedCard = cards.find((c) => c.id === cardId);

  const autoCategory = (text: string): string => {
    const byRule = matchCategoryRule(text, rules);
    if (byRule) return byRule;
    return suggestCategory(text, categories) ?? '';
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (!categoryTouched) setCategoryId(autoCategory(value));
  };

  const applySuggestion = (s: DescriptionSuggestion) => {
    setDescription(s.description);
    if (s.lastAmount > 0 && !amount) setAmount(String(s.lastAmount).replace('.', ','));
    if (s.paymentMethod && ['pix', 'credit', 'debit', 'cash'].includes(s.paymentMethod)) {
      setMethod(s.paymentMethod as Method);
    }
    if (s.accountId) setAccountId(s.accountId);
    if (s.creditCardId) setCardId(s.creditCardId);
    if (s.categoryId) {
      setCategoryId(s.categoryId);
      setCategoryTouched(true);
    }
  };

  const handleVoice = () => {
    const Ctor = ((window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as
      | (new () => {
          lang: string;
          interimResults: boolean;
          onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
          onend: () => void;
          onerror: () => void;
          start: () => void;
        })
      | undefined;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    setListening(true);
    setError(null);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const numberMatch = transcript.match(/(\d+(?:[.,]\d{1,2})?)/);
      if (numberMatch) setAmount(numberMatch[1].replace('.', ','));
      const text = transcript
        .replace(/(\d+(?:[.,]\d{1,2})?)/, '')
        .replace(/\b(reais|real|gastei|paguei|comprei|de|no|na|em|um|uma)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) handleDescriptionChange(text);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setError('Não consegui ouvir. Verifique a permissão do microfone.');
    };
    recognition.start();
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setScanning(true);
    setError(null);
    try {
      const imageBase64 = await resizeImage(file);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sessão expirada. Entre novamente.');

      const response = await fetch('/api/ai/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg' }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        description?: string;
        amount?: number;
        date?: string | null;
        categoryName?: string | null;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || 'Não foi possível ler o comprovante');

      if (payload.amount) setAmount(String(payload.amount).replace('.', ','));
      if (payload.description) handleDescriptionChange(payload.description);
      if (payload.date && /^\d{4}-\d{2}-\d{2}$/.test(payload.date)) setDate(payload.date);
      if (payload.categoryName) {
        const found = categories.find((c) => c.name.toLowerCase() === payload.categoryName!.toLowerCase());
        if (found) {
          setCategoryId(found.id);
          setCategoryTouched(true);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao ler o comprovante');
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    const parsed = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
    if (parsed <= 0) {
      setError('Informe o valor.');
      return;
    }
    if (!description.trim()) {
      setError('Informe uma descrição.');
      return;
    }
    if (method === 'credit' && cards.length > 0 && !cardId) {
      setError('Escolha o cartão.');
      return;
    }

    setSaving(true);
    setError(null);

    const isCredit = method === 'credit';
    const { ids, error: saveError } = await onSubmit({
      description: description.trim(),
      amount: parsed,
      type,
      payment_method: method,
      transaction_date: date,
      account_id: !isCredit && accountId ? accountId : null,
      credit_card_id: isCredit && cardId ? cardId : null,
      category_id: categoryId || null,
      is_paid: !isCredit,
      installments_count: isCredit ? installments : 1,
      card_closing_day: isCredit ? selectedCard?.closing_day : undefined,
      card_due_day: isCredit ? selectedCard?.due_day : undefined,
    });
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    // Gasto atípico em relação ao histórico da mesma categoria
    let warning: string | undefined;
    if (type === 'expense' && categoryId) {
      const past = history
        .filter((t) => t.type === 'expense' && t.category_id === categoryId && !t.is_invoice_payment)
        .map((t) => Number(t.amount));
      const anomaly = detectAnomaly(installments > 1 ? parsed / installments : parsed, past);
      if (anomaly.isAnomaly) {
        const name = categories.find((c) => c.id === categoryId)?.name ?? 'esta categoria';
        warning = `Atenção: esse gasto é ${anomaly.ratio}× o seu valor típico em ${name} (mediana ${formatCurrency(anomaly.median)}).`;
      }
    }

    if (categoryTouched && categoryId) onLearn(description, categoryId);
    writeDefaults({ method, accountId, cardId });

    onSaved({
      ids,
      message: `${type === 'income' ? 'Receita' : 'Despesa'} de ${formatCurrency(parsed)} lançada`,
      warning,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-900">Lançamento rápido</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setCategoryId('');
                  setCategoryTouched(false);
                }}
                className={`py-2 text-sm font-semibold rounded-xl border transition-all cursor-pointer ${
                  type === t
                    ? t === 'expense'
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {t === 'expense' ? 'Despesa' : 'Receita'}
              </button>
            ))}
          </div>

          {/* Valor */}
          <input
            ref={amountRef}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className={`${fieldClass} text-2xl font-extrabold font-mono`}
            aria-label="Valor"
          />

          {/* Descrição + atalhos de foto e voz */}
          <div className="flex gap-2">
            <input
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="O que foi? (ex: Uber, mercado)"
              className={fieldClass}
              aria-label="Descrição"
            />
            <label
              className="flex items-center justify-center w-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-emerald-700 cursor-pointer flex-shrink-0"
              title="Ler comprovante por foto"
            >
              {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
            </label>
            {speechSupported && (
              <button
                type="button"
                onClick={handleVoice}
                className={`flex items-center justify-center w-12 rounded-xl border flex-shrink-0 cursor-pointer ${
                  listening
                    ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-emerald-700'
                }`}
                title="Falar o lançamento"
                aria-label="Falar o lançamento"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Sugestões / repetir */}
          {suggestions.length > 0 && (
            <div>
              <span className="text-[11px] text-slate-400 block mb-1.5">
                {description ? 'Sugestões' : 'Repetir um lançamento'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s.description}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    {s.description} · {formatCurrency(s.lastAmount)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Forma de pagamento */}
          <div className="grid grid-cols-4 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  method === m.id
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {method === 'credit' ? (
            <div className="grid grid-cols-3 gap-2">
              <select
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                className={`${fieldClass} col-span-2 !py-2.5 text-sm`}
                aria-label="Cartão"
              >
                <option value="">Cartão...</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={installments}
                onChange={(e) => setInstallments(parseInt(e.target.value, 10))}
                className={`${fieldClass} !py-2.5 text-sm`}
                aria-label="Parcelas"
              >
                {[1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24].map((n) => (
                  <option key={n} value={n}>
                    {n}x
                  </option>
                ))}
              </select>
            </div>
          ) : (
            accounts.length > 0 && (
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className={`${fieldClass} !py-2.5 text-sm`}
                aria-label="Conta"
              >
                <option value="">Conta (opcional)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )
          )}

          <div className="grid grid-cols-2 gap-2">
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setCategoryTouched(true);
              }}
              className={`${fieldClass} !py-2.5 text-sm`}
              aria-label="Categoria"
            >
              <option value="">Categoria</option>
              {expenseOrIncomeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${fieldClass} !py-2.5 text-sm`}
              aria-label="Data"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <Button variant="primary" size="lg" isLoading={saving} onClick={handleSave} className="w-full font-bold">
            Lançar
          </Button>

          <button
            type="button"
            onClick={onMoreDetails}
            className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-slate-500 hover:text-emerald-700 cursor-pointer py-1"
          >
            Mais detalhes (anotações, parcelas, fatura) <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
