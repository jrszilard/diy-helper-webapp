import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('isAdmin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns true for admin user IDs', async () => {
    process.env.ADMIN_USER_IDS = 'user-aaa,user-bbb';
    const { isAdmin } = await import('@/lib/admin-auth');
    expect(isAdmin('user-aaa')).toBe(true);
    expect(isAdmin('user-bbb')).toBe(true);
  });

  it('returns false for non-admin user IDs', async () => {
    process.env.ADMIN_USER_IDS = 'user-aaa';
    const { isAdmin } = await import('@/lib/admin-auth');
    expect(isAdmin('user-zzz')).toBe(false);
  });

  it('returns false when env var is not set', async () => {
    delete process.env.ADMIN_USER_IDS;
    const { isAdmin } = await import('@/lib/admin-auth');
    expect(isAdmin('user-aaa')).toBe(false);
  });

  it('trims whitespace in user IDs', async () => {
    process.env.ADMIN_USER_IDS = ' user-aaa , user-bbb ';
    const { isAdmin } = await import('@/lib/admin-auth');
    expect(isAdmin('user-aaa')).toBe(true);
    expect(isAdmin('user-bbb')).toBe(true);
  });
});
