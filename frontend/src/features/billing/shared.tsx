'use client';

import { Checkbox } from '@/components/ui/input';
import { useBrand } from '@/features/branding/brand-context';

export const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'JAZZCASH', label: 'JazzCash' },
  { value: 'EASYPAISA', label: 'Easypaisa' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CASH', label: 'Cash' },
  { value: 'ONLINE', label: 'Online' },
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];
export const methodLabel = (m: string) => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m;

export const FEATURE_KEYS = [
  'multipleCampuses',
  'customBranding',
  'advancedAnalytics',
  'aiCopilot',
  'aiBriefing',
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type TrialFeatures = Record<FeatureKey, boolean>;
export const DEFAULT_TRIAL: TrialFeatures = {
  multipleCampuses: true,
  customBranding: true,
  advancedAnalytics: true,
  aiCopilot: false,
  aiBriefing: false,
};

export function useFeatureLabels(): Record<FeatureKey, { label: string; description: string }> {
  const brand = useBrand();
  return {
    multipleCampuses: { label: 'Multiple campuses', description: 'More than one campus in the workspace' },
    customBranding: { label: 'Custom branding', description: 'Own logo and colors' },
    advancedAnalytics: { label: 'Advanced analytics', description: 'Detailed analytics and reports' },
    aiCopilot: {
      label: `${brand.agentName} AI assistant`,
      description: 'Chat, answers from live data and prepared actions',
    },
    aiBriefing: { label: 'Daily AI briefing', description: 'Morning summary by notification and e-mail' },
  };
}

export function TrialFeaturePicker({
  value,
  onChange,
}: {
  value: TrialFeatures;
  onChange: (v: TrialFeatures) => void;
}) {
  const labels = useFeatureLabels();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {FEATURE_KEYS.map((k) => (
        <Checkbox
          key={k}
          label={labels[k].label}
          description={labels[k].description}
          checked={value[k]}
          onChange={(e) => onChange({ ...value, [k]: e.target.checked })}
        />
      ))}
    </div>
  );
}

export interface PaymentAccounts {
  bank: { bankName: string; accountTitle: string; accountNumber: string; iban: string };
  jazzcash: { accountTitle: string; number: string };
  easypaisa: { accountTitle: string; number: string };
  instructions: string;
}

export interface PaymentRequest {
  _id: string;
  institution?: string;
  planName: string;
  months: number;
  amount: number;
  expected: number;
  method: PaymentMethod;
  reference: string;
  paidOn: string;
  note: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  submittedByName: string;
  decidedByName: string;
  decidedAt: string | null;
  reason: string;
  createdAt: string;
}

export interface SubscriptionPayment {
  _id: string;
  institution?: string;
  planName: string;
  months: number;
  amount: number;
  method: string;
  reference: string;
  periodStart: string;
  periodEnd: string;
  recordedByName: string;
  createdAt: string;
}

export const requestTone = { PENDING: 'amber', VERIFIED: 'green', REJECTED: 'red' } as const;
