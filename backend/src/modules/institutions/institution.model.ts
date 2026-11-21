import { Schema, Types, model, type InferSchemaType } from 'mongoose';
import { INSTITUTION_STATUSES, INSTITUTION_TYPES, PROVINCES, SECTORS } from '../../constants/enums';

export const GRACE_DAYS = 7;

const institutionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    shortName: { type: String, required: true, trim: true, uppercase: true, maxlength: 10 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    type: { type: String, enum: INSTITUTION_TYPES, required: true },
    sector: { type: String, enum: SECTORS, default: 'PRIVATE' },
    city: { type: String, required: true, trim: true },
    province: { type: String, enum: PROVINCES, required: true },
    website: { type: String, default: '' },
    email: { type: String, default: '', lowercase: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    about: { type: String, default: '' },
    contact: {
      name: { type: String, required: true },
      designation: { type: String, default: '' },
      email: { type: String, required: true, lowercase: true },
      phone: { type: String, default: '' },
    },
    status: { type: String, enum: INSTITUTION_STATUSES, default: 'PENDING', index: true },
    statusReason: { type: String, default: '' },
    planId: { type: Types.ObjectId, ref: 'SubscriptionPlan', default: null },
    subscription: {
      startsAt: { type: Date, default: null },
      endsAt: { type: Date, default: null },
      isTrial: { type: Boolean, default: false },
      trialFeatures: { type: Schema.Types.Mixed, default: null },
    },
    branding: {
      logoUrl: { type: String, default: '' },
      logoKey: { type: String, default: '' },
      primaryColor: { type: String, default: '' },
      sidebarColor: { type: String, default: '' },
    },
    bankAccount: {
      bankName: { type: String, default: '' },
      accountTitle: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      iban: { type: String, default: '' },
    },
    settings: {
      eligibilityAsSeparateStep: { type: Boolean, default: true },
      requireOriginals: { type: Boolean, default: false },
    },
    approvedAt: Date,
    approvedBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export type Institution = InferSchemaType<typeof institutionSchema>;
export const InstitutionModel = model('Institution', institutionSchema);

export type SubscriptionState = 'ACTIVE' | 'GRACE' | 'READ_ONLY' | 'TRIAL_ENDED' | 'NONE';

export const TRIAL_FEATURE_KEYS = [
  'multipleCampuses',
  'customBranding',
  'advancedAnalytics',
  'aiCopilot',
  'aiBriefing',
] as const;
export type TrialFeatureKey = (typeof TRIAL_FEATURE_KEYS)[number];
export type TrialFeatures = Record<TrialFeatureKey, boolean>;

export const DEFAULT_TRIAL_FEATURES: TrialFeatures = {
  multipleCampuses: true,
  customBranding: true,
  advancedAnalytics: true,
  aiCopilot: false,
  aiBriefing: false,
};

type SubscriptionLike = {
  subscription?: { endsAt?: Date | null; isTrial?: boolean | null; trialFeatures?: unknown } | null;
};

export function subscriptionState(inst: SubscriptionLike, now = new Date()): SubscriptionState {
  const endsAt = inst.subscription?.endsAt;
  if (!endsAt) return 'NONE';
  if (now <= endsAt) return 'ACTIVE';
  if (inst.subscription?.isTrial) return 'TRIAL_ENDED';
  const graceEnd = new Date(endsAt.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);
  return now <= graceEnd ? 'GRACE' : 'READ_ONLY';
}

export function effectiveFeatures<T extends Record<string, unknown>>(features: T, inst: SubscriptionLike): T {
  const mask = inst.subscription?.isTrial
    ? (inst.subscription.trialFeatures as Partial<TrialFeatures> | null)
    : null;
  if (!mask) return features;
  const out: Record<string, unknown> = { ...features };
  for (const k of TRIAL_FEATURE_KEYS) out[k] = Boolean(features[k]) && Boolean(mask[k]);
  return out as T;
}
