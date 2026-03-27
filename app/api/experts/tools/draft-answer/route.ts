import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthFromRequest } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import config from '@/lib/config';
import { buildDraftAnswerPrompt } from '@/lib/marketplace/expert-tools';

const DraftSchema = z.object({
  questionId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = DraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    const { data: question, error: qErr } = await adminClient
      .from('qa_questions')
      .select('question_text, report_id, trade_category')
      .eq('id', parsed.data.questionId)
      .single();

    if (qErr || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    let projectContext: Record<string, unknown> | undefined;
    if (question.report_id) {
      try {
        const { buildExpertContext } = await import('@/lib/marketplace/context-builder');
        const ctx = await buildExpertContext(adminClient, question.report_id);
        if (ctx) {
          projectContext = ctx as unknown as Record<string, unknown>;
        }
      } catch {
        // No context available
      }
    }

    const prompt = buildDraftAnswerPrompt(question.question_text, projectContext);
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

    const response = await anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const draft = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    return NextResponse.json({ draft, aiAssisted: true });
  } catch (error) {
    logger.error('Draft answer generation error', error);
    return NextResponse.json({
      error: 'Draft generation unavailable. You can write your answer directly.',
    }, { status: 500 });
  }
}
