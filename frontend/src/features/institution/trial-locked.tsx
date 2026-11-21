'use client';

import { Lock, Wallet } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { useAuth } from '@/features/auth/auth-context';
import { formatDate } from '@/lib/format';

export function TrialLocked() {
  const { current } = useAuth();
  const canPay = current?.permissions.includes('institution.settings');
  return (
    <div className="mx-auto max-w-xl py-10">
      <Card>
        <CardBody className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">
            <Lock className="size-7" />
          </span>
          <h1 className="text-ink text-[22px] font-bold">The free trial has ended</h1>
          <p className="text-muted max-w-md text-[14px]">
            {current?.name}&apos;s trial ended
            {current?.subscription?.endsAt ? ` on ${formatDate(current.subscription.endsAt)}` : ''}. The workspace opens
            again as soon as the subscription payment is verified. No data has been deleted.
          </p>
          {canPay ? (
            <Link href="/institution/billing">
              <Button icon={<Wallet className="size-4" />}>Pay subscription</Button>
            </Link>
          ) : (
            <p className="text-ink text-[14px] font-semibold">
              Please ask your institution admin to pay the subscription.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
