import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { useAccounts } from '../../hooks/useAccounts';
import { useCreditCards } from '../../hooks/useCreditCards';
import { useCategories } from '../../hooks/useCategories';
import type { TransactionType, PaymentMethod, Category, Account, CreditCard } from '../../types/database';
import { X, Layers, ShieldCheck } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    description: string;
    amount: number;
    type: TransactionType;
    payment_method: PaymentMethod;
    transaction_date: string;
    account_id?: string | null;
    credit_card_id?: string | null;
    category_id?: string | null;
    is_paid?: boolean;
    is_invoice_payment?: boolean;
    installments_count?: number;
    notes?: string;
  }) => Promise<void>;
  categories?: Category[];
  accounts?: Account[];
  cards?: CreditCard[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories: propCategories,
  accounts: propAccounts,
  cards: propCards,
}) => {
  const hookAccounts = useAccounts();
  const hookCards = useCreditCards();
  const hookCategories = useCategories();

  const accounts = propAccounts || hookAccounts.accounts;
  const cards = propCards || hookCards.cards;
  const categories = propCategories || hookCategories.categories;

  const [type, setType] = useState<TransactionType>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [accountId, setAccountId] = useState('');
  const [cardId, setCardId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isPaid, setIsPaid] = useState(true);
  const [isInvoicePayment, setIsInvoicePayment] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState(2);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) =>
    type === 'expense' ? c.type === 'expense' : c.type === 'income'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const parsedAmount = parseFloat(amount.replace(',', '.')) || 0;

      await onSubmit({
        description,
        amount: parsedAmount,
        type,
        payment_method: paymentMethod,
        transaction_date: date,
        account_id: paymentMethod === 'credit' ? null : (accountId || null),
        credit_card_id: paymentMethod === 'credit' ? (cardId || null) : null,
        category_id: isInvoicePayment ? null : (categoryId || null),
        is_paid: isPaid,
        is_invoice_payment: isInvoicePayment,
        installments_count: isInstallment ? installmentsCount : 1,
        notes: notes || undefined,
      });

      // Reset form
      setDescription('');
      setAmount('');
      setNotes('');
      setIsInstallment(false);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg p-5 sm:p-6 bg-white border border-slate-100 rounded-3xl shadow-2xl relative max-h-[92vh] overflow-y-auto text-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 text-slate-400 hover:text-slate-700 p-1 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-slate-900 mb-4">Novo Lançamento</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Transação */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setIsInvoicePayment(false);
              }}
              className={`py-2 px-1 text-center text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                type === 'expense' && !isInvoicePayment
                  ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setIsInvoicePayment(false);
              }}
              className={`py-2 px-1 text-center text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Receita
            </button>
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setIsInvoicePayment(true);
                setPaymentMethod('transfer');
              }}
              className={`py-2 px-1 text-center text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                isInvoicePayment
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Fatura
            </button>
          </div>

          {/* Alerta de Prevenção de Dupla Contagem */}
          {isInvoicePayment && (
            <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 text-indigo-600 mt-0.5" />
              <span>
                <strong>Anti-Dupla Contagem Ativo:</strong> O pagamento da fatura debita a conta bancária mas não infla as despesas por categoria de consumo.
              </span>
            </div>
          )}

          {/* Descrição e Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Descrição
              </label>
              <input
                type="text"
                required
                placeholder={isInvoicePayment ? 'Pagamento Fatura Nubank' : 'Ex: Almoço, Salário, Uber'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Valor Total (R$)
              </label>
              <input
                type="text"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 font-mono font-bold"
              />
            </div>
          </div>

          {/* Data e Forma de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Data do Lançamento
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const val = e.target.value as PaymentMethod;
                  setPaymentMethod(val);
                  if (val !== 'credit') {
                    setIsInstallment(false);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
              >
                <option value="pix">Pix</option>
                <option value="credit">Cartão de Crédito</option>
                <option value="debit">Cartão de Débito</option>
                <option value="cash">Dinheiro em Espécie</option>
                <option value="transfer">Transferência / TED</option>
                <option value="boleto">Boleto Bancário</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>

          {/* Vínculo de Conta Bancária ou Cartão */}
          {paymentMethod === 'credit' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cartão de Crédito Utilizado
              </label>
              <select
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
              >
                <option value="">Selecione um cartão (opcional)</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Vence dia {c.due_day})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Conta Bancária / Carteira
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
              >
                <option value="">Selecione uma conta (opcional)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Categoria */}
          {!isInvoicePayment && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Categoria
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
              >
                <option value="">Selecione uma categoria (opcional)</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Parcelamento de Cartão de Crédito */}
          {paymentMethod === 'credit' && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={isInstallment}
                  onChange={(e) => setIsInstallment(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Compra Parcelada (Dividir em parcelas mensais)</span>
              </label>

              {isInstallment && (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-500">Quantidade de Parcelas:</span>
                  <select
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 18, 24, 36, 48].map((n) => (
                      <option key={n} value={n}>
                        {n}x de R${' '}
                        {amount
                          ? (
                              (parseFloat(amount.replace(',', '.')) || 0) / n
                            ).toFixed(2)
                          : '0.00'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Status Efetivado */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-semibold text-slate-700">
              Lançamento já foi efetivado / pago?
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>

          <div className="flex gap-2.5 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 text-xs font-bold"
              isLoading={loading}
            >
              Gravar Lançamento
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
