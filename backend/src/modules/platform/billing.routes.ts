import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { PERMISSIONS } from '../../constants/permissions';
import { audit } from '../../lib/audit';
import { env } from '../../config/env';
import { ApiError, created, ok } from '../../lib/http';
import { sendMail } from '../../lib/mailer';
import { saveUpload, streamFile, upload } from '../../lib/storage';
import { idParams, parse } from '../../lib/validate';
import { authenticate, requireSuperAdmin } from '../../middleware/auth';
import { requirePermission } from '../../middleware/tenant';
import { PlatformSettingsModel } from '../branding/branding.models';
import { FileModel } from '../files/file.model';
import { InstitutionModel, subscriptionState, TRIAL_FEATURE_KEYS } from '../institutions/institution.model';
import { planOf } from '../institutions/limits';
import { notify } from '../notifications/notify';
import { UserModel } from '../users/user.model';
import { PAYMENT_METHODS, PaymentRequestModel, SubscriptionPaymentModel } from './billing.model';
import { institutionAdmins, renewSubscription } from './platform.service';

const money = (n: number) => `Rs. ${Math.round(n).toLocaleString('en-PK')}`;

export async function paymentAccounts() {
  const s = await PlatformSettingsModel.findById('platform').lean();
  const a = s?.paymentAccounts;
  return {
    bank: {
      bankName: a?.bank?.bankName ?? '',
      accountTitle: a?.bank?.accountTitle ?? '',
      accountNumber: a?.bank?.accountNumber ?? '',
      iban: a?.bank?.iban ?? '',
    },
    jazzcash: { accountTitle: a?.jazzcash?.accountTitle ?? '', number: a?.jazzcash?.number ?? '' },
    easypaisa: { accountTitle: a?.easypaisa?.accountTitle ?? '', number: a?.easypaisa?.number ?? '' },
    instructions: a?.instructions ?? '',
  };
}

const text = (max: number) => z.string().trim().max(max).default('');
const accountsBody = z.object({
  bank: z.object({
    bankName: text(80),
    accountTitle: text(120),
    accountNumber: text(40),
    iban: z
      .string()
      .trim()
      .toUpperCase()
      .max(34)
      .refine(
        (v) => !v || /^PK\d{2}[A-Z]{4}\d{16}$/.test(v.replace(/\s/g, '')),
        'Enter a valid Pakistani IBAN (PK + 22 characters).',
      )
      .default(''),
  }),
  jazzcash: z.object({
    accountTitle: text(120),
    number: z
      .string()
      .trim()
      .refine((v) => !v || /^03\d{9}$/.test(v), 'Enter an 11-digit mobile number, e.g. 03001234567.')
      .default(''),
  }),
  easypaisa: z.object({
    accountTitle: text(120),
    number: z
      .string()
      .trim()
      .refine((v) => !v || /^03\d{9}$/.test(v), 'Enter an 11-digit mobile number, e.g. 03001234567.')
      .default(''),
  }),
  instructions: text(600),
});

export const platformBillingRouter = Router();
platformBillingRouter.use(authenticate, requireSuperAdmin);

platformBillingRouter.get('/accounts', async (_req, res) => {
  ok(res, await paymentAccounts());
});

platformBillingRouter.put('/accounts', async (req, res) => {
  const body = parse(accountsBody, req.body);
  await PlatformSettingsModel.updateOne(
    { _id: 'platform' },
    { $set: { paymentAccounts: body, updatedBy: req.auth!.userId } },
    { upsert: true },
  );
  await audit(req, 'PAYMENT_ACCOUNTS_UPDATED', 'PlatformSettings', null, {
    bank: Boolean(body.bank.accountNumber || body.bank.iban),
    jazzcash: Boolean(body.jazzcash.number),
    easypaisa: Boolean(body.easypaisa.number),
  });
  ok(res, await paymentAccounts());
});

platformBillingRouter.get('/requests', async (req, res) => {
  const { status } = parse(
    z.object({ status: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'ALL']).default('PENDING') }),
    req.query,
  );
  const rows = await PaymentRequestModel.find(status === 'ALL' ? {} : { status })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  const names = new Map(
    (
      await InstitutionModel.find({ _id: { $in: rows.map((r) => r.institutionId) } })
        .select('name shortName')
        .lean()
    ).map((i) => [String(i._id), i.shortName || i.name]),
  );
  ok(
    res,
    rows.map((r) => ({ ...r, institution: names.get(String(r.institutionId)) ?? '' })),
  );
});

