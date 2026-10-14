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
  Eye,
  EyeOff,
  CreditCard,
  CalendarClock,
  FileSpreadsheet,
  BellRing,
  Bot,
  TrendingUp,
} from 'lucide-react';

/** Dados ilustrativos exibidos apenas no painel de apresentação (desktop). */
const SAMPLE_MONTHS = [
  { label: 'Mai', income: 72, expense: 58 },
  { label: 'Jun', income: 75, expense: 64 },
  { label: 'Jul', income: 70, expense: 49 },
  { label: 'Ago', income: 78, expense: 66 },
  { label: 'Set', income: 80, expense: 61 },
  { label: 'Out', income: 85, expense: 57 },
];

const FEATURES = [
  { icon: Bot, title: 'Assistente com memória', text: 'Registra vários gastos numa só mensagem e pergunta o que faltar.' },
  { icon: Mic, title: 'Telegram por voz ou texto', text: 'Fale "almoço de 48 no débito" e pronto.' },
  { icon: CreditCard, title: 'Parcelas na fatura certa', text: 'Considera fechamento e vencimento de cada cartão.' },
  { icon: CalendarClock, title: 'Contas fixas', text: 'Verde pago, amarelo vence hoje, vermelho atrasado.' },
  { icon: BellRing, title: 'Lembretes e relatório diário', text: 'Avisos no app e no Telegram, no horário que você escolher.' },
  { icon: FileSpreadsheet, title: 'Importação de extrato', text: 'CSV com prévia e proteção contra duplicidades.' },
];

const inputClass =
  'w-full pl-10 pr-4 py-3 sm:py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-base sm:text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all';

