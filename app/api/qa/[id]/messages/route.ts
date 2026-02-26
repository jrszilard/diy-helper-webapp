import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase-admin';
import { createNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const SendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  attachments: z.array(z.string().url()).max(5).optional(),
});

// GET /api/qa/[id]/messages — list messages for a question
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { id } = await params;

    // Use user's client so RLS applies (participants only)
    const { data: messages, error } = await auth.supabaseClient
      .from('qa_messages')
      .select('id, question_id, sender_user_id, sender_role, content, attachments, created_at')
      .eq('question_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch qa_messages', error, { questionId: id });
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to load messages' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ messages: messages || [] }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Q&A messages GET error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

// POST /api/qa/[id]/messages — send a message in a threaded conversation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const rateLimitResult = checkRateLimit(req, auth.userId, 'messages');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = SendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Invalid message', details: parsed.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const adminClient = getAdminClient();

    // Fetch question to verify participation and status
    const { data: question, error: qErr } = await adminClient
      .from('qa_questions')
      .select('id, diyer_user_id, expert_id, status, is_threaded')
      .eq('id', id)
      .single();

    if (qErr || !question) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Determine sender role
    let senderRole: 'diyer' | 'expert' | null = null;
    let recipientUserId: string | null = null;

    if (question.diyer_user_id === auth.userId) {
      senderRole = 'diyer';
    } else if (question.expert_id) {
      // Check if this user is the claimed expert
      const { data: expertProfile } = await adminClient
        .from('expert_profiles')
        .select('id, user_id')
        .eq('id', question.expert_id)
        .single();
      if (expertProfile?.user_id === auth.userId) {
        senderRole = 'expert';
      }
    }

    if (!senderRole) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Only participants can send messages' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Check status allows messaging
    const allowedStatuses = ['claimed', 'answered', 'in_conversation', 'resolve_proposed'];
    if (!allowedStatuses.includes(question.status)) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: `Cannot send messages when question status is "${question.status}"` }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // ── Tier gate check (DIYer messages only) ───────────────────────────
    if (senderRole === 'diyer') {
      const { checkTierGate, countDiyerMessages } = await import('@/lib/marketplace/tier-gate');

      // Fetch current tier and price info
      const { data: tierData } = await adminClient
        .from('qa_questions')
        .select('current_tier, price_cents')
        .eq('id', id)
        .single();

      // Count existing DIYer messages
      const { data: diyerMsgs } = await adminClient
        .from('qa_messages')
        .select('sender_role')
        .eq('question_id', id)
        .eq('sender_role', 'diyer');

      const diyerMessageCount = countDiyerMessages(diyerMsgs || []);

      const gateResult = checkTierGate({
        senderRole: 'diyer',
        currentTier: tierData?.current_tier || 1,
        diyerMessageCount,
        priceCents: tierData?.price_cents || 0,
        userId: auth.userId,
      });

      if (gateResult.blocked) {
        return applyCorsHeaders(req, new Response(
          JSON.stringify({
            error: 'tier_upgrade_required',
            tierGate: {
              currentTier: gateResult.currentTier,
              nextTier: gateResult.nextTier,
              upgradeCostCents: gateResult.upgradeCostCents,
              upgradeDescription: gateResult.upgradeDescription,
              diyerMessageCount: gateResult.diyerMessageCount,
            },
          }),
          { status: 402, headers: { 'Content-Type': 'application/json' } }
        ));
      }
    }

    // Sanitize content with detailed flagging
    const { sanitizeContentDetailed } = await import('@/lib/marketplace/messaging-utils');
    const sanitizeResult = sanitizeContentDetailed(parsed.data.content);
    const sanitizedContent = sanitizeResult.sanitized;

    // Log if contact info was detected
    if (sanitizeResult.wasFlagged) {
      try {
        const { logActivity } = await import('@/lib/marketplace/fraud-detection');
        await logActivity(adminClient, {
          eventType: 'sanitization_trigger',
          severity: sanitizeResult.flags.length >= 3 ? 'high' : sanitizeResult.flags.length >= 2 ? 'medium' : 'low',
          userId: auth.userId,
          questionId: id,
          description: `Contact info in Q&A message: ${sanitizeResult.flags.map(f => f.type).join(', ')}`,
          originalContent: parsed.data.content,
          metadata: { flags: sanitizeResult.flags, senderRole, context: 'qa_message' },
        });
      } catch { /* best-effort */ }
    }

    // Insert message
    const { data: message, error: insertErr } = await adminClient
      .from('qa_messages')
      .insert({
        question_id: id,
        sender_user_id: auth.userId,
        sender_role: senderRole,
        content: sanitizedContent,
        attachments: parsed.data.attachments || [],
      })
      .select('id, question_id, sender_user_id, sender_role, content, attachments, created_at')
      .single();

    if (insertErr) {
      logger.error('Failed to insert qa_message', insertErr, { questionId: id });
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to send message' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Update question status to in_conversation if it was just claimed/answered
    if (question.status === 'claimed' || question.status === 'answered') {
      await adminClient
        .from('qa_questions')
        .update({ status: 'in_conversation', is_threaded: true })
        .eq('id', id);
    }

    // Get recipient user ID for notification
    if (senderRole === 'diyer' && question.expert_id) {
      const { data: expertProfile } = await adminClient
        .from('expert_profiles')
        .select('user_id')
        .eq('id', question.expert_id)
        .single();
      recipientUserId = expertProfile?.user_id || null;
    } else if (senderRole === 'expert') {
      recipientUserId = question.diyer_user_id;
    }

    // Notify other party
    if (recipientUserId) {
      await createNotification({
        userId: recipientUserId,
        type: 'qa_message_received',
        title: senderRole === 'expert' ? 'Expert replied to your question' : 'DIYer sent a follow-up',
        body: sanitizedContent.length > 100 ? sanitizedContent.slice(0, 100) + '...' : sanitizedContent,
        link: `/marketplace/qa/${id}`,
      });
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ message }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Q&A message POST error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