platformBillingRouter.get('/payments', async (_req, res) => {
  const rows = await SubscriptionPaymentModel.find().sort({ createdAt: -1 }).limit(200).lean();
  const names = new Map(
    (
      await InstitutionModel.find({ _id: { $in: rows.map((r) => r.institutionId) } })
        .select('name shortName')
        .lean()
    ).map((i) => [String(i._id), i.shortName || i.name]),
  );
  ok(
    res,
    rows.map((r) => ({ ...r, institution: names.get(String(r.institutionId)) ?? '' })),
  );
});

platformBillingRouter.get('/requests/:id/proof', async (req, res) => {
  const { id } = parse(idParams, req.params);
  const r = await PaymentRequestModel.findById(id).lean();
  if (!r) throw ApiError.notFound('Payment');
  const file = await FileModel.findById(r.proofFileId).lean();
  if (!file) throw ApiError.notFound('File');
  await streamFile(res, file);
});

async function tellInstitution(institutionId: Types.ObjectId, title: string, body: string) {
  for (const u of await institutionAdmins(institutionId)) {
    await notify(u._id, { type: 'SUBSCRIPTION', title, body, link: '/institution/billing' });
    await sendMail({
      to: u.email,
      subject: title,
      heading: title,
      paragraphs: [`Dear ${u.fullName}, ${body}`],
      action: { label: 'Open billing', url: `${env.WEB_URL}/institution/billing` },
    });
  }
}

platformBillingRouter.post('/requests/:id/verify', async (req, res) => {
  const { id } = parse(idParams, req.params);
  const r = await PaymentRequestModel.findById(id);
  if (!r) throw ApiError.notFound('Payment');
  if (r.status !== 'PENDING') throw ApiError.conflict('This payment was already decided.');
  const inst = await renewSubscription(req, String(r.institutionId), r.months, String(r.planId), {
    amount: r.amount,
    method: r.method as never,
    reference: r.reference,
  });
  const payment = await SubscriptionPaymentModel.findOne({ institutionId: r.institutionId })
    .sort({ createdAt: -1 })
    .lean();
  const me = await UserModel.findById(req.auth!.userId).select('fullName').lean();
  r.status = 'VERIFIED';
  r.decidedBy = new Types.ObjectId(req.auth!.userId);
  r.decidedByName = me?.fullName ?? '';
  r.decidedAt = new Date();
  r.paymentId = payment?._id ?? null;
  await r.save();
  await audit(
    req,
    'SUBSCRIPTION_PAYMENT_VERIFIED',
    'SubscriptionPaymentRequest',
    r._id,
    { amount: r.amount, months: r.months },
    { institutionId: r.institutionId },
  );
  const until = inst.subscription!.endsAt!.toLocaleDateString('en-PK', {
    timeZone: 'Asia/Karachi',
    dateStyle: 'medium',
  });
  await tellInstitution(
    r.institutionId,
    'Subscription payment verified',
    `your payment of ${money(r.amount)} (reference ${r.reference}) was verified. The ${r.planName} subscription now runs until ${until}.`,
  );
  ok(res, r.toObject());
});

platformBillingRouter.post('/requests/:id/reject', async (req, res) => {
  const { id } = parse(idParams, req.params);
  const { reason } = parse(
    z.object({ reason: z.string().trim().min(5, 'Please write a reason.').max(500) }),
    req.body,
  );
  const r = await PaymentRequestModel.findById(id);
  if (!r) throw ApiError.notFound('Payment');
  if (r.status !== 'PENDING') throw ApiError.conflict('This payment was already decided.');
  const me = await UserModel.findById(req.auth!.userId).select('fullName').lean();
  r.status = 'REJECTED';
  r.reason = reason;
  r.decidedBy = new Types.ObjectId(req.auth!.userId);
  r.decidedByName = me?.fullName ?? '';
  r.decidedAt = new Date();
  await r.save();
  await audit(
    req,
    'SUBSCRIPTION_PAYMENT_REJECTED',
    'SubscriptionPaymentRequest',
    r._id,
    { reason },
    { institutionId: r.institutionId },
  );
  await tellInstitution(
    r.institutionId,
    'Subscription payment not accepted',
    `the payment with reference ${r.reference} could not be verified. Reason: ${reason}. Please check it and send the proof again.`,
  );
  ok(res, r.toObject());
});

