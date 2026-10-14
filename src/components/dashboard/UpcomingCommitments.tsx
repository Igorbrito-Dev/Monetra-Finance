import React from 'react';
import type { Transaction } from '../../types/database';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Card, CardTitle } from '../ui/Card';
import { CalendarClock, Layers, ArrowRight } from 'lucide-react';

interface UpcomingCommitmentsProps {
  commitments: Transaction[];
  onViewAll?: () => void;
}

export const UpcomingCommitments: React.FC<UpcomingCommitmentsProps> = ({
  commitments,
  onViewAll,
}) => {
  const totalUpcoming = commitments.reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-amber-500" />
              Compromissos & Parcelas Futuras
            </CardTitle>
            <span className="text-xs text-slate-500">
              Parcelas de compras agendadas para os próximos meses
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Comprometido</span>
            <span className="text-sm font-bold font-mono text-amber-600">
              {formatCurrency(totalUpcoming)}
            </span>
          </div>
        </div>

        {commitments.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            Nenhum compromisso ou parcela futura agendada.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {commitments.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 block">
                      {item.description}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Previsto para: {formatDate(item.transaction_date)}
                    </span>
                  </div>
                </div>

                <div className="font-mono font-bold text-slate-900">
                  {formatCurrency(item.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {onViewAll && commitments.length > 5 && (
        <button
          onClick={onViewAll}
          className="mt-4 pt-3 border-t border-slate-100 text-xs text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-1 font-semibold cursor-pointer"
        >
          Ver todos os {commitments.length} compromissos futuros <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </Card>
  );
};
