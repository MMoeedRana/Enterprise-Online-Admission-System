import { SubscriptionPaymentModel, type PaymentMethod } from './billing.model';
import type { Request } from 'express';
import { env } from '../../config/env';
import { audit } from '../../lib/audit';
import { ApiError } from '../../lib/http';
import { sendMail } from '../../lib/mailer';
import { slugify } from '../../lib/slug';
import { createActionToken } from '../auth/auth.service';
import {
  DEFAULT_TRIAL_FEATURES,
  InstitutionModel,
  TRIAL_FEATURE_KEYS,
  type TrialFeatures,
} from '../institutions/institution.model';
import { notify } from '../notifications/notify';
import { PlanModel } from '../plans/plan.model';
import { MemberModel } from '../staff/member.model';
import { UserModel } from '../users/user.model';
import { ensureDefaultDocumentTypes } from '../documents/document.models';
import type { Id } from '../../lib/types';
import { brand } from '../../lib/brand';

const DAY = 24 * 60 * 60 * 1000;

export async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || 'institution';
  let slug = base;
  for (let i = 2; await InstitutionModel.exists({ slug }); i++) slug = `${base}-${i}`;
  return slug;
}

export async function inviteMember(
  req: Request,
  institution: { _id: Id; name: string },
  data: { email: string; fullName?: string; designation?: string; roles: string[]; departmentIds?: string[] },
) {
  const existing = await MemberModel.findOne({ institutionId: institution._id, email: data.email });
  if (existing && existing.status !== 'INVITED') {
    throw ApiError.conflict('This person is already a staff member of the institution.', {
      fields: { email: 'Already a member.' },
    });
  }
  const applicant = await UserModel.exists({ email: data.email, accountType: 'APPLICANT' });
  if (applicant) {
    throw ApiError.conflict('This e-mail belongs to an applicant account and cannot be used for staff.', {
      fields: { email: 'Applicant account e-mail.' },
    });
  }
  const member =
    existing ??
    (new MemberModel({
      institutionId: institution._id,
      email: data.email,
      status: 'INVITED',
      invitedBy: req.auth?.userId,
    }) as unknown as NonNullable<typeof existing>);
  member.fullName = data.fullName ?? member.fullName;
  member.designation = data.designation ?? member.designation;
  member.set('roles', data.roles);
  member.set('departmentIds', data.departmentIds ?? []);
  await member.save();
  await sendInvitation(member, institution.name);
  return member;
}

export async function sendInvitation(
  member: { _id: Id; email: string; fullName?: string | null },
  institutionName: string,
) {
  const raw = await createActionToken('INVITATION', { memberId: member._id, email: member.email });
  await sendMail({
    to: member.email,
    subject: `You are invited to ${institutionName} on ${brand().platformName}`,
    heading: 'Staff invitation',
    paragraphs: [
      `Hello${member.fullName ? ' ' + member.fullName : ''}, you have been invited to join <b>${institutionName}</b> on ${brand().platformName}.`,
      'Open the link to set your password and join the workspace. The invitation can be used once and is valid for 7 days.',
    ],
    action: { label: 'Accept invitation', url: `${env.WEB_URL}/accept-invitation?token=${raw}` },
  });
}

export async function approveInstitution(
  req: Request,
  id: string,
  planId: string,
  trialDays?: number,
  trialFeatures?: Partial<TrialFeatures>,
) {
  const inst = await InstitutionModel.findById(id);
  if (!inst) throw ApiError.notFound('Institution');
  if (inst.status !== 'PENDING') throw ApiError.conflict('Only pending requests can be approved.');
  const plan = await PlanModel.findOne({ _id: planId, status: 'ACTIVE' });
  if (!plan)
    throw ApiError.validation('Select an active plan.', { fields: { planId: 'Select an active plan.' } });

  const days = trialDays ?? plan.trialDays;
  const now = new Date();
  inst.status = 'ACTIVE';
  inst.statusReason = '';
  inst.planId = plan._id;
  inst.subscription = {
    startsAt: now,
    endsAt: new Date(now.getTime() + days * DAY),
    isTrial: true,
    trialFeatures: { ...DEFAULT_TRIAL_FEATURES, ...trialFeatures },
  };
  inst.approvedAt = now;
  inst.set('approvedBy', req.auth?.userId);
  await inst.save();

  await ensureDefaultDocumentTypes(inst._id);
  await inviteMember(req, inst, {
    email: inst.contact!.email,
    fullName: inst.contact!.name,
    designation: inst.contact!.designation,
    roles: ['INSTITUTION_ADMIN'],
  });
  await audit(
    req,
    'INSTITUTION_APPROVED',
    'Institution',
    inst._id,
    { plan: plan.code, trialDays: days },
    { institutionId: inst._id },
  );
  return inst;
}

export async function rejectInstitution(req: Request, id: string, reason: string) {
  const inst = await InstitutionModel.findById(id);
  if (!inst) throw ApiError.notFound('Institution');
  if (inst.status !== 'PENDING') throw ApiError.conflict('Only pending requests can be rejected.');
  inst.status = 'REJECTED';
  inst.statusReason = reason;
  await inst.save();
  await sendMail({
    to: inst.contact!.email,
    subject: `Your ${brand().platformName} onboarding request`,
    heading: 'Onboarding request not approved',
    paragraphs: [
      `Dear ${inst.contact!.name}, the request for <b>${inst.name}</b> was not approved.`,
      `Reason: ${reason}`,
    ],
  });
  await audit(req, 'INSTITUTION_REJECTED', 'Institution', inst._id, { reason }, { institutionId: inst._id });
  return inst;
}

