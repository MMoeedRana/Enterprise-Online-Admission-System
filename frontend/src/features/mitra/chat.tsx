'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  History,
  Loader2,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { Avatar } from '@/components/layout/user-menu';
import { useAuth } from '@/features/auth/auth-context';
import { useBrand } from '@/features/branding/brand-context';
import { del, errorMessage, get, post } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Markdown } from './markdown';
import { streamMessage } from './stream';
import {
  base,
  type AgentAction,
  type AgentStatus,
  type Conversation,
  type ConversationSummary,
  type Scope,
} from './types';

export function MitraAvatar({ className = 'size-9' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-violet-600 text-white shadow-[0_4px_12px_var(--ring)]',
        className,
      )}
    >
      <Sparkles className="size-[45%]" />
    </span>
  );
}

function ActionCard({ action, scope, onDone }: { action: AgentAction; scope: Scope; onDone: () => void }) {
  const decide = useMutation({
    mutationFn: (d: 'confirm' | 'cancel') => post<AgentAction>(`${base(scope)}/actions/${action._id}/${d}`),
    onSuccess: (a) => {
      if (a.status === 'DONE') toast.success('Done.');
      else if (a.status === 'FAILED') toast.error(a.result || 'The action failed.');
      onDone();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const tone = { PENDING: 'amber', DONE: 'green', CANCELLED: 'gray', FAILED: 'red' } as const;
  const label = { PENDING: 'Waiting for your confirmation', DONE: 'Done', CANCELLED: 'Cancelled', FAILED: 'Failed' };
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-line bg-card mt-2 rounded-2xl border p-4 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted text-[11.5px] font-semibold tracking-wide uppercase">Prepared action</p>
        <Badge tone={tone[action.status]}>{label[action.status]}</Badge>
      </div>
      <p className="text-ink mt-1.5 text-[14px]">{action.summary}</p>
      {action.status === 'PENDING' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            icon={<Check className="size-4" />}
            loading={decide.isPending && decide.variables === 'confirm'}
            onClick={() => decide.mutate('confirm')}
          >
            Confirm
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<X className="size-4" />}
            disabled={decide.isPending}
            onClick={() => decide.mutate('cancel')}
          >
            Cancel
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export function ChatPanel({ scope, compact = false }: { scope: Scope; compact?: boolean }) {
  const qc = useQueryClient();
  const brand = useBrand();
  const { user } = useAuth();
  const [desktopHistoryOpen, setDesktopHistoryOpen] = useState(true);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [conversationSearch, setConversationSearch] = useState('');
  const status = useQuery({
    queryKey: ['mitra', scope, 'status'],
    queryFn: () => get<AgentStatus>(`${base(scope)}/status`),
  });
  const list = useQuery({
    queryKey: ['mitra', scope, 'conversations'],
    queryFn: () => get<ConversationSummary[]>(`${base(scope)}/conversations`),
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const conv = useQuery({
    queryKey: ['mitra', scope, 'conversation', activeId],
    queryFn: () => get<Conversation>(`${base(scope)}/conversations/${activeId}`),
    enabled: Boolean(activeId),
  });
  const [text, setText] = useState('');
  const [live, setLive] = useState<{ question: string; steps: string[]; actions: AgentAction[] } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [conv.data, live]);

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['mitra', scope, 'conversation', activeId] }),
      qc.invalidateQueries({ queryKey: ['mitra', scope, 'conversations'] }),
      qc.invalidateQueries({ queryKey: ['mitra', scope, 'status'] }),
    ]);
  };

  const send = async (message: string) => {
    const q = message.trim();
    if (!q || live) return;
    setText('');
    let id = activeId;
    try {
      if (!id) {
        const c = await post<{ _id: string }>(`${base(scope)}/conversations`);
        id = c._id;
        setActiveId(id);
      }
    } catch (e) {
      toast.error(errorMessage(e));
      return;
    }
    setLive({ question: q, steps: [], actions: [] });
    await streamMessage(`${base(scope)}/conversations/${id}/messages`, q, (e) => {
      if (e.type === 'tool') setLive((l) => (l ? { ...l, steps: [...l.steps, e.label] } : l));
      if (e.type === 'action') setLive((l) => (l ? { ...l, actions: [...l.actions, e.action] } : l));
      if (e.type === 'error') toast.error(e.message);
    }).catch(() => toast.error('The connection was interrupted.'));
    await qc.invalidateQueries({ queryKey: ['mitra', scope, 'conversation', id] });
    await qc.invalidateQueries({ queryKey: ['mitra', scope, 'conversations'] });
    await qc.invalidateQueries({ queryKey: ['mitra', scope, 'status'] });
    setLive(null);
  };

  const remove = useMutation({
    mutationFn: (id: string) => del(`${base(scope)}/conversations/${id}`),
    onSuccess: async () => {
      setActiveId(null);
      await qc.invalidateQueries({ queryKey: ['mitra', scope, 'conversations'] });
    },
  });

  const s = status.data;
  const name = s?.agentName ?? brand.agentName;
  const messages = conv.data?.messages ?? [];
  const actions = conv.data?.actions ?? [];
  const empty = !activeId && !live;
  const filteredConversations = (list.data ?? []).filter((conversation) =>
    conversation.title.toLowerCase().includes(conversationSearch.trim().toLowerCase()),
  );

  return (
    <div
      className={cn(
        'relative grid min-h-0 gap-4',
        !compact && desktopHistoryOpen && 'lg:grid-cols-[260px_minmax(0,1fr)]',
        !compact && !desktopHistoryOpen && 'lg:grid-cols-[56px_minmax(0,1fr)]',
      )}
    >
      {!compact && (
        <aside
          className={cn(
            'border-line bg-card hidden min-h-0 flex-col rounded-[var(--radius-card)] border p-3 shadow-[var(--shadow-card)] lg:flex',
            'h-[calc(100dvh-190px)] min-h-0 lg:min-h-[620px]',
            desktopHistoryOpen ? 'items-stretch' : 'items-center',
          )}
        >
          {desktopHistoryOpen ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2 px-1">
                  <MitraAvatar className="size-8" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold">Conversation history</p>
                    <p className="text-muted truncate text-[11px]">ADMITRA · {name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Collapse conversation history"
                  onClick={() => setDesktopHistoryOpen(false)}
                  className="text-muted hover:text-ink hover:bg-card-soft shrink-0 rounded-lg p-2"
                >
                  <PanelLeftClose className="size-4" />
                </button>
              </div>
              <Button
                variant="soft"
                className="w-full"
                icon={<MessageSquarePlus className="size-4" />}
                onClick={() => setActiveId(null)}
              >
                New conversation
              </Button>
              <label className="relative mt-3 block">
                <span className="sr-only">Search conversations</span>
                <Search className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <input
                  value={conversationSearch}
                  onChange={(event) => setConversationSearch(event.target.value)}
                  placeholder="Search conversations..."
                  className="border-line bg-card-soft text-ink placeholder:text-muted focus:border-primary h-10 w-full rounded-xl border pr-3 pl-9 text-[13px] outline-none focus:ring-1 focus:ring-[var(--ring)]"
                />
              </label>
              <p className="text-muted mt-4 mb-2 px-1 text-[11px] font-semibold tracking-[0.12em] uppercase">Recent</p>
              <ul className="elegant-scrollbar -mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1 pb-2">
                {filteredConversations.map((c) => (
                  <li key={c._id} className="group flex items-center">
                    <button
                      onClick={() => setActiveId(c._id)}
                      className={cn(
                        'min-w-0 flex-1 truncate rounded-xl px-3 py-2.5 text-left text-[13px] transition',
                        activeId === c._id
                          ? 'bg-primary-soft text-primary font-semibold shadow-[0_4px_14px_var(--ring)]'
                          : 'text-body hover:bg-card-soft',
                      )}
                    >
                      {c.title}
                    </button>
                    <button
                      aria-label={`Delete ${c.title}`}
                      onClick={() => remove.mutate(c._id)}
                      className="text-muted hover:text-danger invisible rounded-lg p-2 group-hover:visible focus:visible"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
                {!filteredConversations.length && (
                  <li className="text-muted rounded-xl px-3 py-4 text-center text-[12.5px]">
                    {conversationSearch.trim() ? 'No matching conversations.' : 'No conversations yet.'}
                  </li>
                )}
              </ul>
            </>
          ) : (
            <>
              <button
                type="button"
                aria-label="Expand conversation history"
                title="Conversation history"
                onClick={() => setDesktopHistoryOpen(true)}
                className="hover:bg-card-soft text-muted hover:text-primary rounded-xl p-2.5"
              >
                <MitraAvatar className="size-8" />
              </button>
              <button
                type="button"
                aria-label="Expand conversation history"
                onClick={() => setDesktopHistoryOpen(true)}
                className="text-muted hover:text-primary hover:bg-primary-soft mt-2 rounded-xl p-2.5"
              >
                <PanelLeftOpen className="size-4" />
              </button>
              <button
                type="button"
                aria-label="New conversation"
                onClick={() => setActiveId(null)}
                className="text-muted hover:text-primary hover:bg-primary-soft mt-2 rounded-xl p-2.5"
              >
                <MessageSquarePlus className="size-4" />
              </button>
            </>
          )}
        </aside>
      )}

      <section
        className={cn(
          'border-line bg-card relative flex min-h-0 overflow-hidden flex-col rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]',
          compact
            ? 'h-full rounded-none border-0 shadow-none'
            : 'h-[calc(100dvh-96px)] min-h-0 lg:h-[calc(100dvh-190px)] lg:min-h-[620px]',
        )}
      >
        {mobileHistoryOpen && (
          <motion.div
            className="absolute inset-x-0 top-[61px] bottom-0 z-40 sm:top-[73px] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close conversation history"
              className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
              onClick={() => setMobileHistoryOpen(false)}
            />
            <motion.aside
              className="border-line bg-card absolute inset-y-0 left-0 flex w-[min(82vw,320px)] flex-col border-r p-4 shadow-2xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                  <MitraAvatar />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold">Conversation history</p>
                    <p className="text-muted truncate text-[11.5px]">ADMITRA · {name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close conversation history"
                  onClick={() => setMobileHistoryOpen(false)}
                  className="text-muted hover:text-ink hover:bg-card-soft shrink-0 rounded-xl p-2"
                >
                  <X className="size-5" />
                </button>
              </div>
              <Button
                variant="soft"
                className="w-full"
                icon={<MessageSquarePlus className="size-4" />}
                onClick={() => {
                  setActiveId(null);
                  setMobileHistoryOpen(false);
                }}
              >
                New conversation
              </Button>
              <label className="relative mt-3 block">
                <span className="sr-only">Search conversations</span>
                <Search className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <input
                  value={conversationSearch}
                  onChange={(event) => setConversationSearch(event.target.value)}
                  placeholder="Search conversations..."
                  className="border-line bg-card-soft text-ink placeholder:text-muted focus:border-primary h-10 w-full rounded-xl border pr-3 pl-9 text-[13px] outline-none focus:ring-1 focus:ring-[var(--ring)]"
                />
              </label>
              <p className="text-muted mt-4 mb-2 px-1 text-[11px] font-semibold tracking-[0.12em] uppercase">
                Recent
              </p>
              <ul className="elegant-scrollbar -mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1 pb-2">
                {filteredConversations.map((c) => (
                  <li key={c._id} className="group flex items-center">
                    <button
                      onClick={() => {
                        setActiveId(c._id);
                        setMobileHistoryOpen(false);
                      }}
                      className={cn(
                        'min-w-0 flex-1 truncate rounded-xl px-3 py-2.5 text-left text-[13px]',
                        activeId === c._id
                          ? 'bg-primary-soft text-primary font-semibold'
                          : 'text-body hover:bg-card-soft',
                      )}
                    >
                      {c.title}
                    </button>
                    <button
                      aria-label={`Delete ${c.title}`}
                      onClick={() => remove.mutate(c._id)}
                      className="text-muted hover:text-danger invisible rounded-lg p-2 group-hover:visible focus:visible"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
                {!list.data?.length && (
                  <li className="text-muted rounded-xl px-3 py-4 text-center text-[12.5px]">No conversations yet.</li>
                )}
              </ul>
            </motion.aside>
          </motion.div>
        )}
        <div className="border-line flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open conversation history"
              onClick={() => setMobileHistoryOpen(true)}
              className="border-line bg-card-soft text-muted hover:text-primary flex size-9 shrink-0 items-center justify-center rounded-xl border lg:hidden"
            >
              <History className="size-[17px]" />
            </button>
            <MitraAvatar />
            <div className="min-w-0">
              <p className="text-ink truncate text-[15px] font-bold">
                {conv.data?.title && activeId ? conv.data.title : `Ask ${name}`}
              </p>
              <p className="text-muted text-[12px]">
                {s ? `${s.usage.messages} of ${s.usage.limit} messages today` : 'Admission copilot'}
                {s?.provider && ` · ${s.provider}${s.model ? ` (${s.model})` : ''}`}
              </p>
            </div>
          </div>
          {(compact || activeId) && (
            <Button
              size="sm"
              variant="ghost"
              icon={<MessageSquarePlus className="size-4" />}
              onClick={() => setActiveId(null)}
            >
              New
            </Button>
          )}
        </div>

        <div
          className="elegant-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5 lg:px-7"
          aria-live="polite"
        >
          {s && !s.available && <Alert tone="info">{s.reason}</Alert>}
          {s && s.available && !s.configured && (
            <Alert tone="info">
              {scope === 'platform'
                ? `${name} is not connected to an AI provider yet. Add AI_API_KEY (and AI_PROVIDER, AI_MODEL) to the backend .env file and restart the API. Briefings and alerts already work.`
                : `${name} is not connected yet. Please ask ${brand.platformName} support.`}
            </Alert>
          )}
          {empty && (
            <div className="mx-auto max-w-3xl py-8 text-center lg:py-12">
              <MitraAvatar className="mx-auto size-14" />
              <h2 className="mt-5 text-[22px] font-bold sm:text-[24px]">
                Hello{user ? `, ${user.fullName.split(' ')[0]}` : ''}. I am {name}.
              </h2>
              <p className="text-muted mt-2 text-[15px] leading-6">
                {scope === 'platform'
                  ? 'Ask about institutions, fees, applications, payments, tickets or anything unusual on the platform.'
                  : 'Ask about your applications, payments, merit lists, seats and alerts. I can also prepare reminders for you to confirm.'}
              </p>
              <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
                {(s?.suggestions ?? []).map((q) => (
                  <button
                    key={q}
                    onClick={() => void send(q)}
                    disabled={!s?.available}
                    className="border-line bg-card-soft hover:border-primary/50 hover:bg-primary-soft text-body rounded-xl border px-3.5 py-3 text-[13px] transition disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeId &&
            messages.map((m) =>
              m.role === 'user' ? (
                <div key={m._id} className="flex justify-end gap-3">
                  <div className="bg-primary max-w-[78%] rounded-2xl rounded-tr-md px-4 py-3 text-[15px] leading-6 whitespace-pre-wrap text-white shadow-[0_8px_22px_var(--ring)] sm:max-w-[72%]">
                    {m.content}
                  </div>
                  {user && (
                    <Avatar name={user.fullName} src={user.avatarUrl} className="hidden size-8 text-[11px] sm:flex" />
                  )}
                </div>
              ) : (
                <div key={m._id} className="flex gap-3">
                  <MitraAvatar className="size-8" />
                  <div className="max-w-[90%] min-w-0 flex-1">
                    {m.content && (
                      <div
                        className={cn(
                          'text-ink rounded-2xl rounded-tl-md px-4 py-3 text-[15px] leading-6 shadow-[0_4px_16px_rgba(15,23,42,0.06)]',
                          m.actionId ? 'bg-card-soft text-[13px]' : 'bg-card-soft',
                        )}
                      >
                        <Markdown text={m.content} />
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
          {activeId &&
            actions
              .filter((a) => a.status === 'PENDING')
              .map((a) => (
                <div key={a._id} className="pl-11">
                  <ActionCard action={a} scope={scope} onDone={() => void refresh()} />
                </div>
              ))}

          <AnimatePresence>
            {live && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {!messages.some((m) => m.content === live.question) && (
                  <div className="flex justify-end">
                    <div className="bg-primary max-w-[78%] rounded-2xl rounded-tr-md px-4 py-3 text-[15px] leading-6 whitespace-pre-wrap text-white shadow-[0_8px_22px_var(--ring)]">
                      {live.question}
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <MitraAvatar className="size-8" />
                  <div className="bg-card-soft text-body rounded-2xl rounded-tl-md px-4 py-3 text-[14px] leading-6">
                    {live.steps.length ? (
                      <ul className="space-y-1">
                        {live.steps.map((st, k) => (
                          <li key={k} className="flex items-center gap-2">
                            {k === live.steps.length - 1 ? (
                              <Loader2 className="text-primary size-3.5 animate-spin" />
                            ) : (
                              <Check className="size-3.5 text-green-700 dark:text-green-400" />
                            )}
                            {st}…
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Loader2 className="text-primary size-3.5 animate-spin" /> Thinking…
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={endRef} />
        </div>

        <form
          className="border-line flex items-end gap-2 border-t p-3 sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send(text);
          }}
        >
          <label htmlFor={`mitra-input-${scope}${compact ? '-c' : ''}`} className="sr-only">
            Message to {name}
          </label>
          <textarea
            id={`mitra-input-${scope}${compact ? '-c' : ''}`}
            value={text}
            rows={1}
            maxLength={2000}
            disabled={!s?.available}
            placeholder={`Ask ${name} anything about ${scope === 'platform' ? 'the platform' : 'your admissions'}…`}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
            className="elegant-scrollbar border-line bg-card text-ink placeholder:text-muted focus:border-primary max-h-40 min-h-12 flex-1 resize-none rounded-2xl border px-4 py-3 text-[15px] leading-6 outline-none focus:ring-1 focus:ring-[var(--ring)]"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send"
            disabled={!text.trim() || Boolean(live) || !s?.available}
            loading={Boolean(live)}
          >
            <Send className="size-4" />
          </Button>
        </form>
      </section>
    </div>
  );
}
