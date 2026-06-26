import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit } from '@/lib/rate-limit';
import { checkAnonAiBudget } from '@/lib/anon-budget';
import { projectTemplates } from '@/lib/templates/index';
import { anthropic as anthropicConfig } from '@/lib/config';
import { logger } from '@/lib/logger';

const TEMPLATE_IDS = projectTemplates.map(t => t.id).join(', ');

export async function POST(req: NextRequest) {
  // Rate limit by IP (no auth required)
  const rateLimitResult = await checkRateLimit(req, null, 'guided-chat');
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
    );
  }

  // This route is fully anonymous and calls Anthropic. The per-IP limiter above is
  // defeated by IP rotation, so enforce the same global daily ceiling that bounds
  // worst-case anon Anthropic spend at public launch (shared budget, distinct bucket).
  const dayKey = new Date().toISOString().slice(0, 10);
  const budget = await checkAnonAiBudget(dayKey, 'guided-chat');
  if (!budget.allowed) {
    logger.warn('Anonymous AI daily ceiling reached (guided-chat)', {
      dayKey, count: budget.count, limit: budget.limit,
    });
    return NextResponse.json(
      { error: 'Free demo capacity for today has been reached. Please sign in to continue.', code: 'ANON_DAILY_LIMIT' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    );
  }

  try {
    const body = await req.json();
    const { message, phase } = body;

    if (!message || typeof message !== 'string' || message.length > 500) {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    if (phase !== 'project') {
      return NextResponse.json({ error: 'Only project phase parsing is supported' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      // Fallback without API
      return NextResponse.json({
        projectType: 'general',
        description: message,
      });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: anthropicConfig.model,
      max_tokens: 200,
      system: `Given a freeform DIY project description, extract:
1. projectType: one of [electrical, plumbing, flooring, outdoor, structural, painting, general]
2. description: a clean, concise description of what the user wants to do
3. templateMatch: optional best-matching template ID from [${TEMPLATE_IDS}], or null if no good match

Return JSON only, no markdown fences. Example: {"projectType":"plumbing","description":"Replace kitchen faucet with a touchless model","templateMatch":"faucet-replacement"}`,
      messages: [{ role: 'user', content: message }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json({
        projectType: parsed.projectType || 'general',
        description: parsed.description || message,
        templateMatch: parsed.templateMatch || null,
      });
    } catch {
      // If Claude returns non-JSON, fallback
      return NextResponse.json({
        projectType: 'general',
        description: message,
      });
    }
  } catch (error) {
    logger.error('Guided chat API error', error);
    // Graceful fallback
    return NextResponse.json({
      projectType: 'general',
      description: 'DIY project',
    });
  }
}
