import React from 'react';
import type { CategoryBreakdownItem } from '../../lib/dashboardMetrics';
import { formatCurrency } from '../../lib/utils';
import { Card, CardTitle } from '../ui/Card';
import { PieChart } from 'lucide-react';

interface CategoryBreakdownChartProps {
  items: CategoryBreakdownItem[];
  totalExpense: number;
}

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  items,
  totalExpense,
}) => {
  return (
    <Card className="flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-600" />
            Gastos por Categoria
          </CardTitle>
          <span className="text-xs font-mono text-slate-500 font-medium">
            Total: {formatCurrency(totalExpense)}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            Nenhuma despesa registrada neste período.
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Visual Multi-Segment Bar */}
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              {items.map((item, idx) => (
                <div
                  key={item.categoryId || `item-${idx}`}
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                  title={`${item.categoryName}: ${item.percentage}%`}
                  className="h-full transition-all duration-500 hover:brightness-110"
                />
              ))}
            </div>

            {/* Category Items Detailed List */}
            <div className="space-y-2.5 pt-2 max-h-60 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={item.categoryId || `item-list-${idx}`}
                  className="flex items-center justify-between text-xs group"
                >
                  <div className="flex items-center gap-2 max-w-[60%]">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-700 truncate font-medium group-hover:text-emerald-700 transition-colors">
                      {item.categoryName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-400 text-[11px]">
                      {item.percentage}%
                    </span>
                    <span className="text-slate-900 font-semibold">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
