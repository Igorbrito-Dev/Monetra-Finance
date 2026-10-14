import React, { useState } from 'react';
import type { MonthEvolutionItem } from '../../lib/dashboardMetrics';
import { formatCurrency } from '../../lib/utils';
import { Card, CardTitle } from '../ui/Card';
import { TrendingUp } from 'lucide-react';

interface EvolutionBarChartProps {
  data: MonthEvolutionItem[];
}

export const EvolutionBarChart: React.FC<EvolutionBarChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxVal = Math.max(
    ...data.flatMap((d) => [d.income, d.expense]),
    1000
  );

  const chartHeight = 160;

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-6">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Evolução Mensal (Últimos 6 Meses)
          </CardTitle>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
              <span className="text-slate-400">Receitas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" />
              <span className="text-slate-400">Despesas</span>
            </div>
          </div>
        </div>

        {/* Hover Summary / Tooltip Box */}
        <div className="h-6 mb-2 text-xs flex items-center justify-end font-mono">
          {hoveredIndex !== null ? (
            <div className="flex items-center gap-3 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 animate-in fade-in duration-150">
              <span className="text-slate-400 font-sans font-semibold">
                {data[hoveredIndex].monthLabel}:
              </span>
              <span className="text-emerald-400">
                Rec: {formatCurrency(data[hoveredIndex].income)}
              </span>
              <span className="text-rose-400">
                Desp: {formatCurrency(data[hoveredIndex].expense)}
              </span>
            </div>
          ) : (
            <span className="text-slate-600">Passe o cursor sobre as barras para ver detalhes</span>
          )}
        </div>

        {/* Bar Chart Container */}
        <div className="relative pt-4 pb-2">
          {/* Background Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
            <div className="border-b border-slate-200 w-full" />
            <div className="border-b border-slate-200 w-full" />
            <div className="border-b border-slate-200 w-full" />
          </div>

          {/* Columns */}
          <div className="flex items-end justify-between gap-2 sm:gap-6 h-40 relative z-10 px-2">
            {data.map((item, idx) => {
              const incomeHeight = Math.max((item.income / maxVal) * chartHeight, 4);
              const expenseHeight = Math.max((item.expense / maxVal) * chartHeight, 4);
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={`${item.year}-${item.month}`}
                  className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Bars Pair */}
                  <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-40">
                    {/* Income Bar */}
                    <div
                      style={{ height: `${incomeHeight}px` }}
                      className={`w-3 sm:w-4 rounded-t-md transition-all duration-300 ${
                        isHovered
                          ? 'bg-emerald-300 shadow-lg shadow-emerald-500/30'
                          : 'bg-emerald-500/80 hover:bg-emerald-400'
                      }`}
                    />

                    {/* Expense Bar */}
                    <div
                      style={{ height: `${expenseHeight}px` }}
                      className={`w-3 sm:w-4 rounded-t-md transition-all duration-300 ${
                        isHovered
                          ? 'bg-rose-300 shadow-lg shadow-rose-500/30'
                          : 'bg-rose-500/80 hover:bg-rose-400'
                      }`}
                    />
                  </div>

                  {/* Month Label */}
                  <span
                    className={`text-[11px] font-medium transition-colors ${
                      isHovered ? 'text-white font-bold' : 'text-slate-400'
                    }`}
                  >
                    {item.monthLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};
