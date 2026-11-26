'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Bot,
  MessageCircle,
  Minimize2,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useMoneyCopilotChat, MoneyCopilotMessage } from '@/lib/hooks/use-money-copilot';

const suggestions = [
  'Summarize my financial position',
  'Where did most of my money go this month?',
  'How are my investments performing?',
];

export function MoneyCopilotWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MoneyCopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const chat = useMoneyCopilotChat();

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, chat.isPending, isOpen]);

  // The full-page Copilot already provides a dedicated chat interface.
  // Keep the global launcher on every other authenticated application page.
  if (
    process.env.NEXT_PUBLIC_MONEY_COPILOT_ENABLED !== 'true' ||
    pathname.startsWith('/money-copilot')
  ) {
    return null;
  }

  const submit = async (event?: FormEvent, suggested?: string) => {
    event?.preventDefault();
    const message = (suggested ?? input).trim();
    if (!message || chat.isPending) return;

    const history = messages.slice(-8);
    setMessages((current) => [...current, { role: 'user', content: message }]);
    setInput('');

    try {
      const result = await chat.mutateAsync({ message, history });
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: result.answer },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            error instanceof Error
              ? error.message
              : 'I could not answer that. Please try again.',
        },
      ]);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    chat.reset();
  };

  return (
    <>
      {isOpen && (
        <section
          aria-label="Money Copilot chat"
          className="fixed bottom-24 right-4 z-[70] flex h-[min(640px,calc(100dvh-8rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-bg-secondary shadow-2xl sm:right-6"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-border-subtle px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                <Sparkles size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-fg-primary">Money Copilot</h2>
                <p className="text-xs text-fg-tertiary">Your read-only financial assistant</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={startNewConversation}
                disabled={messages.length === 0 || chat.isPending}
                aria-label="Start a new conversation"
                title="New conversation"
                className="rounded-md p-2 text-fg-secondary transition-colors hover:bg-bg-tertiary disabled:opacity-40"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Minimize Money Copilot"
                title="Minimize"
                className="rounded-md p-2 text-fg-secondary transition-colors hover:bg-bg-tertiary"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex min-h-full flex-col justify-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                  <Bot size={23} />
                </div>
                <h3 className="text-base font-semibold text-fg-primary">
                  How can I help with your money?
                </h3>
                <p className="mt-1 text-sm leading-5 text-fg-secondary">
                  Ask in plain language. I use your TrellisFlow records to explain your finances.
                </p>
                <div className="mt-5 space-y-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void submit(undefined, suggestion)}
                      disabled={chat.isPending}
                      className="w-full rounded-lg border border-border-subtle px-3 py-2.5 text-left text-sm text-fg-secondary transition-colors hover:border-accent-primary/50 hover:bg-bg-tertiary disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-2.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
                      <Bot size={15} />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap break-words rounded-xl px-3 py-2.5 text-sm leading-5 ${
                      message.role === 'user'
                        ? 'bg-accent-primary text-white'
                        : 'border border-border-subtle bg-bg-primary text-fg-primary'
                    }`}
                  >
                    {message.content}
                  </div>
                  {message.role === 'user' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary text-fg-secondary">
                      <User size={15} />
                    </div>
                  )}
                </div>
              ))
            )}
            {chat.isPending && (
              <div className="flex items-center gap-2.5 text-sm text-fg-secondary">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
                  <Bot size={15} />
                </div>
                Reviewing your financial records…
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => void submit(event)}
            className="shrink-0 border-t border-border-subtle p-3"
          >
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
                aria-label="Message Money Copilot"
                className="max-h-28 min-h-11 flex-1 resize-y rounded-lg border border-border-subtle bg-bg-primary px-3 py-2.5 text-sm text-fg-primary outline-none placeholder:text-fg-tertiary focus:border-accent-primary"
              />
              <button
                type="submit"
                disabled={!input.trim() || chat.isPending}
                aria-label="Send message"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-primary text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Send size={17} />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-fg-tertiary">
              <ShieldCheck size={12} />
              Read-only assistance
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Close Money Copilot' : 'Open Money Copilot'}
        aria-expanded={isOpen}
        className="fixed bottom-5 right-4 z-[70] flex h-14 items-center gap-2 rounded-full bg-accent-primary px-4 text-white shadow-xl transition-transform hover:scale-[1.03] sm:bottom-6 sm:right-6"
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
        <span className="text-sm font-semibold">Money Copilot</span>
      </button>
    </>
  );
}
