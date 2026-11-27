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
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { useMoneyCopilotChat, MoneyCopilotMessage, useMoneyCopilotActionPreview, useConfirmMoneyCopilotAction, MoneyCopilotActionPreview } from '@/lib/hooks/use-money-copilot';
import { useAccounts } from '@/lib/hooks/use-accounts';
import { useCategories } from '@/lib/hooks/use-categories';

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
  const accountsQuery = useAccounts();
  const categoriesQuery = useCategories();
  const previewMutation = useMoneyCopilotActionPreview();
  const confirmMutation = useConfirmMoneyCopilotAction();
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionType, setActionType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [actionAmount, setActionAmount] = useState('');
  const [actionAccountId, setActionAccountId] = useState('');
  const [actionCategoryId, setActionCategoryId] = useState('');
  const [actionDate, setActionDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10));
  const [actionDescription, setActionDescription] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [actionPreview, setActionPreview] = useState<MoneyCopilotActionPreview | null>(null);
  const [actionMessage, setActionMessage] = useState('');

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

      <section className="rounded-xl border border-border-subtle bg-bg-secondary p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-fg-primary">Confirmed transaction actions</h2>
            <p className="mt-1 text-xs text-fg-secondary">Prepare an income or expense, review every detail, then confirm it explicitly.</p>
          </div>
          <button type="button" onClick={() => { setShowActionForm((value) => !value); setActionPreview(null); setActionMessage(''); }} className="flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-sm text-fg-primary hover:bg-bg-tertiary">
            <Plus size={15} /> {showActionForm ? 'Close' : 'Prepare transaction'}
          </button>
        </div>
        {showActionForm && !actionPreview && (
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={async (event) => {
            event.preventDefault();
            setActionMessage('');
            try {
              const preview = await previewMutation.mutateAsync({
                type: actionType, amount: Number(actionAmount), accountId: actionAccountId,
                ...(actionCategoryId ? { categoryId: actionCategoryId } : {}),
                date: actionDate, description: actionDescription.trim(),
                ...(actionNotes.trim() ? { notes: actionNotes.trim() } : {}),
              });
              setActionPreview(preview);
            } catch (error) {
              setActionMessage(error instanceof Error ? error.message : 'Could not prepare this transaction.');
            }
          }}>
            <label className="space-y-1 text-xs text-fg-secondary">Type
              <select value={actionType} onChange={(event) => { setActionType(event.target.value as 'INCOME' | 'EXPENSE'); setActionCategoryId(''); }} className="w-full rounded-lg border border-border-subtle bg-bg-primary p-2.5 text-sm text-fg-primary">
                <option value="EXPENSE">Expense</option><option value="INCOME">Income</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-fg-secondary">Amount
              <input required type="number" min="0.01" step="0.0001" value={actionAmount} onChange={(event) => setActionAmount(event.target.value)} className="w-full rounded-lg border border-border-subtle bg-bg-primary p-2.5 text-sm text-fg-primary" />
            </label>
            <label className="space-y-1 text-xs text-fg-secondary">Account
              <select required value={actionAccountId} onChange={(event) => setActionAccountId(event.target.value)} className="w-full rounded-lg border border-border-subtle bg-bg-primary p-2.5 text-sm text-fg-primary">
                <option value="">Select account</option>
                {(accountsQuery.data ?? []).map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs text-fg-secondary">Category
              <select value={actionCategoryId} onChange={(event) => setActionCategoryId(event.target.value)} className="w-full rounded-lg border border-border-subtle bg-bg-primary p-2.5 text-sm text-fg-primary">
                <option value="">Uncategorized</option>
                {(categoriesQuery.data ?? []).filter((category) => category.type === actionType).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs text-fg-secondary">Date
              <input required type="date" value={actionDate} onChange={(event) => setActionDate(event.target.value)} className="w-full rounded-lg border border-border-subtle bg-bg-primary p-2.5 text-sm text-fg-primary" />
            </label>
            <label className="space-y-1 text-xs text-fg-secondary">Description
              <input required maxLength={200} value={actionDescription} onChange={(event) => setActionDescription(event.target.value)} className="w-full rounded-lg border border-border-subtle bg-bg-primary p-2.5 text-sm text-fg-primary" />
            </label>
            <label className="space-y-1 text-xs text-fg-secondary sm:col-span-2">Notes (optional)
              <input maxLength={1000} value={actionNotes} onChange={(event) => setActionNotes(event.target.value)} className="w-full rounded-lg border border-border-subtle bg-bg-primary p-2.5 text-sm text-fg-primary" />
            </label>
            {actionMessage && <p role="alert" className="text-sm text-red-500 sm:col-span-2">{actionMessage}</p>}
            <button type="submit" disabled={previewMutation.isPending || !actionAccountId || !actionAmount || !actionDescription.trim()} className="rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 sm:col-span-2">
              {previewMutation.isPending ? 'Preparing preview…' : 'Review transaction'}
            </button>
          </form>
        )}
        {actionPreview && (
          <div className="mt-4 rounded-lg border border-border-subtle bg-bg-primary p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg-primary"><CheckCircle2 size={16} /> Review before confirming</div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-fg-tertiary">Type</dt><dd className="font-medium text-fg-primary">{actionPreview.preview.type}</dd></div>
              <div><dt className="text-xs text-fg-tertiary">Amount</dt><dd className="font-medium text-fg-primary">{actionPreview.preview.currency} {actionPreview.preview.amount.toLocaleString()}</dd></div>
              <div><dt className="text-xs text-fg-tertiary">Account</dt><dd className="font-medium text-fg-primary">{actionPreview.preview.account}</dd></div>
              <div><dt className="text-xs text-fg-tertiary">Category</dt><dd className="font-medium text-fg-primary">{actionPreview.preview.category ?? 'Uncategorized'}</dd></div>
              <div><dt className="text-xs text-fg-tertiary">Date</dt><dd className="font-medium text-fg-primary">{actionPreview.preview.date}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-fg-tertiary">Description</dt><dd className="font-medium text-fg-primary">{actionPreview.preview.description}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-fg-tertiary">Preview expires {new Date(actionPreview.expiresAt).toLocaleTimeString()}. Confirmation creates the transaction and updates the account balance.</p>
            {actionMessage && <p role="alert" className="mt-2 text-sm text-red-500">{actionMessage}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={confirmMutation.isPending} onClick={async () => {
                setActionMessage('');
                try {
                  await confirmMutation.mutateAsync(actionPreview.actionId);
                  setActionMessage('Transaction confirmed and recorded.');
                  setActionPreview(null);
                  setActionAmount('');
                  setActionDescription('');
                  setActionNotes('');
                  setShowActionForm(false);
                } catch (error) {
                  setActionMessage(error instanceof Error ? error.message : 'Confirmation failed. Review your transactions before retrying.');
                }
              }} className="rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                {confirmMutation.isPending ? 'Confirming…' : 'Confirm transaction'}
              </button>
              <button type="button" disabled={confirmMutation.isPending} onClick={() => setActionPreview(null)} className="rounded-lg border border-border-subtle px-4 py-2.5 text-sm text-fg-secondary">Cancel preview</button>
            </div>
          </div>
        )}
        {actionMessage && !actionPreview && <p role="status" className="mt-3 text-sm text-green-600">{actionMessage}</p>}
      </section>

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
            <ShieldCheck size={13} /> Chat answers are read-only. Any transaction requires a separate review and explicit confirmation.
          </div>
        </form>
      </section>
    </div>
  );
}
