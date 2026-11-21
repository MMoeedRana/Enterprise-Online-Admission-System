'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye, Landmark, Save, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { errorMessage, fieldErrors, get, post, put } from '@/lib/api';
import { openFile } from '@/lib/files';
import { formatDate, formatMoney } from '@/lib/format';
import {
  methodLabel,
  requestTone,
  type PaymentAccounts,
  type PaymentRequest,
  type SubscriptionPayment,
} from './shared';

type Tab = 'requests' | 'payments' | 'accounts';
type StatusFilter = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'ALL';

const EMPTY: PaymentAccounts = {
  bank: { bankName: '', accountTitle: '', accountNumber: '', iban: '' },
  jazzcash: { accountTitle: '', number: '' },
  easypaisa: { accountTitle: '', number: '' },
  instructions: '',
};

function Requests() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const q = useQuery({
    queryKey: ['platform', 'billing', 'requests', status],
    queryFn: () => get<PaymentRequest[]>('/platform/billing/requests', { status }),
  });
  const [verify, setVerify] = useState<PaymentRequest | null>(null);
  const [reject, setReject] = useState<PaymentRequest | null>(null);
  const decide = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'verify' | 'reject'; reason?: string }) =>
      post(`/platform/billing/requests/${id}/${action}`, reason ? { reason } : {}),
    onSuccess: async (_d, v) => {
      toast.success(v.action === 'verify' ? 'Payment verified and the subscription renewed.' : 'Payment rejected.');
      setVerify(null);
      setReject(null);
      await qc.invalidateQueries({ queryKey: ['platform'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const columns: Column<PaymentRequest>[] = [
    {
      key: 'inst',
      header: 'Institution',
      primary: true,
      cell: (r) => (
        <span>
          <span className="text-ink block font-semibold">{r.institution}</span>
          <span className="text-muted text-[12px]">
            {r.planName} · {r.months} month{r.months > 1 ? 's' : ''}
          </span>
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (r) => (
        <span>
          <span className="text-ink block font-semibold">{formatMoney(r.amount)}</span>
          {r.amount !== r.expected && (
            <span className="block text-[12px] text-amber-700 dark:text-amber-400">
              Expected {formatMoney(r.expected)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Method and reference',
      cell: (r) => (
        <span>
          <span className="block">{methodLabel(r.method)}</span>
          <span className="text-muted font-mono text-[12px]">{r.reference}</span>
        </span>
      ),
    },
    { key: 'paid', header: 'Paid on', hideOnMobile: true, cell: (r) => formatDate(r.paidOn) },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <span>
          <Badge tone={requestTone[r.status]}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</Badge>
          {r.reason && <span className="text-muted mt-1 block max-w-[220px] text-[12px]">{r.reason}</span>}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (r) => (
        <span className="flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<Eye className="size-4" />}
            onClick={() => void openFile(`/platform/billing/requests/${r._id}/proof`)}
          >
            Proof
          </Button>
          {r.status === 'PENDING' && (
            <>
              <Button
                size="sm"
                variant="success"
                icon={<CheckCircle2 className="size-4" />}
                onClick={() => setVerify(r)}
              >
                Verify
              </Button>
              <Button size="sm" variant="ghost" icon={<XCircle className="size-4" />} onClick={() => setReject(r)}>
                Reject
              </Button>
            </>
          )}
        </span>
      ),
    },
  ];
  return (
    <Card>
      <CardHeader
        title="Subscription payments"
        subtitle="Institutions pay to the accounts below and upload the receipt. Check the amount in your statement, then verify."
        action={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="w-[170px]"
          >
            <option value="PENDING">Waiting</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All</option>
          </Select>
        }
      />
      <DataTable
        columns={columns}
        rows={q.data ?? []}
        rowKey={(r) => r._id}
        loading={q.isLoading}
        empty={
          <EmptyState
            icon={CheckCircle2}
            title={status === 'PENDING' ? 'No payments waiting' : 'No payments'}
            text="New payment receipts from institutions appear here."
          />
        }
      />
      <ConfirmDialog
        open={Boolean(verify)}
        onClose={() => setVerify(null)}
        onConfirm={() => verify && decide.mutate({ id: verify._id, action: 'verify' })}
        title="Verify this payment?"
        message={
          verify
            ? `${verify.institution}: ${formatMoney(verify.amount)} by ${methodLabel(verify.method)} (reference ${verify.reference}). The subscription is renewed for ${verify.months} month(s) and the institution is notified.`
            : ''
        }
        confirmLabel="Verify and renew"
        variant="success"
        loading={decide.isPending}
      />
      <ConfirmDialog
        open={Boolean(reject)}
        onClose={() => setReject(null)}
        onConfirm={(reason) => reject && decide.mutate({ id: reject._id, action: 'reject', reason })}
        title="Reject this payment?"
        message="The institution is told the reason and can send the proof again."
        confirmLabel="Reject"
        reasonLabel="Reason"
        loading={decide.isPending}
      />
    </Card>
  );
}

function Payments() {
  const q = useQuery({
    queryKey: ['platform', 'billing', 'payments'],
    queryFn: () => get<SubscriptionPayment[]>('/platform/billing/payments'),
  });
  const total = (q.data ?? []).reduce((s, p) => s + p.amount, 0);
  const columns: Column<SubscriptionPayment>[] = [
    { key: 'inst', header: 'Institution', primary: true, cell: (p) => <b className="text-ink">{p.institution}</b> },
    { key: 'amount', header: 'Amount', cell: (p) => formatMoney(p.amount) },
    { key: 'plan', header: 'Plan', hideOnMobile: true, cell: (p) => `${p.planName} · ${p.months} mo` },
    { key: 'method', header: 'Method', cell: (p) => methodLabel(p.method) },
    {
      key: 'ref',
      header: 'Reference',
      hideOnMobile: true,
      cell: (p) => <span className="font-mono text-[12px]">{p.reference || '-'}</span>,
    },
    {
      key: 'period',
      header: 'Period',
      hideOnMobile: true,
      cell: (p) => `${formatDate(p.periodStart)} – ${formatDate(p.periodEnd)}`,
    },
    { key: 'date', header: 'Recorded', cell: (p) => formatDate(p.createdAt) },
  ];
  return (
    <Card>
      <CardHeader title="Payments received" subtitle={`Platform fees recorded so far: ${formatMoney(total)}`} />
      <DataTable
        columns={columns}
        rows={q.data ?? []}
        rowKey={(p) => p._id}
        loading={q.isLoading}
        empty={
          <EmptyState icon={Landmark} title="No payments yet" text="Verified payments and renewals appear here." />
        }
      />
    </Card>
  );
}

function Accounts() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['platform', 'billing', 'accounts'],
    queryFn: () => get<PaymentAccounts>('/platform/billing/accounts'),
  });
  const [form, setForm] = useState<PaymentAccounts>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState<PaymentAccounts | null>(null);
  if (q.data && q.data !== loaded) {
    setLoaded(q.data);
    setForm(q.data);
  }
  const save = useMutation({
    mutationFn: () => put<PaymentAccounts>('/platform/billing/accounts', form),
    onSuccess: async () => {
      setErrors({});
      toast.success('Payment accounts saved.');
      await qc.invalidateQueries({ queryKey: ['platform', 'billing', 'accounts'] });
    },
    onError: (e) => {
      setErrors(fieldErrors(e));
      toast.error(errorMessage(e));
    },
  });
  const set = <K extends keyof PaymentAccounts>(k: K, v: PaymentAccounts[K]) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Bank account" subtitle="Shown to institutions for bank transfers (IBFT) and deposits." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Bank name" htmlFor="pa-bank">
            <Input
              id="pa-bank"
              placeholder="e.g. Meezan Bank"
              value={form.bank.bankName}
              onChange={(e) => set('bank', { ...form.bank, bankName: e.target.value })}
            />
          </Field>
          <Field label="Account title" htmlFor="pa-title">
            <Input
              id="pa-title"
              placeholder="e.g. ADMITRA Technologies"
              value={form.bank.accountTitle}
              onChange={(e) => set('bank', { ...form.bank, accountTitle: e.target.value })}
            />
          </Field>
          <Field label="Account number" htmlFor="pa-number">
            <Input
              id="pa-number"
              placeholder="e.g. 0101-0123456789"
              value={form.bank.accountNumber}
              onChange={(e) => set('bank', { ...form.bank, accountNumber: e.target.value })}
            />
          </Field>
          <Field label="IBAN" htmlFor="pa-iban" error={errors['bank.iban']}>
            <Input
              id="pa-iban"
              placeholder="e.g. PK36MEZN0001010123456789"
              value={form.bank.iban}
              onChange={(e) => set('bank', { ...form.bank, iban: e.target.value.toUpperCase() })}
            />
          </Field>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Mobile wallets" subtitle="Institutions can also pay through JazzCash or Easypaisa." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="JazzCash account title" htmlFor="pa-jc-title">
            <Input
              id="pa-jc-title"
              placeholder="Name on the JazzCash account"
              value={form.jazzcash.accountTitle}
              onChange={(e) => set('jazzcash', { ...form.jazzcash, accountTitle: e.target.value })}
            />
          </Field>
          <Field label="JazzCash number" htmlFor="pa-jc-number" error={errors['jazzcash.number']}>
            <Input
              id="pa-jc-number"
              inputMode="numeric"
              placeholder="e.g. 03001234567"
              value={form.jazzcash.number}
              onChange={(e) => set('jazzcash', { ...form.jazzcash, number: e.target.value.replace(/[^\d]/g, '') })}
            />
          </Field>
          <Field label="Easypaisa account title" htmlFor="pa-ep-title">
            <Input
              id="pa-ep-title"
              placeholder="Name on the Easypaisa account"
              value={form.easypaisa.accountTitle}
              onChange={(e) => set('easypaisa', { ...form.easypaisa, accountTitle: e.target.value })}
            />
          </Field>
          <Field label="Easypaisa number" htmlFor="pa-ep-number" error={errors['easypaisa.number']}>
            <Input
              id="pa-ep-number"
              inputMode="numeric"
              placeholder="e.g. 03451234567"
              value={form.easypaisa.number}
              onChange={(e) => set('easypaisa', { ...form.easypaisa, number: e.target.value.replace(/[^\d]/g, '') })}
            />
          </Field>
        </CardBody>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader
          title="Instructions for institutions"
          subtitle="Optional. For example what to write in the transfer note."
        />
        <CardBody className="space-y-4">
          <Field label="Instructions" htmlFor="pa-note">
            <Textarea
              id="pa-note"
              rows={3}
              maxLength={600}
              placeholder="e.g. Write your institution name and the plan in the transfer note."
              value={form.instructions}
              onChange={(e) => set('instructions', e.target.value)}
            />
          </Field>
          <div className="flex justify-end">
            <Button icon={<Save className="size-4" />} loading={save.isPending} onClick={() => save.mutate()}>
              Save payment accounts
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export function PlatformBilling() {
  const [tab, setTab] = useState<Tab>('requests');
  return (
    <>
      <PageHeader
        title="Billing"
        actions={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'requests', label: 'Payments to verify' },
              { value: 'payments', label: 'Payments received' },
              { value: 'accounts', label: 'Payment accounts' },
            ]}
          />
        }
      />
      {tab === 'requests' && <Requests />}
      {tab === 'payments' && <Payments />}
      {tab === 'accounts' && <Accounts />}
    </>
  );
}
