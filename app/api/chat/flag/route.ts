import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const VALID_FLAG_TYPES = ['safety', 'incorrect', 'missing_steps', 'wrong_for_situation'];

export async function POST(req: NextRequest) {
  const rateLimitResult = checkRateLimit(
    req.headers.get('x-forwarded-for') || 'unknown',
    'marketplace',
  );
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

  try {
    const supabase = getAdminClient();
    const { error } = await supabase
      .from('advisor_correction_queue')
      .insert({
        source: 'user_flag',
        status: 'pending',
        user_question: userMessage,
        ai_response: aiResponse,
        flag_type: flagType,
        correction_text: details,
        conversation_id: body.conversationId || null,
        message_id: body.messageIndex != null ? String(body.messageIndex) : null,
        reporter_id: null,
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
