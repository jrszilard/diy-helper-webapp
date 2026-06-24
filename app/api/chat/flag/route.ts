import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { getAuthFromRequest } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { isValidUUID } from '@/lib/validation';
import { logger } from '@/lib/logger';

const VALID_FLAG_TYPES = ['safety', 'incorrect', 'missing_steps', 'wrong_for_situation'];
// Cap attacker-controllable free-text so the correction queue can't be stuffed
// with huge payloads. Anonymous safety flags are still allowed (valuable on a
// DIY-safety app) but are now attributed when the caller is signed in.
const MAX_FIELD_LEN = 4000;

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);

  // Per-user limit when signed in, per-IP otherwise.
  const rateLimitResult = await checkRateLimit(req, auth.userId, 'marketplace');
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const feedbackType = body.feedbackType as string;

  if (feedbackType === 'thumbs_up') {
    logger.info('Chat thumbs up', {
      conversationId: body.conversationId,
      messageIndex: body.messageIndex,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (feedbackType !== 'flag') {
    return NextResponse.json({ error: 'Invalid feedbackType' }, { status: 400 });
  }

  const flagType = body.flagType as string;
  if (!flagType || !VALID_FLAG_TYPES.includes(flagType)) {
    return NextResponse.json({ error: 'Invalid or missing flagType' }, { status: 400 });
  }

  const userMessage = body.userMessage as string;
  const aiResponse = body.aiResponse as string;
  if (!userMessage || !aiResponse) {
    return NextResponse.json({ error: 'userMessage and aiResponse are required' }, { status: 400 });
  }

  const details = typeof body.details === 'string' ? body.details.slice(0, 500) : null;
  const conversationId = isValidUUID(String(body.conversationId)) ? (body.conversationId as string) : null;

  try {
    const supabase = getAdminClient();
    const { error } = await supabase
      .from('advisor_correction_queue')
      .insert({
        source: 'user_flag',
        status: 'pending',
        user_question: userMessage.slice(0, MAX_FIELD_LEN),
        ai_response: aiResponse.slice(0, MAX_FIELD_LEN),
        flag_type: flagType,
        correction_text: details,
        conversation_id: conversationId,
        message_id: body.messageIndex != null ? String(body.messageIndex).slice(0, 64) : null,
        // Attribute to the signed-in user when present; null for anonymous flags.
        reporter_id: auth.userId,
        reporter_role: 'diy_user',
      });

    if (error) {
      logger.error('Failed to insert flag', { error });
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    logger.info('Chat flag submitted', { flagType, conversationId: body.conversationId });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    logger.error('Exception in flag route', { error: err });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
