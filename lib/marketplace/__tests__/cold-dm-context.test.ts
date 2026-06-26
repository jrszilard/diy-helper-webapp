import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { contextLinksBothParties } from '@/lib/marketplace/messaging';

type Row = Record<string, unknown>;

/**
 * Minimal thenable query-builder mock that routes by table + recorded filters.
 * Supports: .from(t).select(c).eq(col,val).maybeSingle(), .eq(...).<await>,
 * and .select(c).in('id', ids).<await>.
 */
function fakeAdmin(fx: {
  qa_questions?: Record<string, Row>;
  qa_bids?: Record<string, Row[]>;
  qa_bids_by_id?: Record<string, Row>;
  consultations?: Record<string, Row>;
  project_rfps?: Record<string, Row>;
  project_bids?: Record<string, Row[]>;
  project_bids_by_id?: Record<string, Row>;
  expert_profiles?: Record<string, string>; // expert_profiles.id -> user_id
}): SupabaseClient {
  const handler = (table: string, f: Record<string, unknown>): Row[] => {
    switch (table) {
      case 'qa_questions':
        return fx.qa_questions?.[f.id as string] ? [fx.qa_questions[f.id as string]] : [];
      case 'qa_bids':
        if (f.question_id != null) return fx.qa_bids?.[f.question_id as string] || [];
        if (f.id != null) return fx.qa_bids_by_id?.[f.id as string] ? [fx.qa_bids_by_id[f.id as string]] : [];
        return [];
      case 'consultations':
        return fx.consultations?.[f.id as string] ? [fx.consultations[f.id as string]] : [];
      case 'project_rfps':
        return fx.project_rfps?.[f.id as string] ? [fx.project_rfps[f.id as string]] : [];
      case 'project_bids':
        if (f.rfp_id != null) return fx.project_bids?.[f.rfp_id as string] || [];
        if (f.id != null) return fx.project_bids_by_id?.[f.id as string] ? [fx.project_bids_by_id[f.id as string]] : [];
        return [];
      case 'expert_profiles': {
        const ids = (f.__in_id as string[]) || [];
        return ids
          .map((id) => (fx.expert_profiles?.[id] ? { user_id: fx.expert_profiles[id] } : null))
          .filter(Boolean) as Row[];
      }
      default:
        return [];
    }
  };

  const make = (table: string) => {
    const f: Record<string, unknown> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      eq: (col: string, val: unknown) => { f[col] = val; return builder; },
      in: (col: string, vals: unknown[]) => { f['__in_' + col] = vals; return builder; },
      maybeSingle: () => Promise.resolve({ data: handler(table, f)[0] ?? null }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      then: (onF: any, onR: any) => Promise.resolve({ data: handler(table, f) }).then(onF, onR),
    };
    return builder;
  };

  return { from: (table: string) => make(table) } as unknown as SupabaseClient;
}

describe('contextLinksBothParties', () => {
  const diyer = 'diyer-user-1';
  const expUser = 'expert-user-1';

  it('exempts a Q&A message between the DIYer and the claiming expert', async () => {
    const admin = fakeAdmin({
      qa_questions: { q1: { diyer_user_id: diyer, expert_id: 'exp1' } },
      qa_bids: { q1: [] },
      expert_profiles: { exp1: expUser },
    });
    expect(
      await contextLinksBothParties(admin, { senderUserId: diyer, recipientUserId: expUser, qaQuestionId: 'q1' }),
    ).toBe(true);
  });

  it('exempts a Q&A message to an expert who only BID (not yet claimed)', async () => {
    const admin = fakeAdmin({
      qa_questions: { q1: { diyer_user_id: diyer, expert_id: null } },
      qa_bids: { q1: [{ expert_id: 'exp2' }] },
      expert_profiles: { exp2: 'expert-user-2' },
    });
    expect(
      await contextLinksBothParties(admin, { senderUserId: diyer, recipientUserId: 'expert-user-2', qaQuestionId: 'q1' }),
    ).toBe(true);
  });

  it('does NOT exempt when the recipient is a stranger to the referenced question (spam vector)', async () => {
    const admin = fakeAdmin({
      qa_questions: { q1: { diyer_user_id: diyer, expert_id: 'exp1' } },
      qa_bids: { q1: [] },
      expert_profiles: { exp1: expUser },
    });
    expect(
      await contextLinksBothParties(admin, {
        senderUserId: diyer,
        recipientUserId: 'harvested-stranger-expert',
        qaQuestionId: 'q1',
      }),
    ).toBe(false);
  });

  it('does NOT exempt a non-existent / fabricated context id', async () => {
    const admin = fakeAdmin({ qa_questions: {}, qa_bids: {} });
    expect(
      await contextLinksBothParties(admin, { senderUserId: diyer, recipientUserId: expUser, qaQuestionId: 'does-not-exist' }),
    ).toBe(false);
  });

  it('does NOT exempt when sender === recipient', async () => {
    const admin = fakeAdmin({
      qa_questions: { q1: { diyer_user_id: diyer, expert_id: 'exp1' } },
      expert_profiles: { exp1: expUser },
    });
    expect(
      await contextLinksBothParties(admin, { senderUserId: diyer, recipientUserId: diyer, qaQuestionId: 'q1' }),
    ).toBe(false);
  });

  it('exempts a consultation message between its DIYer and expert', async () => {
    const admin = fakeAdmin({
      consultations: { c1: { diyer_user_id: diyer, expert_id: 'exp1' } },
      expert_profiles: { exp1: expUser },
    });
    expect(
      await contextLinksBothParties(admin, { senderUserId: expUser, recipientUserId: diyer, consultationId: 'c1' }),
    ).toBe(true);
  });
});
