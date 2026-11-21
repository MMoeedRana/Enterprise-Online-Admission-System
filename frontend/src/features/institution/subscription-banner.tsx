'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';
import { get } from '@/lib/api';
import { daysLeft, formatDate } from '@/lib/format';
import { useAuth } from '@/features/auth/auth-context';

interface Sub {
  state: 'ACTIVE' | 'GRACE' | 'READ_ONLY' | 'TRIAL_ENDED' | 'NONE';
  subscription: { endsAt: string | null; isTrial: boolean };
}

export function SubscriptionBanner() {
  const { current } = useAuth();
  const own = current?.subscription;
  const q = useQuery({
    queryKey: ['inst', current?.institutionId, 'subscription'],
    queryFn: () => get<Sub>('/institution/subscription'),
    enabled: Boolean(current) && own?.state !== 'TRIAL_ENDED',
  });
  const canPay = current?.permissions.includes('institution.settings');
  const payLink = canPay ? (
    <Link href="/institution/billing" className="cursor-pointer underline underline-offset-2">
      Go to Billing
    </Link>
  ) : null;

  if (own?.isTrial && own.state === 'ACTIVE' && own.endsAt) {
    const left = Math.max(0, daysLeft(own.endsAt));
    return (
      <div className="bg-violet-600 text-white">
        <p className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-[13px] font-semibold sm:px-6 lg:px-8">
          <Clock className="size-4 shrink-0" />
          {`Trial: ${left <= 0 ? 'ends today' : `${left} day${left === 1 ? '' : 's'} left`} (until ${formatDate(own.endsAt)}). Pay the subscription to keep using the workspace.`}
          {payLink}
        </p>
      </div>
    );
  }
  if (!q.data || (q.data.state !== 'GRACE' && q.data.state !== 'READ_ONLY')) return null;
  const readOnly = q.data.state === 'READ_ONLY';
  return (
    <div className={readOnly ? 'bg-red-600 text-white' : 'bg-amber-500 text-amber-950'}>
      <p className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-[13px] font-semibold sm:px-6 lg:px-8">
        <AlertTriangle className="size-4 shrink-0" />
        {readOnly
          ? 'The subscription has expired. The workspace is read-only until it is renewed. No data has been deleted.'
          : `The subscription ended on ${formatDate(q.data.subscription.endsAt)}. Please renew within the 7-day grace period to avoid read-only mode.`}
        {payLink}
      </p>
    </div>
  );
}
