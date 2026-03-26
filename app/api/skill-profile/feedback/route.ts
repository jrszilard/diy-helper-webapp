import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const FeedbackSchema = z.object({
  domain: z.string(),
  conversationId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = FeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { domain } = parsed.data;
    const adminClient = getAdminClient();

    const { data: existing } = await adminClient
      .from('user_skill_profiles')
      .select('id, known_topics')
      .eq('user_id', auth.userId)
      .single();

    if (existing) {
      const topics = existing.known_topics || [];
      if (!topics.includes(domain)) {
        topics.push(domain);
        await adminClient
          .from('user_skill_profiles')
          .update({ known_topics: topics, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      }
    } else {
      await adminClient
        .from('user_skill_profiles')
        .insert({
          user_id: auth.userId,
          known_topics: [domain],
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Skill profile feedback error', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
