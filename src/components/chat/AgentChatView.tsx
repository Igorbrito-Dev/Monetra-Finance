import React, { useEffect, useRef, useState } from 'react';
import { Send, RotateCcw, Bot, Mic } from 'lucide-react';
import { useAgentChat } from '../../hooks/useAgentChat';
import { Button } from '../ui/Button';

/**
 * Converte o texto do agente em HTML seguro: tudo é escapado e apenas <b>, <i> e <code>
 * (sem atributos) são reabilitados.
 */
function renderAgentHtml(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .replace(/&lt;(\/?)(b|i|code)&gt;/g, '<$1$2>')
    .replace(/\n/g, '<br />');
}

export const AgentChatView: React.FC = () => {
  const { messages, loading, sending, error, sendMessage, resetConversation } = useAgentChat();
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);

  const speechCtor =
    typeof window !== 'undefined'
      ? ((window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition)
      : undefined;

  const handleVoice = () => {
    const Ctor = speechCtor as
      | (new () => {
          lang: string;
          interimResults: boolean;
          onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
          onend: () => void;
          onerror: () => void;
          start: () => void;
        })
      | undefined;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.start();
  };
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft;
    if (!text.trim() || sending) return;
    setDraft('');
    await sendMessage(text);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-11rem)] md:h-[calc(100vh-10rem)] animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Assistente</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Registre gastos e consulte suas finanças conversando — mesma memória do Telegram.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetConversation} disabled={sending} className="text-xs">
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nova conversa</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white border border-slate-100 rounded-3xl p-4 space-y-3 shadow-xs">
        {loading ? (
          <p className="text-xs text-slate-400 text-center py-8">Carregando conversa...</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              {m.role === 'user' ? (
                <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-br-md bg-emerald-600 text-white text-sm whitespace-pre-wrap break-words">
                  {m.content}
                </div>
              ) : (
                <div
                  className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-slate-100 text-slate-800 text-sm break-words [&_code]:font-mono [&_code]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: renderAgentHtml(m.content) }}
                />
              )}
            </div>
          ))
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mr-2">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-slate-100 text-slate-500 text-sm animate-pulse">
              Pensando...
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
        <textarea
          rows={1}
          value={draft}
          maxLength={1000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Ex: comprei 2 carregadores em 5x de 40 no cartão"
          className="flex-1 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 resize-none"
        />
        {Boolean(speechCtor) && (
          <button
            type="button"
            onClick={handleVoice}
            className={`h-[42px] w-[42px] flex items-center justify-center rounded-2xl border flex-shrink-0 cursor-pointer ${
              listening
                ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                : 'bg-white border-slate-200 text-slate-600 hover:text-emerald-700'
            }`}
            title="Falar a mensagem"
            aria-label="Falar a mensagem"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
        <Button type="submit" variant="primary" disabled={!draft.trim() || sending} className="h-[42px] px-4">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};
