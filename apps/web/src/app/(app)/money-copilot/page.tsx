'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, ShieldCheck, User, RotateCcw } from 'lucide-react';
import { useMoneyCopilotChat, MoneyCopilotMessage } from '@/lib/hooks/use-money-copilot';

const suggestions = [
  'Summarize my financial position',
  'Where did most of my money go this month?',
  'How are my investments performing?',
  'Give me an overview of my businesses',
];

export default function MoneyCopilotPage() {
  const [messages, setMessages] = useState<MoneyCopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const chat = useMoneyCopilotChat();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, chat.isPending]);

  const submit = async (event?: FormEvent, suggested?: string) => {
    event?.preventDefault();
    const message = (suggested ?? input).trim();
    if (!message || chat.isPending) return;
    const history = messages.slice(-8);
    setMessages((current) => [...current, { role: 'user', content: message }]);
    setInput('');
    try {
      const result = await chat.mutateAsync({ message, history });
      setMessages((current) => [...current, { role: 'assistant', content: result.answer }]);
    } catch (error) {
      setMessages((current) => [...current, {
        role: 'assistant',
        content: error instanceof Error ? error.message : 'I could not answer that. Please try again.',
      }]);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-10rem)] max-w-5xl flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
              <Sparkles size={19} />
            </div>
            <h1 className="text-2xl font-semibold text-fg-primary">Money Copilot</h1>
          </div>
          <p className="text-sm text-fg-secondary">Ask questions about your money, investments, and businesses.</p>
        </div>
        <button
          type="button"
          onClick={() => { setMessages([]); chat.reset(); }}
          disabled={messages.length === 0 || chat.isPending}
          className="flex items-center gap-2 rounded-md border border-border-subtle px-3 py-2 text-sm text-fg-secondary hover:bg-bg-tertiary disabled:opacity-40"
        >
          <RotateCcw size={15} /> New conversation
        </button>
      </header>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-secondary">
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
          {messages.length === 0 ? (
            <div className="mx-auto flex max-w-xl flex-col items-center py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary">
                <Bot size={28} />
              </div>
              <h2 className="text-lg font-semibold text-fg-primary">Your finances, explained</h2>
              <p className="mt-2 text-sm leading-6 text-fg-secondary">
                Ask a question in plain language. I use your TrellisFlow records to explain the numbers and highlight useful context.
              </p>
              <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void submit(undefined, suggestion)}
                    disabled={chat.isPending}
                    className="rounded-lg border border-border-subtle p-3 text-left text-sm text-fg-secondary transition-colors hover:border-accent-primary/50 hover:bg-bg-tertiary disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : messages.map((message, index) => (
            <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
                  <Bot size={17} />
                </div>
              )}
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-accent-primary text-white' : 'border border-border-subtle bg-bg-primary text-fg-primary'}`}>
                {message.content}
              </div>
              {message.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary text-fg-secondary">
                  <User size={17} />
                </div>
              )}
            </div>
          ))}
          {chat.isPending && (
            <div className="flex items-center gap-3 text-sm text-fg-secondary">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary"><Bot size={17} /></div>
              Reviewing your financial records…
            </div>
          )}
        </div>

        <form onSubmit={(event) => void submit(event)} className="border-t border-border-subtle p-3 md:p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
              maxLength={2000}
              rows={2}
              placeholder="Ask about your finances…"
              className="max-h-32 min-h-12 flex-1 resize-y rounded-lg border border-border-subtle bg-bg-primary px-3 py-3 text-sm text-fg-primary outline-none placeholder:text-fg-tertiary focus:border-accent-primary"
            />
            <button
              type="submit"
              disabled={!input.trim() || chat.isPending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-primary text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-label="Send message"
            >
              <Send size={17} />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-fg-tertiary">
            <ShieldCheck size={13} /> Read-only assistance. Review important financial decisions independently.
          </div>
        </form>
      </section>
    </div>
  );
}
