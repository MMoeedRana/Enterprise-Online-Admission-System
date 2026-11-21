'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Eye, Landmark, Lock, Send, Smartphone, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { FullPageLoader } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/features/auth/auth-context';
import { api, errorMessage, fieldErrors, get } from '@/lib/api';
import { openFile } from '@/lib/files';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  FEATURE_KEYS,
  methodLabel,
  requestTone,
  useFeatureLabels,
  type FeatureKey,
  type PaymentAccounts,
  type PaymentMethod,
  type PaymentRequest,
  type SubscriptionPayment,
} from './shared';

interface Billing {
  plan: { _id: string; name: string; priceMonthly: number; features: Record<FeatureKey, boolean> };
  subscription: {
    state: 'ACTIVE' | 'GRACE' | 'READ_ONLY' | 'TRIAL_ENDED' | 'NONE';
    isTrial: boolean;
    startsAt: string | null;
    endsAt: string | null;
    trialFeatures: Record<FeatureKey, boolean> | null;
  };
  accounts: PaymentAccounts;
  requests: PaymentRequest[];
  payments: SubscriptionPayment[];
}

function CopyValue({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="min-w-0">
        <span className="text-muted block text-[11.5px] font-semibold tracking-wide uppercase">{label}</span>
        <span className="text-ink block truncate font-mono text-[14px]">{value}</span>
      </span>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
          } catch {}
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }}
        className="text-muted hover:text-primary hover:bg-primary-soft cursor-pointer rounded-lg p-2 transition"
      >
        {done ? <Check className="size-4 text-green-700 dark:text-green-400" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}

function daysLeft(endsAt: string | null) {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 864e5));
}