export const AuthPage: React.FC = () => {
  const { signIn, signUp, resetPassword, enterDemoMode, isConfigured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const switchMode = (next: 'signin' | 'signup') => {
    setMode(next);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

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

  const handleForgotPassword = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!email) {
      setErrorMessage('Informe seu e-mail acima para receber o link de redefinição.');
      return;
    }
    const { error } = await resetPassword(email);
    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage('Enviamos um link de redefinição de senha para o seu e-mail.');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-800 flex items-start sm:items-center justify-center px-4 py-6 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Brilhos decorativos (apenas desktop) */}
      <div className="hidden lg:block absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="hidden lg:block absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* ============ PAINEL DE APRESENTAÇÃO (somente PC) ============ */}
        <div className="hidden lg:flex lg:col-span-7 flex-col gap-6">
          <div className="inline-flex self-start items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Gestão financeira pessoal com IA
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              Seu dinheiro sob controle,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600">
                da conversa ao painel
              </span>
            </h1>
            <p className="text-base text-slate-600 max-w-xl leading-relaxed">
              Registre gastos pelo Telegram ou pelo chat, acompanhe faturas, contas fixas e metas e receba avisos antes de
              qualquer vencimento — tudo isolado por usuário.
            </p>
          </div>

          {/* Painel de exemplo com indicadores */}
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Visão do mês
              </span>
              <Badge variant="indigo">Exemplo ilustrativo</Badge>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Saldo do mês', value: 'R$ 4.850', tone: 'text-emerald-600' },
                { label: 'Receitas', value: 'R$ 14.500', tone: 'text-slate-900' },
                { label: 'Despesas', value: 'R$ 9.650', tone: 'text-rose-600' },
                { label: 'Economia', value: '33%', tone: 'text-indigo-600' },
              ].map((kpi) => (
                <div key={kpi.label} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">{kpi.label}</span>
                  <span className={`text-lg font-extrabold font-mono ${kpi.tone}`}>{kpi.value}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-4">
              {/* Evolução 6 meses */}
              <div className="col-span-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-600">Receitas x despesas (6 meses)</span>
                  <span className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-emerald-500" /> Receitas
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-rose-400" /> Despesas
                    </span>
                  </span>
                </div>
                <div className="flex items-end justify-between gap-2 h-24">
                  {SAMPLE_MONTHS.map((m) => (
                    <div key={m.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div className="flex items-end gap-0.5 h-full w-full justify-center">
                        <div className="w-2.5 rounded-t bg-emerald-500" style={{ height: `${m.income}%` }} />
                        <div className="w-2.5 rounded-t bg-rose-400" style={{ height: `${m.expense}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Orçamento + fatura */}
              <div className="col-span-2 space-y-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-[11px] font-mono mb-1.5">
                    <span className="text-slate-600">Teto: R$ 2.450 / 3.500</span>
                    <span className="text-emerald-600 font-bold">70%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: '70%' }} />
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> Fatura Nubank
                  </span>
                  <span className="text-sm font-extrabold font-mono text-slate-900 block">R$ 1.240,00</span>
                  <span className="text-[10px] text-slate-400">Fecha 20/10 • vence 28/10</span>
                </div>
              </div>
            </div>

            {/* Próximos vencimentos com as cores de status */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'Aluguel', when: 'Atrasado • 05/10', pill: 'bg-rose-50 text-rose-700 border-rose-300' },
                { name: 'Internet', when: 'Vence hoje', pill: 'bg-amber-50 text-amber-700 border-amber-300' },
                { name: 'Energia', when: 'Pago • 08/10', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              ].map((bill) => (
                <div key={bill.name} className={`p-2.5 rounded-xl border text-xs ${bill.pill}`}>
                  <span className="font-bold block">{bill.name}</span>
                  <span className="text-[11px] opacity-90">{bill.when}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recursos */}
          <div className="grid grid-cols-3 gap-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-900 block">{title}</span>
                <span className="text-[11px] text-slate-500 leading-snug block mt-0.5">{text}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Dados isolados por usuário (Row Level Security) • Sem servidor dedicado
          </div>
        </div>

        {/* ============ PAINEL DE ACESSO ============ */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <Card className="p-5 sm:p-8 bg-white border-slate-200/90 shadow-xl rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

            {/* Marca */}
            <div className="flex items-center gap-3 mb-5 sm:mb-6">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white font-black text-lg flex-shrink-0">
                M
              </div>
              <div className="min-w-0">
                <span className="text-lg font-bold text-slate-900 tracking-tight block leading-tight">
                  Monetra <span className="text-emerald-600">Finance</span>
                </span>
                <span className="text-xs text-slate-500 block">
                  {mode === 'signin' ? 'Entre para ver suas finanças' : 'Crie sua conta gratuita'}
                </span>
              </div>
            </div>

            {!isConfigured && (
              <div className="p-3 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Supabase não conectado. Configure o <code className="font-mono bg-amber-100/70 px-1 py-0.5 rounded">.env</code> ou
                  explore no <strong>Modo Demonstração</strong> abaixo.
                </span>
              </div>
            )}

            {/* Alternância Entrar / Criar conta */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
              {(['signin', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2.5 sm:py-2 text-sm sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    mode === m ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m === 'signin' ? 'Entrar' : 'Criar conta'}
                </button>
              ))}
            </div>

            {errorMessage && (
              <div role="alert" className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div role="status" className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nome completo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-name"
                      type="text"
                      required
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700">
                    Senha
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-emerald-700 hover:underline cursor-pointer font-medium"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Mínimo de 6 caracteres' : '••••••••'}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-1 font-bold shadow-md shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-700 text-white"
                isLoading={loading}
              >
                {mode === 'signin' ? 'Entrar' : 'Criar conta'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>

            {/* Modo demonstração */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={enterDemoMode}
                className="w-full border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-sm sm:text-xs font-semibold group transition-all"
              >
                <Sparkles className="w-4 h-4 mr-2 text-emerald-600 group-hover:rotate-12 transition-transform" />
                Explorar sem criar conta
              </Button>
            </div>

            <p className="hidden sm:flex mt-4 items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Seus dados são isolados por usuário
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
