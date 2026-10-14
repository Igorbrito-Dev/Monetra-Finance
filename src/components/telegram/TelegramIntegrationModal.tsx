import React, { useState } from 'react';
import { useTelegramIntegration } from '../../hooks/useTelegramIntegration';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg p-5 sm:p-6 bg-white border border-slate-100 rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto text-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 text-slate-400 hover:text-slate-700 p-1 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Bot className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              Bot do Telegram com IA & Voz
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Lance gastos por texto ou áudio (Whisper), consulte limites e faturas em tempo real.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        {/* Status Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between mb-5">
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Status da Conexão</span>
            <div className="flex items-center gap-2">
              <Badge variant={isLinked ? 'emerald' : 'amber'}>
                {isLinked ? 'Conectado ao Telegram' : 'Não Vinculado'}
              </Badge>
              {isLinked && (
                <span className="text-xs font-mono text-slate-500 font-semibold">
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
              className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
            >
              <Unlink className="w-3.5 h-3.5 mr-1" /> Desvincular
            </Button>
          )}
        </div>

        {/* Link Token Generation Section */}
        {!isLinked && (
          <div className="space-y-4 mb-5">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Sincronização em 1 Clique (Código de 6 Dígitos)
            </h4>

            {!token ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-3">
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Gere seu código de 6 dígitos para sincronizar sua conta do Telegram instantaneamente com o sistema.
                </p>
                <Button
                  variant="primary"
                  onClick={generateLinkToken}
                  isLoading={loading}
                  className="text-xs font-bold"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" /> Gerar Código de 6 Dígitos
                </Button>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-xs text-slate-500">Seu código de sincronização:</span>
                  <div className="font-mono text-3xl font-extrabold tracking-widest text-emerald-700 select-all py-1">
                    {token}
                  </div>
                  <span className="text-[11px] text-slate-400 block font-medium">Válido por 15 minutos</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <a
                    href={telegramDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Abrir no Telegram
                  </a>

                  <Button
                    variant="outline"
                    onClick={() => handleCopyCode(token)}
                    className="w-full text-xs font-semibold bg-white"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar Código
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                  💡 Basta clicar em <b>Abrir no Telegram</b> ou enviar o código <b>{token}</b> diretamente na conversa do bot.
                </p>
              </div>
            )}
          </div>
        )}

        {/* AI, Voice & Features Guide */}
        <div className="space-y-2.5 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            O que você pode fazer pelo Telegram
          </h4>

          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-slate-700">
              <span className="flex items-center gap-2">
                <Mic className="w-3.5 h-3.5 text-emerald-600" />
                <span>🎙️ Envie áudio: "Gastei 45 no almoço no débito"</span>
              </span>
              <Badge variant="emerald">Whisper IA</Badge>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-slate-700">
              <span className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-amber-600" />
                <span>"Qual é meu teto de gastos e quanto gastei?"</span>
              </span>
              <Badge variant="amber">Orçamento</Badge>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-slate-700">
              <span>"Quanto gastei na fatura deste mês e do mês que vem?"</span>
              <Badge variant="indigo">Faturas</Badge>
            </div>
          </div>
        </div>

        {/* Security Seal */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Serverless Zero-VPS & Idempotente</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};
