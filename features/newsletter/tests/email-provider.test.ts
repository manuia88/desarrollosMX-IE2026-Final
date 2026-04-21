import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetEmailProviderForTests,
  getEmailProvider,
  MockEmailProvider,
  ResendEmailProvider,
} from '../lib/email-provider';

describe('email provider adapter', () => {
  beforeEach(() => {
    __resetEmailProviderForTests();
    delete process.env.CI;
    delete process.env.EMAIL_PROVIDER;
  });

  it('defaults to mock when no env set', () => {
    const p = getEmailProvider();
    expect(p.name).toBe('mock');
    expect(p).toBeInstanceOf(MockEmailProvider);
  });

  it('uses resend placeholder when EMAIL_PROVIDER=resend', () => {
    process.env.EMAIL_PROVIDER = 'resend';
    __resetEmailProviderForTests();
    const p = getEmailProvider();
    expect(p.name).toBe('resend');
    expect(p).toBeInstanceOf(ResendEmailProvider);
  });

  it('forces mock in CI even when EMAIL_PROVIDER=resend', () => {
    process.env.CI = 'true';
    process.env.EMAIL_PROVIDER = 'resend';
    __resetEmailProviderForTests();
    const p = getEmailProvider();
    expect(p.name).toBe('mock');
  });

  it('mock provider returns sent result with provider=mock', async () => {
    const p = new MockEmailProvider();
    const res = await p.send({
      to: 'alice@example.com',
      subject: 'Hi',
      html: '<p>hi</p>',
    });
    expect(res.accepted).toBe(true);
    expect(res.provider).toBe('mock');
    expect(res.providerMessageId).toMatch(/^mock-/);
    expect(res.error).toBeNull();
  });

  it('resend provider throws NOT_IMPLEMENTED with L-NN pointer', async () => {
    const p = new ResendEmailProvider();
    await expect(p.send({ to: 'a@b.com', subject: 's', html: '<p/>' })).rejects.toThrow(
      /L-NN-RESEND-INSTALL/,
    );
  });
});
