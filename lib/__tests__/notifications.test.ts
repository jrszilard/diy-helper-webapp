import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mutable per-test preference value read by the mocked admin client.
let mockPref: boolean = true;
const mockInsert = vi.fn(async () => ({ error: null }));

vi.mock('@/lib/supabase-admin', () => ({
  getAdminClient: () => ({
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { email: 'expert@example.com' } },
          error: null,
        }),
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { email_on_new_question: mockPref }, error: null }),
        }),
      }),
      insert: mockInsert,
    }),
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('sendEmailNotification — new-question preference gate', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.EMAIL_DOMAIN = 'fixerator.com';
    global.fetch = vi.fn(async () => ({ ok: true, text: async () => '' })) as unknown as typeof fetch;
    mockInsert.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the new-question email when the expert has it enabled', async () => {
    mockPref = true;
    const { sendEmailNotification } = await import('@/lib/notifications');

    await sendEmailNotification({
      userId: 'expert-1',
      type: 'qa_question_posted',
      title: 'New question in your specialty',
      body: 'How do I install a faucet?',
      link: '/experts/dashboard/qa',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(init.body)).toContain('New question waiting for you'); // qaNewQuestion subject
  });

  it('does NOT send the email when the expert has it disabled', async () => {
    mockPref = false;
    const { sendEmailNotification } = await import('@/lib/notifications');

    await sendEmailNotification({
      userId: 'expert-1',
      type: 'qa_question_posted',
      title: 'New question in your specialty',
      body: 'How do I install a faucet?',
      link: '/experts/dashboard/qa',
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('also gates qa_bidding_open on the preference', async () => {
    mockPref = false;
    const { sendEmailNotification } = await import('@/lib/notifications');

    await sendEmailNotification({
      userId: 'expert-1',
      type: 'qa_bidding_open',
      title: 'New specialist question — submit your proposal',
      body: 'Need a load calc',
      link: '/experts/dashboard/qa',
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('still inserts the in-app notification when the email preference is off', async () => {
    mockPref = false;
    const { createNotification } = await import('@/lib/notifications');

    await createNotification({
      userId: 'expert-1',
      type: 'qa_question_posted',
      title: 'New question in your specialty',
      body: 'How do I install a faucet?',
      link: '/experts/dashboard/qa',
    });

    expect(mockInsert).toHaveBeenCalledTimes(1); // bell fires regardless of email preference
  });
});
