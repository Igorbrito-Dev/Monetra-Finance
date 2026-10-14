import React, { useState } from 'react';
import { useTelegramIntegration } from '../../hooks/useTelegramIntegration';
import { Card, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  X,
  Bot,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  Unlink,
  ExternalLink,
  Mic,
  Target,
} from 'lucide-react';

interface TelegramIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramIntegrationModal: React.FC<TelegramIntegrationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    isLinked,
    chatId,
    token,
    loading,
    error,
    generateLinkToken,
    unlinkTelegram,
  } = useTelegramIntegration();

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const botUsername = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string) || 'MonetraFinanceBot';
  const telegramDirectUrl = token ? `https://t.me/${botUsername}?start=${token}` : `https://t.me/${botUsername}`;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-lg p-6 border-slate-800 bg-slate-900 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-xl text-white">Bot do Telegram com IA & Voz</CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Lance gastos por texto ou voz (Whisper), consulte limites e faturas em tempo real.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Status Card */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between mb-6">
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Status da Conexão</span>
            <div className="flex items-center gap-2">
              <Badge variant={isLinked ? 'emerald' : 'amber'}>
                {isLinked ? 'Conectado ao Telegram' : 'Não Vinculado'}
              </Badge>
              {isLinked && (
                <span className="text-xs font-mono text-slate-400">
                  Chat ID: {chatId}
                </span>
              )}
            </div>
          </div>

          {isLinked && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Deseja desvincular sua conta do Telegram?')) {
                  unlinkTelegram();
                }
              }}
              className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
            >
              <Unlink className="w-3.5 h-3.5 mr-1" /> Desvincular
            </Button>
          )}
        </div>

        {/* Link Token Generation Section */}
        {!isLinked && (
          <div className="space-y-4 mb-6">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Sincronização em 1 Clique (Código de 6 Dígitos)
            </h4>

            {!token ? (
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-dashed border-slate-800 text-center space-y-3">
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Gere seu código de 6 dígitos para sincronizar sua conta do Telegram instantaneamente com o sistema.
                </p>
                <Button
                  variant="primary"
                  onClick={generateLinkToken}
                  isLoading={loading}
                >
                  <Sparkles className="w-4 h-4 mr-1.5" /> Gerar Código de 6 Dígitos
                </Button>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-xs text-slate-400">Seu código de sincronização:</span>
                  <div className="font-mono text-3xl font-bold tracking-widest text-emerald-400 select-all py-1">
                    {token}
                  </div>
                  <span className="text-[11px] text-slate-500 block">Válido por 15 minutos</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <a
                    href={telegramDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-medium text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Abrir no Telegram
                  </a>

                  <Button
                    variant="outline"
                    onClick={() => handleCopyCode(token)}
                    className="w-full text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Código Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar Código ({token})
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  💡 Basta clicar em <b>Abrir no Telegram</b> ou colar o código <b>{token}</b> diretamente na conversa do bot.
                </p>
              </div>
            )}
          </div>
        )}

        {/* AI, Voice & Features Guide */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            O que você pode fazer pelo Telegram
          </h4>

          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-850 flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                🎙️ Envie áudio: "Gastei 45 no almoço no débito"
              </span>
              <Badge variant="emerald">Whisper IA</Badge>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-850 flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                "Qual é meu teto de gastos e quanto gastei?"
              </span>
              <Badge variant="amber">Orçamento</Badge>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-850 flex items-center justify-between text-slate-300">
              <span>"Quanto gastei na fatura deste mês e do mês que vem?"</span>
              <Badge variant="indigo">Faturas</Badge>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-850 flex items-center justify-between text-slate-300">
              <span>"Quanto gastei hoje?"</span>
              <Badge variant="indigo">Extrato</Badge>
            </div>
          </div>
        </div>

        {/* Security Seal */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Serverless Zero-VPS & Idempotente</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </Card>
    </div>
  );
};
