import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Mic,
  TrendingUp,
  Zap,
  Layers,
  ChevronRight,
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { signIn, signUp, enterDemoMode, isConfigured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setErrorMessage('A senha deve conter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('E-mail ou senha incorretos.');
        } else {
          setErrorMessage(error.message);
        }
      }
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage(
          'Conta criada com sucesso! Se a confirmação de e-mail estiver ativa, verifique sua caixa de entrada.'
        );
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[35rem] h-[35rem] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[35rem] h-[35rem] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/20 via-slate-950/80 to-slate-950 pointer-events-none" />

      {/* Main Responsive Grid Container */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        
        {/* LEFT COLUMN: Visual Showcase & Technology Highlights */}
        <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-center lg:text-left">
          
          {/* Badge de Destaque Tecnológico */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-md shadow-lg shadow-emerald-500/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Monetra Intelligence 2.0 • Zero-VPS Serverless</span>
          </div>

          {/* Headline Principal */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Sua gestão financeira pessoal{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">
                reimaginada com IA
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Registre gastos por mensagens de voz ou texto pelo Telegram com Whisper, acompanhe compromissos futuros e mantenha isolamento total de dados com Supabase RLS.
            </p>
          </div>

          {/* Interactive Showcase Mockup Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-left">
            {/* Card 1: Telegram Whisper Voice */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl hover:border-emerald-500/30 transition-all shadow-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold text-white">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                    <Mic className="w-4 h-4" />
                  </div>
                  Comando por Voz
                </span>
                <Badge variant="emerald">Whisper PT-BR</Badge>
              </div>
              <p className="text-xs text-slate-300 font-medium italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                🎙️ "Almoço de R$ 48 no débito Nubank"
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span className="text-emerald-400 font-semibold">✓ Categorizado em Alimentação</span>
                <span>Idempotente</span>
              </div>
            </div>

            {/* Card 2: Orçamento & Teto */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl hover:border-indigo-500/30 transition-all shadow-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold text-white">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  Teto Orçamentário
                </span>
                <Badge variant="indigo">Controle Ativo</Badge>
              </div>
              <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Gasto: R$ 2.450 / R$ 3.500</span>
                  <span className="text-emerald-400 font-bold">70%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full" style={{ width: '70%' }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span>Alerta automático a 80%</span>
                <span className="text-slate-300">Anti-Duplicidade</span>
              </div>
            </div>
          </div>

          {/* Pillars List */}
          <div className="hidden sm:flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-slate-400 pt-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Row Level Security (RLS)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              100% Zero-VPS
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              Vercel Serverless
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Auth Panel */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <Card className="p-6 sm:p-8 bg-slate-900/90 border-slate-800/80 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
            {/* Top Glowing Edge */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />

            {/* Mobile Header / Brand */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white font-black text-lg">
                  M
                </div>
                <div>
                  <span className="text-base font-bold text-white tracking-tight">
                    Monetra <span className="text-emerald-400">Finance</span>
                  </span>
                  <span className="text-[10px] text-slate-500 block font-mono">Acesso Seguro</span>
                </div>
              </div>

              <Badge variant="emerald" className="text-[10px]">v0.1.0 MVP</Badge>
            </div>

            {/* Aviso se Supabase não estiver configurado */}
            {!isConfigured && (
              <div className="p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
                <span>
                  Supabase não conectado. Configure o <code className="font-mono">.env</code> ou explore no <strong>Modo Demonstração</strong> abaixo.
                </span>
              </div>
            )}

            {/* Tab Switcher */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Criar Conta
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Igor Brito"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Senha
                  </label>
                  {mode === 'signin' && (
                    <span className="text-[11px] text-slate-500 hover:text-emerald-400 cursor-pointer">
                      Esqueceu a senha?
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2 font-bold shadow-lg shadow-emerald-500/20"
                isLoading={loading}
              >
                {mode === 'signin' ? 'Entrar no Sistema' : 'Criar Conta Gratuita'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>

            {/* Instant Demo Mode Section */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center space-y-3">
              <span className="text-[11px] text-slate-400 block">
                Quer testar agora sem criar conta?
              </span>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={enterDemoMode}
                className="w-full border-slate-700/80 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-slate-200 text-xs font-semibold group"
              >
                <Sparkles className="w-4 h-4 mr-2 text-emerald-400 group-hover:rotate-12 transition-transform" />
                Explorar no Modo Demonstração
                <ChevronRight className="w-3.5 h-3.5 ml-1 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </Button>
            </div>

            {/* Security Bottom Stamp */}
            <div className="mt-5 pt-3 border-t border-slate-850 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Multi-Inquilino • Banco Supabase com RLS</span>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};
