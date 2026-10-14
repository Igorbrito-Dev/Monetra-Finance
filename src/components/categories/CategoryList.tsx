import React, { useState } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { Card, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CategoryModal } from './CategoryModal';
import { Plus, Tag, Trash2, Sparkles, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export const CategoryList: React.FC = () => {
  const { categories, loading, createCategory, deleteCategory, seedDefaultCategories } = useCategories();
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const filteredCategories = categories.filter((cat) => {
    if (filter === 'all') return true;
    return cat.type === filter;
  });

  const expenseCount = categories.filter((c) => c.type === 'expense').length;
  const incomeCount = categories.filter((c) => c.type === 'income').length;

  const handleSeed = async () => {
    setSeeding(true);
    await seedDefaultCategories();
    setSeeding(false);
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-emerald-400" />
            Categorias de Lançamento
          </h2>
          <p className="text-sm text-slate-400">
            Classifique suas entradas e saídas para alimentar relatórios e o assistente de IA.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          {categories.length === 0 && (
            <Button
              variant="outline"
              onClick={handleSeed}
              isLoading={seeding}
              className="w-full sm:w-auto justify-center border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 text-xs"
            >
              <Sparkles className="w-4 h-4 mr-1.5 text-emerald-400" /> Categorias Padrão (BR)
            </Button>
          )}

          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto justify-center text-xs font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nova Categoria
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Todas ({categories.length})
        </button>
        <button
          onClick={() => setFilter('expense')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            filter === 'expense'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-rose-400'
          }`}
        >
          <ArrowDownCircle className="w-3.5 h-3.5" /> Despesas ({expenseCount})
        </button>
        <button
          onClick={() => setFilter('income')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            filter === 'income'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-emerald-400'
          }`}
        >
          <ArrowUpCircle className="w-3.5 h-3.5" /> Receitas ({incomeCount})
        </button>
      </div>

      {/* Category List Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-900/60 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <Card className="text-center py-12 border-dashed border-slate-800">
          <Tag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <CardTitle className="text-slate-300">Nenhuma categoria encontrada</CardTitle>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Crie suas próprias categorias ou preencha rapidamente com as categorias recomendadas.
          </p>
          <Button variant="primary" onClick={handleSeed} isLoading={seeding}>
            <Sparkles className="w-4 h-4 mr-1.5" /> Preencher Categorias Brasileiras
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCategories.map((category) => (
            <div
              key={category.id}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: category.color || '#3B82F6' }}
                />
                <div>
                  <h4 className="text-sm font-semibold text-white tracking-tight">
                    {category.name}
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {category.type === 'expense' ? 'Despesa' : 'Receita'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Badge variant={category.type === 'expense' ? 'rose' : 'emerald'}>
                  {category.type === 'expense' ? 'Saída' : 'Entrada'}
                </Badge>
                <button
                  onClick={() => {
                    if (confirm(`Deseja excluir a categoria "${category.name}"?`)) {
                      deleteCategory(category.id);
                    }
                  }}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all cursor-pointer"
                  title="Excluir categoria"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (data) => {
          await createCategory(data);
        }}
      />
    </div>
  );
};
