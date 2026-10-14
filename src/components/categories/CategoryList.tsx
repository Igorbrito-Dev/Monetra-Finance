import React, { useState } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { useTransactions } from '../../hooks/useTransactions';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../ui/Button';
import { CategoryModal } from './CategoryModal';
import {
  Plus,
  Tag,
  Trash2,
  Sparkles,
  ChevronRight,
  Home,
  Utensils,
  Car,
  HeartPulse,
  Gamepad2,
  Briefcase,
  ShoppingBag,
  Zap,
} from 'lucide-react';

export const CategoryList: React.FC = () => {
  const { categories, loading, createCategory, deleteCategory, seedDefaultCategories } = useCategories();
  const { transactions } = useTransactions();
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [selectedCat, setSelectedCat] = useState<typeof categories[0] | null>(null);

  const filteredCategories = categories.filter((cat) => {
    if (filter === 'all') return true;
    return cat.type === filter;
  });

  const handleSeed = async () => {
    setSeeding(true);
    await seedDefaultCategories();
    setSeeding(false);
  };

  const getCategoryStats = (categoryId: string) => {
    const txs = transactions.filter((t) => t.category_id === categoryId);
    const count = txs.length;
    const total = txs.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    return { count, total };
  };

  const getCategoryIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('moradia') || n.includes('casa') || n.includes('aluguel')) return <Home className="w-5 h-5 stroke-[2.2]" />;
    if (n.includes('aliment') || n.includes('mercado') || n.includes('restaurante')) return <Utensils className="w-5 h-5 stroke-[2.2]" />;
    if (n.includes('transporte') || n.includes('uber') || n.includes('combustivel')) return <Car className="w-5 h-5 stroke-[2.2]" />;
    if (n.includes('saude') || n.includes('farmacia') || n.includes('medico')) return <HeartPulse className="w-5 h-5 stroke-[2.2]" />;
    if (n.includes('lazer') || n.includes('jogos') || n.includes('cinema')) return <Gamepad2 className="w-5 h-5 stroke-[2.2]" />;
    if (n.includes('servico') || n.includes('internet') || n.includes('luz')) return <Zap className="w-5 h-5 stroke-[2.2]" />;
    if (n.includes('salario') || n.includes('trabalho') || n.includes('renda')) return <Briefcase className="w-5 h-5 stroke-[2.2]" />;
    return <ShoppingBag className="w-5 h-5 stroke-[2.2]" />;
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-in fade-in duration-200">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Categorias
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Classifique seus gastos e receitas.
          </p>
        </div>

        {categories.length === 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeed}
            isLoading={seeding}
            className="text-xs font-semibold bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            <span>Categorias Padrão (BR)</span>
          </Button>
        )}
      </div>

      {/* 2. FILTER PILLS: Todas | Despesas | Receitas */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Todas ({categories.length})
        </button>
        <button
          onClick={() => setFilter('expense')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            filter === 'expense'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Despesas
        </button>
        <button
          onClick={() => setFilter('income')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            filter === 'income'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Receitas
        </button>
      </div>

      {/* 3. CATEGORIES LIST (Matches Screen 6 of Reference) */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-white border border-slate-100 animate-pulse shadow-xs" />
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Tag className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Nenhuma categoria encontrada
          </h3>
          <p className="text-xs text-slate-500 mt-1 mb-4 max-w-xs mx-auto">
            Crie categorias personalizadas para classificar seus lançamentos.
          </p>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Criar Categoria
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden">
          {filteredCategories.map((category) => {
            const { count, total } = getCategoryStats(category.id);

            return (
              <div
                key={category.id}
                onClick={() => setSelectedCat(category)}
                className="flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-xs"
                    style={{ backgroundColor: category.color || '#10B981' }}
                  >
                    {getCategoryIcon(category.name)}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 truncate">
                      {category.name}
                    </h3>
                    <span className="text-xs text-slate-400 block mt-0.5 truncate">
                      {count} {count === 1 ? 'transação' : 'transações'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs sm:text-sm font-bold font-mono text-emerald-600 block leading-tight">
                    {formatCurrency(total)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. BOTTOM ACTION BUTTON (+ Nova Categoria Full-Width - Matches Screen 6 of Reference) */}
      <div className="pt-2">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/25 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[2.8]" />
          <span>Nova categoria</span>
        </button>
      </div>

      {/* CATEGORY DETAILS / DELETE MODAL */}
      {selectedCat && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Detalhes da Categoria
              </h3>
              <button
                onClick={() => setSelectedCat(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Nome:</span>
                <span className="font-semibold text-slate-800">{selectedCat.name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Tipo:</span>
                <span className="font-semibold text-slate-800">
                  {selectedCat.type === 'income' ? 'Receita' : 'Despesa'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Total movimentado:</span>
                <span className="font-bold font-mono text-emerald-600">
                  {formatCurrency(getCategoryStats(selectedCat.id).total)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  if (confirm(`Tem certeza que deseja excluir a categoria "${selectedCat.name}"?`)) {
                    await deleteCategory(selectedCat.id);
                    setSelectedCat(null);
                  }
                }}
                className="w-full justify-center text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>Excluir Categoria</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (categoryData) => {
          await createCategory(categoryData);
        }}
      />
    </div>
  );
};