export const institutionBillingRouter = Router();
institutionBillingRouter.use(requirePermission(PERMISSIONS.INSTITUTION_SETTINGS));

institutionBillingRouter.get('/', async (req, res) => {
  const inst = await InstitutionModel.findById(req.tenant!.institutionId).lean();
  if (!inst) throw ApiError.notFound('Institution');
  const plan = await planOf(inst);
  const [requests, payments] = await Promise.all([
    PaymentRequestModel.find({ institutionId: inst._id }).sort({ createdAt: -1 }).limit(50).lean(),
    SubscriptionPaymentModel.find({ institutionId: inst._id }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  ok(res, {
    plan: { _id: plan._id, name: plan.name, priceMonthly: plan.priceMonthly, features: plan.features },
    subscription: {
      state: subscriptionState(inst),
      isTrial: Boolean(inst.subscription?.isTrial),
      startsAt: inst.subscription?.startsAt ?? null,
      endsAt: inst.subscription?.endsAt ?? null,
      trialFeatures: inst.subscription?.isTrial ? (inst.subscription?.trialFeatures ?? null) : null,
    },
    featureKeys: TRIAL_FEATURE_KEYS,
    accounts: await paymentAccounts(),
    requests,
    payments,
  });
});

institutionBillingRouter.post('/requests', upload.single('file'), async (req, res) => {
  const body = parse(
    z.object({
      months: z.coerce.number().int().min(1).max(36),
      method: z.enum(PAYMENT_METHODS),
      reference: z.string().trim().min(4, 'Enter the transaction ID or reference.').max(60),
      amount: z.coerce.number().min(1, 'Enter the amount you paid.').max(100_000_000),
      paidOn: z.coerce
        .date()
        .refine((d) => d.getTime() <= Date.now() + 86_400_000, 'The payment date cannot be in the future.'),
      note: z.string().trim().max(500).default(''),
    }),
    req.body,
  );
  const inst = await InstitutionModel.findById(req.tenant!.institutionId).lean();
  if (!inst) throw ApiError.notFound('Institution');
  const plan = await planOf(inst);
  if (
    await PaymentRequestModel.exists({
      method: body.method,
      reference: new RegExp(`^${body.reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      status: { $ne: 'REJECTED' },
    })
  )
    throw ApiError.validation('This reference was already submitted.', {
      fields: { reference: 'Already used.' },
    });
  const file = await saveUpload(req.file, {
    ownerId: req.auth!.userId,
    purpose: 'SUBSCRIPTION_PROOF',
    formats: ['PDF', 'JPG', 'PNG'],
    maxSizeMB: 5,
  });
  const me = await UserModel.findById(req.auth!.userId).select('fullName').lean();
  const doc = await PaymentRequestModel.create({
    institutionId: inst._id,
    planId: plan._id,
    planName: plan.name,
    months: body.months,
    amount: body.amount,
    expected: plan.priceMonthly * body.months,
    method: body.method,
    reference: body.reference,
    paidOn: body.paidOn,
    proofFileId: file._id,
    note: body.note,
    submittedBy: req.auth!.userId,
    submittedByName: me?.fullName ?? '',
  });
  await audit(
    req,
    'SUBSCRIPTION_PAYMENT_SUBMITTED',
    'SubscriptionPaymentRequest',
    doc._id,
    { amount: body.amount, months: body.months, method: body.method },
    { institutionId: inst._id },
  );
  const admins = await UserModel.find({ platformRole: 'SUPER_ADMIN', status: 'ACTIVE' }).select('_id').lean();
  for (const a of admins)
    await notify(a._id, {
      type: 'SUBSCRIPTION',
      title: `Subscription payment from ${inst.shortName || inst.name}`,
      body: `${money(body.amount)} for ${body.months} month(s) of ${plan.name} by ${body.method.replace('_', ' ').toLowerCase()} (reference ${body.reference}). Please verify it.`,
      link: '/platform/billing',
    });
  created(res, doc.toObject());
});

institutionBillingRouter.get('/requests/:id/proof', async (req, res) => {
  const { id } = parse(idParams, req.params);
  const r = await PaymentRequestModel.findOne({ _id: id, institutionId: req.tenant!.institutionId }).lean();
  if (!r) throw ApiError.notFound('Payment');
  const file = await FileModel.findById(r.proofFileId).lean();
  if (!file) throw ApiError.notFound('File');
  await streamFile(res, file);
});