export async function setSuspended(req: Request, id: string, suspend: boolean, reason = '') {
  const inst = await InstitutionModel.findById(id);
  if (!inst) throw ApiError.notFound('Institution');
  if (suspend && inst.status !== 'ACTIVE')
    throw ApiError.conflict('Only active institutions can be suspended.');
  if (!suspend && inst.status !== 'SUSPENDED')
    throw ApiError.conflict('Only suspended institutions can be re-activated.');
  inst.status = suspend ? 'SUSPENDED' : 'ACTIVE';
  inst.statusReason = suspend ? reason : '';
  await inst.save();
  await audit(
    req,
    suspend ? 'INSTITUTION_SUSPENDED' : 'INSTITUTION_REACTIVATED',
    'Institution',
    inst._id,
    { reason },
    { institutionId: inst._id },
  );
  return inst;
}

export async function renewSubscription(
  req: Request,
  id: string,
  months: number,
  planId?: string,
  payment: {
    amount?: number;
    method?: PaymentMethod;
    reference?: string;
  } = {},
) {
  const inst = await InstitutionModel.findById(id);
  if (!inst) throw ApiError.notFound('Institution');
  if (!['ACTIVE', 'SUSPENDED'].includes(inst.status))
    throw ApiError.conflict('Only approved institutions can be renewed.');
  if (planId) {
    const plan = await PlanModel.findOne({ _id: planId, status: 'ACTIVE' });
    if (!plan)
      throw ApiError.validation('Select an active plan.', { fields: { planId: 'Select an active plan.' } });
    inst.planId = plan._id;
  }
  const now = new Date();
  const from = inst.subscription?.endsAt && inst.subscription.endsAt > now ? inst.subscription.endsAt : now;
  const endsAt = new Date(from);
  endsAt.setMonth(endsAt.getMonth() + months);
  inst.subscription = {
    startsAt: inst.subscription?.startsAt ?? now,
    endsAt,
    isTrial: false,
    trialFeatures: null,
  };
  await inst.save();
  const plan = await PlanModel.findById(inst.planId).lean();
  if (plan)
    await SubscriptionPaymentModel.create({
      institutionId: inst._id,
      planId: plan._id,
      planName: plan.name,
      months,
      amount: payment.amount ?? plan.priceMonthly * months,
      method: payment.method ?? 'BANK_TRANSFER',
      reference: payment.reference ?? '',
      periodStart: from,
      periodEnd: endsAt,
      recordedBy: req.auth?.userId ?? null,
      recordedByName: req.auth?.name ?? '',
    });
  await audit(
    req,
    'SUBSCRIPTION_RENEWED',
    'Institution',
    inst._id,
    { months, endsAt, planId },
    { institutionId: inst._id },
  );
  return inst;
}

export function featureLabel(k: (typeof TRIAL_FEATURE_KEYS)[number]) {
  return {
    multipleCampuses: 'multiple campuses',
    customBranding: 'custom branding',
    advancedAnalytics: 'advanced analytics',
    aiCopilot: `the ${brand().agentName} AI assistant`,
    aiBriefing: 'the daily AI briefing',
  }[k];
}

export async function institutionAdmins(institutionId: Id) {
  const ids = await MemberModel.find({
    institutionId,
    status: 'ACTIVE',
    roles: 'INSTITUTION_ADMIN',
  }).distinct('userId');
  return UserModel.find({ _id: { $in: ids }, status: 'ACTIVE' })
    .select('email fullName')
    .lean();
}

export async function grantTrial(req: Request, id: string, days: number, features: Partial<TrialFeatures>) {
  const inst = await InstitutionModel.findById(id);
  if (!inst) throw ApiError.notFound('Institution');
  if (inst.status !== 'ACTIVE')
    throw ApiError.conflict('A trial can be given only to an approved, active institution.');
  if (!inst.planId) throw ApiError.conflict('Give the institution a plan first.');
  const now = new Date();
  const trialFeatures = Object.fromEntries(
    TRIAL_FEATURE_KEYS.map((k) => [k, Boolean(features[k])]),
  ) as TrialFeatures;
  inst.subscription = {
    startsAt: now,
    endsAt: new Date(now.getTime() + days * DAY),
    isTrial: true,
    trialFeatures,
  };
  await inst.save();
  const included = TRIAL_FEATURE_KEYS.filter((k) => trialFeatures[k]).map(featureLabel);
  const until = inst.subscription.endsAt!.toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  for (const u of await institutionAdmins(inst._id)) {
    await notify(u._id, {
      type: 'SUBSCRIPTION',
      title: `${days}-day trial of ${brand().platformName}`,
      body: `Your trial runs until ${until}. ${included.length ? `It includes ${included.join(', ')}.` : 'It includes the core admission features.'} Pay the subscription on the Billing page to keep access after the trial.`,
      link: '/institution/billing',
    });
    await sendMail({
      to: u.email,
      subject: `Your ${days}-day trial of ${brand().platformName}`,
      heading: `Your trial of ${brand().platformName}`,
      paragraphs: [
        `Dear ${u.fullName}, <b>${inst.name}</b> can use ${brand().platformName} until <b>${until}</b> (Pakistan time).`,
        included.length
          ? `The trial includes ${included.join(', ')}, together with the core admission features.`
          : 'The trial includes the core admission features.',
        'When the trial ends, the workspace is locked until the subscription is paid. You can pay on the Billing page at any time.',
      ],
      action: { label: 'Open billing', url: `${env.WEB_URL}/institution/billing` },
    });
  }
  await audit(
    req,
    'INSTITUTION_TRIAL_GRANTED',
    'Institution',
    inst._id,
    { days, features: trialFeatures },
    { institutionId: inst._id },
  );
  return inst;
}
