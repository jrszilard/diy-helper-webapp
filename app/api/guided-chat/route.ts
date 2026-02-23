import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit } from '@/lib/rate-limit';
import { projectTemplates } from '@/lib/templates/index';

const TEMPLATE_IDS = projectTemplates.map(t => t.id).join(', ');

export async function POST(req: NextRequest) {
  // Rate limit by IP (no auth required)
  const rateLimitResult = checkRateLimit(req, null, 'guided-chat');
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
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
      model: 'claude-haiku-4-5-20251001',
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
    console.error('Guided chat API error:', error);
    // Graceful fallback
    return NextResponse.json({
      projectType: 'general',
      description: 'DIY project',
    });
  }
}
