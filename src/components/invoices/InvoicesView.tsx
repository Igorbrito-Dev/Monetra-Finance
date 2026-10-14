import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, CreditCard as CardIcon, Wallet } from 'lucide-react';
import { useInvoices } from '../../hooks/useInvoices';
import { useCreditCards } from '../../hooks/useCreditCards';
import { useAccounts } from '../../hooks/useAccounts';
import { getBillStatusStyle } from '../../lib/billStatusStyles';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../ui/Button';
import type { Invoice } from '../../lib/invoices';
import type { Transaction } from '../../types/database';

export const InvoicesView: React.FC = () => {
  const { invoices, loading, error, payInvoice } = useInvoices();
  const { cards } = useCreditCards();
  const { accounts } = useAccounts();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [payingKey, setPayingKey] = useState<string | null>(null);
  const [accountId, setAccountId] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const invoicesByCard = useMemo(() => {
    const map = new Map<string, Invoice<Transaction>[]>();
    for (const invoice of invoices) {
      map.set(invoice.cardId, [...(map.get(invoice.cardId) ?? []), invoice]);
    }
    return map;
  }, [invoices]);

  const handlePay = async (invoice: Invoice<Transaction>) => {
    const card = cards.find((c) => c.id === invoice.cardId);
    setBusy(true);
    setFeedback(null);
    const { error: payError } = await payInvoice({
      invoice,
      accountId: accountId || null,
      cardName: card?.name ?? 'cartão',
    });
    setBusy(false);

    if (payError) {
      setFeedback({ ok: false, text: payError.message });
      return;
    }
    setFeedback({ ok: true, text: 'Fatura paga e registrada sem contar como nova despesa.' });
    setPayingKey(null);
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Faturas</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Acompanhe cada fatura por cartão e registre o pagamento sem contar duas vezes.
        </p>
      </div>

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
      )}
      {feedback && (
        <p
          className={`text-xs rounded-xl px-3 py-2 border ${
            feedback.ok
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : 'text-rose-600 bg-rose-50 border-rose-200'
          }`}
        >
          {feedback.text}
        </p>
      )}

      {loading ? (
        <p className="text-xs text-slate-400 py-6 text-center">Carregando faturas...</p>
      ) : invoices.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-xs">
          <CardIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Nenhuma fatura encontrada</p>
          <p className="text-xs text-slate-400 mt-1">
            Compras no cartão de crédito aparecem aqui, agrupadas pelo vencimento da fatura.
          </p>
        </div>
      ) : (
        Array.from(invoicesByCard.entries()).map(([cardId, cardInvoices]) => {
          const card = cards.find((c) => c.id === cardId);
          return (
            <section key={cardId} className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400 px-1 flex items-center gap-1.5">
                <CardIcon className="w-3.5 h-3.5" />
                {card?.name ?? 'Cartão'}
                {card && (
                  <span className="normal-case font-medium">
                    • fecha dia {card.closing_day} • vence dia {card.due_day}
                  </span>
                )}
              </h2>

              <div className="bg-white border border-slate-100 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden">
                {cardInvoices.map((invoice) => {
                  const style = getBillStatusStyle(invoice.dueDate, invoice.isPaid);
                  const isOpen = expanded === invoice.key;
                  const isPaying = payingKey === invoice.key;

                  return (
                    <div key={invoice.key}>
                      <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4">
                        <button
                          onClick={() => setExpanded(isOpen ? null : invoice.key)}
                          className="flex items-center gap-3 min-w-0 text-left cursor-pointer"
                        >
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="text-sm font-bold text-slate-800 block">
                              Vence {formatDate(invoice.dueDate)}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {invoice.items.length} lançamento{invoice.items.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        </button>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.pill}`}>
                            {style.status === 'upcoming' ? 'Em aberto' : style.label}
                          </span>
                          <span className="text-sm font-extrabold font-mono text-slate-900">
                            {formatCurrency(invoice.total)}
                          </span>
                          {!invoice.isPaid && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPayingKey(isPaying ? null : invoice.key);
                                setFeedback(null);
                              }}
                              className="text-[11px]"
                            >
                              Pagar
                            </Button>
                          )}
                        </div>
                      </div>

                      {isPaying && (
                        <div className="px-4 pb-4 -mt-1">
                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Wallet className="w-4 h-4 text-slate-400" />
                              Pagar <strong className="text-slate-900">{formatCurrency(invoice.outstanding)}</strong> com a conta:
                            </div>
                            <select
                              value={accountId}
                              onChange={(e) => setAccountId(e.target.value)}
                              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                            >
                              <option value="">Sem conta específica</option>
                              {accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                            <Button
                              variant="primary"
                              size="sm"
                              isLoading={busy}
                              onClick={() => handlePay(invoice)}
                              className="text-xs font-bold"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar pagamento
                            </Button>
                          </div>
                        </div>
                      )}

                      {isOpen && (
                        <ul className="bg-slate-50/60 divide-y divide-slate-100 border-t border-slate-100">
                          {invoice.items.map((item) => (
                            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-700 block truncate">{item.description}</span>
                                {item.notes && <span className="text-[11px] text-slate-400 block truncate">{item.notes}</span>}
                              </div>
                              <span className="font-mono font-bold text-slate-800 flex-shrink-0">
                                {formatCurrency(Number(item.amount))}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
};
