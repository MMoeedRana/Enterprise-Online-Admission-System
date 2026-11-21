import { afterEach, describe, expect, it } from 'vitest';
import { setProvider } from '../src/modules/agent/providers';
import type { ChatMessage, ChatProvider, ChatResult, ToolSpec } from '../src/modules/agent/providers/types';
import { InstitutionModel } from '../src/modules/institutions/institution.model';
import { NotificationModel } from '../src/modules/notifications/notification.models';
import { PaymentRequestModel, SubscriptionPaymentModel } from '../src/modules/platform/billing.model';
import { PNG, api, createInstitution, createPlan, superAdminToken } from './helpers';

const enterprise = () => createPlan({}, { aiCopilot: true, aiBriefing: true, advancedAnalytics: true });
const slug = (p: string) => `${p}${Math.random().toString(36).slice(2, 6)}`;
const membership = async (token: string, id: string) =>
  (await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`)).body.data.memberships.find(
    (m: { institutionId: string }) => m.institutionId === id,
  );

class Script implements ChatProvider {
  readonly name = 'fake';
  readonly model = 'fake-1';
  constructor(private queue: Partial<ChatResult>[]) {}
  async chat(_req: { messages: ChatMessage[]; tools: ToolSpec[] }): Promise<ChatResult> {
    const n = this.queue.shift() ?? { content: 'ok' };
    return {
      content: n.content ?? '',
      toolCalls: n.toolCalls ?? [],
      usage: { inputTokens: 1, outputTokens: 1 },
    };
  }
}

afterEach(() => setProvider(null));

describe('trials (Super Admin, manual and through the assistant)', () => {
  it('gives a trial with the chosen features and locks the workspace when it ends, except billing', async () => {
    const root = await superAdminToken();
    const t = await createInstitution(slug('tr'), { plan: await enterprise() });
    const bad = await api()
      .post(`/api/v1/platform/institutions/${t.id}/trial`)
      .set('Authorization', `Bearer ${root}`)
      .send({ days: 0, features: {} });
    expect(bad.status).toBe(422);
    const r = await api()
      .post(`/api/v1/platform/institutions/${t.id}/trial`)
      .set('Authorization', `Bearer ${root}`)
      .send({ days: 3, features: { customBranding: true, advancedAnalytics: true } });
    expect(r.status).toBe(200);
    const inst = await InstitutionModel.findById(t.id).lean();
    expect(inst!.subscription!.isTrial).toBe(true);
    expect(Math.round((inst!.subscription!.endsAt!.getTime() - Date.now()) / 864e5)).toBe(3);

    const m = await membership(t.token, t.id);
    expect(m.ai).toEqual({ copilot: false, briefing: false });
    expect(m.branding.active).toBe(true);
    expect(m.subscription).toMatchObject({ state: 'ACTIVE', isTrial: true });
    expect((await t.as.post('/agent/conversations')).status).toBe(403);
    expect((await t.as.get('/institution/profile')).status).toBe(200);
    expect(
      await NotificationModel.countDocuments({ type: 'SUBSCRIPTION', title: /3-day trial/ }),
    ).toBeGreaterThan(0);

    await InstitutionModel.updateOne(
      { _id: t.id },
      { $set: { 'subscription.endsAt': new Date(Date.now() - 1000) } },
    );
    const locked = await t.as.get('/institution/profile');
    expect(locked.status).toBe(403);
    expect(locked.body.error.code).toBe('TRIAL_ENDED');
    expect((await t.as.get('/billing')).status).toBe(200);
    expect((await membership(t.token, t.id)).subscription.state).toBe('TRIAL_ENDED');
  });

  it('lets the assistant prepare a trial that runs only after the Super Admin confirms', async () => {
    const root = await superAdminToken();
    const t = await createInstitution(slug('ta'), { plan: await enterprise() });
    setProvider(
      new Script([
        {
          toolCalls: [
            {
              id: '1',
              name: 'grant_trial',
              args: {
                institution: t.inst.name,
                days: 2,
                features: {
                  multipleCampuses: true,
                  customBranding: false,
                  advancedAnalytics: true,
                  aiCopilot: false,
                  aiBriefing: false,
                },
              },
            },
          ],
        },
        { content: 'Prepared. Press Confirm to start the trial.' },
      ]),
    );
    const as = (m: 'get' | 'post', url: string) =>
      api()[m](`/api/v1/platform/agent${url}`).set('Authorization', `Bearer ${root}`);
    const c = await as('post', '/conversations');
    const r = await as('post', `/conversations/${c.body.data._id}/messages`).send({
      message: `Give ${t.inst.name} a 2 day trial without AI`,
    });
    const action = r.body.data.events.find((e: { type: string }) => e.type === 'action').action;
    expect(action.summary).toMatch(/2-day trial/);
    expect(action.summary).toMatch(/not included: .*AI assistant/);
    expect((await InstitutionModel.findById(t.id).lean())!.subscription!.isTrial).toBe(false);
    const done = await as('post', `/actions/${action._id}/confirm`);
    expect(done.body.data.status).toBe('DONE');
    const inst = await InstitutionModel.findById(t.id).lean();
    expect(inst!.subscription).toMatchObject({
      isTrial: true,
      trialFeatures: { aiCopilot: false, multipleCampuses: true },
    });
  });
});

describe('subscription payments to the platform', () => {
  it('lets the Super Admin set the bank, JazzCash and Easypaisa accounts with checks', async () => {
    const root = await superAdminToken();
    const put = (body: object) =>
      api().put('/api/v1/platform/billing/accounts').set('Authorization', `Bearer ${root}`).send(body);
    const base = {
      bank: {
        bankName: 'Meezan Bank',
        accountTitle: 'ADMITRA Technologies',
        accountNumber: '0101-0123456789',
        iban: 'PK36MEZN0001010123456789',
      },
      jazzcash: { accountTitle: 'ADMITRA', number: '03001234567' },
      easypaisa: { accountTitle: 'ADMITRA', number: '03451234567' },
      instructions: 'Write your institution name in the transfer note.',
    };
    expect((await put({ ...base, bank: { ...base.bank, iban: 'PK12' } })).status).toBe(422);
    expect((await put({ ...base, jazzcash: { accountTitle: 'x', number: '12345' } })).status).toBe(422);
    const ok = await put(base);
    expect(ok.status).toBe(200);
    expect(ok.body.data.easypaisa.number).toBe('03451234567');
    const t = await createInstitution(slug('ac'));
    expect((await t.as.get('/billing')).body.data.accounts.bank.iban).toBe('PK36MEZN0001010123456789');
  });

  it('renews the subscription when the Super Admin verifies the proof, and explains a rejection', async () => {
    const root = await superAdminToken();
    const t = await createInstitution(slug('py'), { endsAt: new Date(Date.now() - 1000) });
    await InstitutionModel.updateOne({ _id: t.id }, { $set: { 'subscription.isTrial': true } });
    expect((await t.as.get('/institution/profile')).status).toBe(403);

    const send = (reference: string) =>
      t.as
        .post('/billing/requests')
        .field('months', '3')
        .field('method', 'JAZZCASH')
        .field('reference', reference)
        .field('amount', '3000')
        .field('paidOn', new Date().toISOString())
        .attach('file', PNG, 'receipt.png');
    const first = await send('JC-778899');
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({ status: 'PENDING', expected: 3000, months: 3 });
    expect((await send('JC-778899')).status).toBe(422);
    expect(await NotificationModel.countDocuments({ title: /Subscription payment from/ })).toBeGreaterThan(0);

    const sa = (m: 'get' | 'post', url: string) =>
      api()[m](`/api/v1/platform/billing${url}`).set('Authorization', `Bearer ${root}`);
    const list = await sa('get', '/requests');
    expect(list.body.data.some((r: { reference: string }) => r.reference === 'JC-778899')).toBe(true);
    expect((await sa('get', `/requests/${first.body.data._id}/proof`)).status).toBe(200);
    const v = await sa('post', `/requests/${first.body.data._id}/verify`);
    expect(v.body.data.status).toBe('VERIFIED');
    const inst = await InstitutionModel.findById(t.id).lean();
    expect(inst!.subscription!.isTrial).toBe(false);
    expect(inst!.subscription!.endsAt!.getTime()).toBeGreaterThan(Date.now() + 80 * 864e5);
    expect(
      await SubscriptionPaymentModel.countDocuments({
        institutionId: t.id,
        method: 'JAZZCASH',
        amount: 3000,
      }),
    ).toBe(1);
    expect((await t.as.get('/institution/profile')).status).toBe(200);
    expect((await sa('post', `/requests/${first.body.data._id}/verify`)).status).toBe(409);

    const second = await send('EP-445566');
    const rej = await sa('post', `/requests/${second.body.data._id}/reject`).send({
      reason: 'No such transaction in our statement.',
    });
    expect(rej.body.data.status).toBe('REJECTED');
    expect((await PaymentRequestModel.findById(second.body.data._id).lean())!.reason).toMatch(/statement/);
    expect(
      await NotificationModel.countDocuments({ title: 'Subscription payment not accepted' }),
    ).toBeGreaterThan(0);
    const other = await createInstitution(slug('ot'));
    expect((await other.as.get(`/billing/requests/${first.body.data._id}/proof`)).status).toBe(404);
  });
});
