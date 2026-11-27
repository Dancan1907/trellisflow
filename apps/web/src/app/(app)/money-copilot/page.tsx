'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  Bot,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Send,
  ShieldCheck,
  User,
  Wallet,
  RotateCcw,
} from 'lucide-react';
import { useMoneyCopilotChat, MoneyCopilotMessage } from '@/lib/hooks/use-money-copilot';

const suggestionGroups = [
  {
    title: 'Everyday financial assistance',
    description: 'Understand your spending, budgets, transactions and overall financial position.',
    icon: Wallet,
    suggestions: [
      'Summarize my financial position',
      'Where did most of my money go this month?',
    ],
  },
  {
    title: 'Advanced financial intelligence',
    description: 'Explore investment performance, business profitability and cash runway.',
    icon: ChartNoAxesCombined,
    suggestions: [
      'How are my investments performing?',
      'How diversified is my investment portfolio?',
      'Show my overall net worth without double-counting assets',
      'Give me an overview of my businesses',
      'How profitable is my business and what is its cash runway?',
      'What if I reduce my spending by 10%?',
      'What if my business revenue increases by 10%?',
      'What if my portfolio drops by 10%?'
    ],
  },
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
              <ChartNoAxesCombined size={19} />
            </div>
            <h1 className="text-2xl font-semibold text-fg-primary">Money Copilot</h1>
          </div>
          <p className="max-w-2xl text-sm text-fg-secondary">
            One assistant for everyday money management and deeper investment and business insights.
          </p>
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
            <div className="mx-auto flex max-w-2xl flex-col items-center py-8 text-center sm:py-10">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary">
                <Bot size={28} />
              </div>
              <h2 className="text-lg font-semibold text-fg-primary">Your finances, explained. Your decisions, informed.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-fg-secondary">
                Ask in plain language. Money Copilot can help with everyday finances and dig deeper into your investments and businesses using your TrellisFlow records.
              </p>

              <div className="mt-7 grid w-full gap-4 text-left sm:grid-cols-2">
                {suggestionGroups.map((group) => {
                  const GroupIcon = group.icon;
                  return (
                    <div key={group.title} className="rounded-xl border border-border-subtle bg-bg-primary p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
                          <GroupIcon size={18} />
                        </div>
                        <h3 className="text-sm font-semibold text-fg-primary">{group.title}</h3>
                      </div>
                      <p className="mb-3 text-xs leading-5 text-fg-secondary">{group.description}</p>
                      <div className="space-y-2">
                        {group.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => void submit(undefined, suggestion)}
                            disabled={chat.isPending}
                            className="w-full rounded-lg border border-border-subtle p-2.5 text-left text-sm text-fg-secondary transition-colors hover:border-accent-primary/50 hover:bg-bg-tertiary disabled:opacity-50"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-fg-tertiary">
                <BriefcaseBusiness size={14} />
                <span>Ask about personal finances, investments or your businesses in this same conversation.</span>
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
              placeholder="Ask about spending, investments or business performance…"
              aria-label="Ask Money Copilot a question"
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