export function InstitutionBilling() {
  const qc = useQueryClient();
  const { reloadMe } = useAuth();
  const labels = useFeatureLabels();
  const q = useQuery({ queryKey: ['inst', 'billing'], queryFn: () => get<Billing>('/billing') });
  const [form, setForm] = useState({
    months: 1,
    method: 'BANK_TRANSFER' as PaymentMethod,
    reference: '',
    amount: '',
    paidOn: new Date().toISOString().slice(0, 10),
    note: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const send = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('months', String(form.months));
      fd.append('method', form.method);
      fd.append('reference', form.reference);
      fd.append('amount', form.amount || String((q.data?.plan.priceMonthly ?? 0) * form.months));
      fd.append('paidOn', form.paidOn);
      fd.append('note', form.note);
      if (file) fd.append('file', file);
      return api.post('/billing/requests', fd);
    },
    onSuccess: async () => {
      toast.success('Payment proof sent. You will be notified when it is verified.');
      setErrors({});
      setFile(null);
      setFileKey((k) => k + 1);
      setForm((f) => ({ ...f, reference: '', amount: '', note: '' }));
      await qc.invalidateQueries({ queryKey: ['inst', 'billing'] });
      await reloadMe?.();
    },
    onError: (e) => {
      setErrors(fieldErrors(e));
      toast.error(errorMessage(e));
    },
  });

  if (!q.data) return <FullPageLoader />;
  const b = q.data;
  const s = b.subscription;
  const left = daysLeft(s.endsAt);
  const expected = b.plan.priceMonthly * form.months;
  const a = b.accounts;
  const hasAccounts = Boolean(a.bank.accountNumber || a.bank.iban || a.jazzcash.number || a.easypaisa.number);
  const pending = b.requests.find((r) => r.status === 'PENDING');

  const requestColumns: Column<PaymentRequest>[] = [
    { key: 'date', header: 'Sent', primary: true, cell: (r) => <b className="text-ink">{formatDate(r.createdAt)}</b> },
    { key: 'amount', header: 'Amount', cell: (r) => `${formatMoney(r.amount)} · ${r.months} mo` },
    { key: 'method', header: 'Method', cell: (r) => methodLabel(r.method) },
    {
      key: 'ref',
      header: 'Reference',
      hideOnMobile: true,
      cell: (r) => <span className="font-mono text-[12px]">{r.reference}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <span>
          <Badge tone={requestTone[r.status]}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</Badge>
          {r.reason && <span className="text-muted mt-1 block max-w-[240px] text-[12px]">{r.reason}</span>}
        </span>
      ),
    },
    {
      key: 'proof',
      header: '',
      cell: (r) => (
        <Button
          size="sm"
          variant="secondary"
          icon={<Eye className="size-4" />}
          onClick={() => void openFile(`/billing/requests/${r._id}/proof`)}
        >
          Proof
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Billing" />
      {s.state === 'TRIAL_ENDED' && (
        <Alert tone="error" title="Your trial has ended" className="mb-6">
          The workspace is locked until the subscription is paid. Send the payment proof below; access opens again as
          soon as the payment is verified. No data has been deleted.
        </Alert>
      )}
      {s.state === 'READ_ONLY' && (
        <Alert tone="error" title="The subscription has expired" className="mb-6">
          The workspace is read-only until the subscription is renewed.
        </Alert>
      )}
      {pending && (
        <Alert tone="info" title="Payment waiting for verification" className="mb-6">
          {formatMoney(pending.amount)} sent on {formatDate(pending.createdAt)} (reference {pending.reference}) is being
          checked by the platform team.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Your plan" subtitle={`${formatMoney(b.plan.priceMonthly)} per month`} />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-ink text-[20px] font-bold">{b.plan.name}</span>
              {s.isTrial && <Badge tone="purple">Trial</Badge>}
              {s.state === 'ACTIVE' && !s.isTrial && <Badge tone="green">Active</Badge>}
              {s.state === 'GRACE' && <Badge tone="amber">Grace period</Badge>}
              {(s.state === 'READ_ONLY' || s.state === 'TRIAL_ENDED') && <Badge tone="red">Locked</Badge>}
            </div>
            {s.endsAt && (
              <div className="bg-card-soft rounded-xl p-4">
                <p className="text-muted text-[12px] font-semibold tracking-wide uppercase">
                  {s.isTrial ? 'Trial ends' : 'Paid until'}
                </p>
                <p className="text-ink mt-1 text-[16px] font-bold">{formatDateTime(s.endsAt)}</p>
                {s.state === 'ACTIVE' && (
                  <p
                    className={cn('mt-1 text-[13px]', left <= 3 ? 'text-amber-700 dark:text-amber-400' : 'text-muted')}
                  >
                    {left} day{left === 1 ? '' : 's'} left
                  </p>
                )}
              </div>
            )}
            <div>
              <p className="text-ink mb-2 text-[13px] font-semibold">
                {s.isTrial ? 'Included in the trial' : 'Included in your plan'}
              </p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2 text-[13px]">
                  <Check className="size-4 text-green-700 dark:text-green-400" /> Core admission features
                </li>
                {FEATURE_KEYS.map((k) => (
                  <li
                    key={k}
                    className={cn('flex items-center gap-2 text-[13px]', !b.plan.features[k] && 'text-muted')}
                  >
                    {b.plan.features[k] ? (
                      <Check className="size-4 text-green-700 dark:text-green-400" />
                    ) : (
                      <X className="size-4" />
                    )}
                    {labels[k].label}
                    {k === 'aiCopilot' && !b.plan.features[k] && s.isTrial && <Sparkles className="size-3.5" />}
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="How to pay"
            subtitle="Send the subscription fee to one of these accounts, then upload the receipt below."
          />
          <CardBody>
            {!hasAccounts ? (
              <EmptyState
                icon={Landmark}
                title="Payment accounts not set yet"
                text="Please contact the platform team through Support."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {(a.bank.accountNumber || a.bank.iban) && (
                  <div className="border-line rounded-xl border p-4">
                    <p className="text-ink mb-2 flex items-center gap-2 font-semibold">
                      <Landmark className="text-primary size-4" /> {a.bank.bankName || 'Bank transfer'}
                    </p>
                    <CopyValue label="Account title" value={a.bank.accountTitle} />
                    <CopyValue label="Account number" value={a.bank.accountNumber} />
                    <CopyValue label="IBAN" value={a.bank.iban} />
                  </div>
                )}
                {a.jazzcash.number && (
                  <div className="border-line rounded-xl border p-4">
                    <p className="text-ink mb-2 flex items-center gap-2 font-semibold">
                      <Smartphone className="text-primary size-4" /> JazzCash
                    </p>
                    <CopyValue label="Account title" value={a.jazzcash.accountTitle} />
                    <CopyValue label="Number" value={a.jazzcash.number} />
                  </div>
                )}
                {a.easypaisa.number && (
                  <div className="border-line rounded-xl border p-4">
                    <p className="text-ink mb-2 flex items-center gap-2 font-semibold">
                      <Smartphone className="text-primary size-4" /> Easypaisa
                    </p>
                    <CopyValue label="Account title" value={a.easypaisa.accountTitle} />
                    <CopyValue label="Number" value={a.easypaisa.number} />
                  </div>
                )}
              </div>
            )}
            {a.instructions && <p className="text-muted mt-4 text-[13px]">{a.instructions}</p>}
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader
            title="Send payment proof"
            subtitle="After paying, enter the details from your receipt. The platform team verifies it and your subscription is renewed."
          />
          <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Months" htmlFor="bp-months">
              <Select
                id="bp-months"
                value={form.months}
                onChange={(e) => setForm({ ...form, months: Number(e.target.value) })}
              >
                {[1, 3, 6, 12].map((m) => (
                  <option key={m} value={m}>
                    {m} month{m > 1 ? 's' : ''} · {formatMoney(b.plan.priceMonthly * m)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Paid through" htmlFor="bp-method">
              <Select
                id="bp-method"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}
              >
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="JAZZCASH">JazzCash</option>
                <option value="EASYPAISA">Easypaisa</option>
                <option value="CHEQUE">Cheque</option>
              </Select>
            </Field>
            <Field label="Transaction ID / reference" htmlFor="bp-ref" required error={errors.reference}>
              <Input
                id="bp-ref"
                placeholder="e.g. TID 01234567890"
                maxLength={60}
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
              />
            </Field>
            <Field
              label="Amount paid (Rs.)"
              htmlFor="bp-amount"
              hint={`Expected: ${formatMoney(expected)}`}
              error={errors.amount}
            >
              <Input
                id="bp-amount"
                inputMode="numeric"
                placeholder={String(expected)}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d]/g, '') })}
              />
            </Field>
            <Field label="Payment date" htmlFor="bp-date" error={errors.paidOn}>
              <Input
                id="bp-date"
                type="date"
                value={form.paidOn}
                onChange={(e) => setForm({ ...form, paidOn: e.target.value })}
              />
            </Field>
            <Field label="Receipt (PDF, JPG or PNG, up to 5 MB)" htmlFor="bp-file" required error={errors.file}>
              <Input
                key={fileKey}
                id="bp-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Field>
            <Field label="Note (optional)" htmlFor="bp-note" className="sm:col-span-2 lg:col-span-3">
              <Textarea
                id="bp-note"
                rows={2}
                maxLength={500}
                placeholder="Anything the platform team should know"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </Field>
            <div className="flex justify-end sm:col-span-2 lg:col-span-3">
              <Button
                icon={<Send className="size-4" />}
                loading={send.isPending}
                disabled={!form.reference.trim() || !file}
                onClick={() => send.mutate()}
              >
                Send payment proof
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Payment history" />
          <DataTable
            columns={requestColumns}
            rows={b.requests}
            rowKey={(r) => r._id}
            empty={
              <EmptyState
                icon={Lock}
                title="No payments sent yet"
                text="Payments you send appear here with their status."
              />
            }
          />
        </Card>
      </div>
    </>
  );
}
