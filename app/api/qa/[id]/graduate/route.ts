import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase-admin';
import { getExpertById } from '@/lib/marketplace/expert-helpers';
import { createNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const GraduateSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().max(2000).optional(),
  materialsHandling: z.enum(['diyer_provides', 'contractor_provides', 'discuss']).default('discuss'),
  timelinePreference: z.enum(['asap', 'within_2_weeks', 'within_month', 'flexible']).default('flexible'),
  budgetMinCents: z.number().int().min(0).optional(),
  budgetMaxCents: z.number().int().min(0).optional(),
});

/**
 * POST /api/qa/[id]/graduate — Graduate a Q&A conversation to a project RFP.
 * Either the DIYer or the assigned expert can initiate this.
 */
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

    const rateLimitResult = checkRateLimit(req, auth.userId, 'marketplace');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = GraduateSchema.safeParse(body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const adminClient = getAdminClient();

    // Fetch the question
    const { data: question } = await adminClient
      .from('qa_questions')
      .select('id, diyer_user_id, expert_id, report_id, project_id, category, question_text, ai_context, status, graduated_to_rfp_id')
      .eq('id', id)
      .single();

    if (!question) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Only DIYer or assigned expert can graduate
    const isDIYer = question.diyer_user_id === auth.userId;
    let isExpert = false;
    if (question.expert_id) {
      const expert = await getExpertById(auth.supabaseClient, question.expert_id);
      if (expert && expert.userId === auth.userId) {
        isExpert = true;
      }
    }

    if (!isDIYer && !isExpert) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Only the DIYer or assigned expert can graduate this question' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Cannot graduate if already graduated
    if (question.graduated_to_rfp_id) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'This question has already been graduated to a project', rfpId: question.graduated_to_rfp_id }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Must be in a conversation state (claimed or later)
    if (question.status === 'open' || question.status === 'expired') {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Question must be claimed before it can be graduated to a project' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Get DIYer location from the report or question context
    const aiContext = question.ai_context as { location?: { city?: string; state?: string } } | null;
    const city = aiContext?.location?.city || '';
    const state = aiContext?.location?.state || '';

    // Create the RFP
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { data: rfp, error: rfpError } = await adminClient
      .from('project_rfps')
      .insert({
        diyer_user_id: question.diyer_user_id,
        report_id: question.report_id,
        project_id: question.project_id || null,
        source_qa_question_id: question.id,
        priority_expert_id: question.expert_id,
        title: parsed.data.title,
        description: parsed.data.description || `Graduated from Q&A conversation about: ${question.question_text.slice(0, 200)}`,
        materials_handling: parsed.data.materialsHandling,
        timeline_preference: parsed.data.timelinePreference,
        budget_min_cents: parsed.data.budgetMinCents || null,
        budget_max_cents: parsed.data.budgetMaxCents || null,
        city,
        state,
        status: 'open',
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (rfpError || !rfp) {
      logger.error('Failed to create graduation RFP', rfpError, { questionId: id });
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to create project' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Update the question with the graduation link
    await adminClient
      .from('qa_questions')
      .update({ graduated_to_rfp_id: rfp.id })
      .eq('id', id);

    // Notify the other party
    if (isDIYer && question.expert_id) {
      // DIYer initiated — notify expert they have priority
      const expert = await getExpertById(auth.supabaseClient, question.expert_id);
      if (expert) {
        await createNotification({
          userId: expert.userId,
          type: 'rfp_new_bid',
          title: 'Q&A graduated to project — you have priority!',
          body: `The DIYer wants hands-on help. As the Q&A expert, you get first bid on this project.`,
          link: `/experts/dashboard/projects/${rfp.id}`,
        });
      }
    } else if (isExpert) {
      // Expert initiated — notify DIYer
      await createNotification({
        userId: question.diyer_user_id,
        type: 'rfp_new_bid',
        title: 'Your expert recommends a project',
        body: `Your expert thinks this needs hands-on work and created a project proposal for you.`,
        link: `/marketplace/projects/${rfp.id}`,
      });
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        rfpId: rfp.id,
        graduatedBy: isDIYer ? 'diyer' : 'expert',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Q&A graduate error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
