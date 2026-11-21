import { Schema, Types, model } from 'mongoose';

export const PAYMENT_METHODS = [
  'BANK_TRANSFER',
  'JAZZCASH',
  'EASYPAISA',
  'CHEQUE',
  'CASH',
  'ONLINE',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const subscriptionPaymentSchema = new Schema(
  {
    institutionId: { type: Types.ObjectId, ref: 'Institution', required: true, index: true },
    planId: { type: Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    planName: { type: String, required: true },
    months: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: PAYMENT_METHODS, default: 'BANK_TRANSFER' },
    reference: { type: String, default: '', trim: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    recordedBy: { type: Types.ObjectId, ref: 'User', default: null },
    recordedByName: { type: String, default: '' },
  },
  { timestamps: true },
);
subscriptionPaymentSchema.index({ createdAt: -1 });
export const SubscriptionPaymentModel = model('SubscriptionPayment', subscriptionPaymentSchema);

const paymentRequestSchema = new Schema(
  {
    institutionId: { type: Types.ObjectId, ref: 'Institution', required: true, index: true },
    planId: { type: Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    planName: { type: String, required: true },
    months: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    expected: { type: Number, required: true, min: 0 },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    reference: { type: String, required: true, trim: true },
    paidOn: { type: Date, required: true },
    proofFileId: { type: Types.ObjectId, ref: 'StoredFile', required: true },
    note: { type: String, default: '', trim: true },
    status: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING', index: true },
    submittedBy: { type: Types.ObjectId, ref: 'User', required: true },
    submittedByName: { type: String, default: '' },
    decidedBy: { type: Types.ObjectId, ref: 'User', default: null },
    decidedByName: { type: String, default: '' },
    decidedAt: { type: Date, default: null },
    reason: { type: String, default: '' },
    paymentId: { type: Types.ObjectId, ref: 'SubscriptionPayment', default: null },
  },
  { timestamps: true },
);
paymentRequestSchema.index({ status: 1, createdAt: -1 });
paymentRequestSchema.index({ method: 1, reference: 1 });
export const PaymentRequestModel = model('SubscriptionPaymentRequest', paymentRequestSchema);
