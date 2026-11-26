'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BookOpen, Bot, CircleHelp, Minimize2, RotateCcw, Send, ShieldCheck, User, X } from 'lucide-react';
import { HelpAssistantReply, HelpAssistantMessage, useHelpAssistantChat } from '@/lib/hooks/use-help-assistant';

const suggestions = [
  'How do I create a recurring transaction?',
  'Where can I view my cash-flow forecast?',
  'How do budgets and categories work?',
];

interface DisplayMessage extends HelpAssistantMessage {
  reply?: HelpAssistantReply;
}

export function HelpAssistantWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const chat = useHelpAssistantChat();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, chat.isPending, isOpen]);

  if (process.env.NEXT_PUBLIC_HELP_ASSISTANT_ENABLED !== 'true') return null;

  const submit = async (event?: FormEvent, suggested?: string) => {
    event?.preventDefault();
    const message = (suggested ?? input).trim();
    if (message.length < 3 || chat.isPending) return;
    const history = messages.slice(-8).map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { role: 'user', content: message }]);
    setInput('');
    try {
      const reply = await chat.mutateAsync({ message, history });
      setMessages((current) => [...current, { role: 'assistant', content: reply.answer, reply }]);
    } catch (error) {
      setMessages((current) => [...current, {
        role: 'assistant',
        content: error instanceof Error ? error.message : 'I could not answer that. Please try again.',
      }]);
    }
  };

  const reset = () => { setMessages([]); chat.reset(); };

  return (
    <>
      {isOpen && (
        <section aria-label="TrellisFlow Help Assistant" className="fixed bottom-24 right-4 z-[80] flex h-[min(680px,calc(100dvh-8rem))] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-bg-secondary shadow-2xl sm:right-6">
          <header className="flex shrink-0 items-center justify-between border-b border-border-subtle px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary"><CircleHelp size={20} /></div>
              <div><h2 className="text-sm font-semibold text-fg-primary">TrellisFlow Help</h2><p className="text-xs text-fg-tertiary">Product guide and navigation assistant</p></div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={reset} disabled={!messages.length || chat.isPending} aria-label="New conversation" className="rounded-md p-2 text-fg-secondary hover:bg-bg-tertiary disabled:opacity-40"><RotateCcw size={16}/></button>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Minimize Help Assistant" className="rounded-md p-2 text-fg-secondary hover:bg-bg-tertiary"><Minimize2 size={16}/></button>
            </div>
          </header>
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {!messages.length ? (
              <div className="flex min-h-full flex-col justify-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary"><Bot size={23}/></div>
                <h3 className="text-base font-semibold text-fg-primary">How can I help you use TrellisFlow?</h3>
                <p className="mt-1 text-sm leading-5 text-fg-secondary">Ask about features, workflows or where to find something in the application.</p>
                <div className="mt-5 space-y-2">{suggestions.map((item) => <button key={item} type="button" onClick={() => void submit(undefined, item)} disabled={chat.isPending} className="w-full rounded-lg border border-border-subtle px-3 py-2.5 text-left text-sm text-fg-secondary hover:border-accent-primary/50 hover:bg-bg-tertiary disabled:opacity-50">{item}</button>)}</div>
                <Link href="/help" onClick={() => setIsOpen(false)} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent-primary hover:underline"><BookOpen size={15}/> Open Help Centre</Link>
              </div>
            ) : messages.map((message, index) => (
              <div key={index} className={`flex gap-2.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary"><Bot size={15}/></div>}
                <div className="max-w-[88%] space-y-2">
                  <div className={`whitespace-pre-wrap break-words rounded-xl px-3 py-2.5 text-sm leading-5 ${message.role === 'user' ? 'bg-accent-primary text-white' : 'border border-border-subtle bg-bg-primary text-fg-primary'}`}>{message.content}</div>
                  {message.reply?.navigation && (
                    <Link href={message.reply.navigation.route} onClick={() => setIsOpen(false)} className="block rounded-lg border border-accent-primary/30 bg-bg-primary p-3 text-sm hover:border-accent-primary">
                      <span className="font-semibold text-accent-primary">Go to {message.reply.navigation.label} →</span>
                      <span className="mt-1 block text-xs text-fg-tertiary">{message.reply.navigation.route}</span>
                    </Link>
                  )}
                  {message.reply?.sources.length ? (
                    <div className="rounded-lg border border-border-subtle bg-bg-primary p-2.5">
                      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-fg-tertiary"><BookOpen size={12}/> DOCUMENTATION SOURCES</p>
                      {message.reply.sources.map((source, sourceIndex) => <div key={sourceIndex} className="text-xs text-fg-secondary">{source.title}{source.section ? ` · ${source.section}` : ''}</div>)}
                    </div>
                  ) : null}
                </div>
                {message.role === 'user' && <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary text-fg-secondary"><User size={15}/></div>}
              </div>
            ))}
            {chat.isPending && <div className="flex items-center gap-2.5 text-sm text-fg-secondary"><Bot size={16}/> Searching TrellisFlow help…</div>}
          </div>
          <form onSubmit={(event) => void submit(event)} className="shrink-0 border-t border-border-subtle p-3">
            <div className="flex items-end gap-2">
              <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit(); } }} maxLength={1200} rows={2} placeholder="Ask about TrellisFlow…" aria-label="Message Help Assistant" className="max-h-28 min-h-11 flex-1 resize-y rounded-lg border border-border-subtle bg-bg-primary px-3 py-2.5 text-sm text-fg-primary outline-none placeholder:text-fg-tertiary focus:border-accent-primary"/>
              <button type="submit" disabled={input.trim().length < 3 || chat.isPending} aria-label="Send message" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-primary text-white hover:opacity-90 disabled:opacity-40"><Send size={17}/></button>
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-fg-tertiary"><ShieldCheck size={12}/> Answers grounded in TrellisFlow documentation</div>
          </form>
        </section>
      )}
      <button type="button" onClick={() => setIsOpen((value) => !value)} aria-label={isOpen ? 'Close Help Assistant' : 'Open Help Assistant'} aria-expanded={isOpen} className="fixed bottom-5 right-4 z-[80] flex h-14 items-center gap-2 rounded-full bg-accent-primary px-4 text-white shadow-xl transition-transform hover:scale-[1.03] sm:bottom-6 sm:right-6">
        {isOpen ? <X size={20}/> : <CircleHelp size={20}/>}<span className="text-sm font-semibold">Help</span>
      </button>
    </>
  );
}
