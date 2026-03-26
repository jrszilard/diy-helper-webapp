import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthFromRequest } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import config from '@/lib/config';
import { buildCodeLookupPrompt } from '@/lib/marketplace/expert-tools';

const CodeLookupSchema = z.object({
  topic: z.string().min(3).max(500),
  state: z.string().length(2),
  city: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CodeLookupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { topic, state, city } = parsed.data;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
    const prompt = buildCodeLookupPrompt(topic, state, city);

    const response = await anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    return NextResponse.json({
      codes: text,
      disclaimer: 'Verify with your local building department — codes vary by jurisdiction and amendment date.',
      location: city ? `${city}, ${state}` : state,
      topic,
    });
  } catch (error) {
    logger.error('Code lookup error', error);
    return NextResponse.json({
      error: 'Unable to retrieve codes right now. Try again or consult your state licensing board.',
    }, { status: 500 });
  }
}
