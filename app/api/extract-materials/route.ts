import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { handleCorsOptions, applyCorsHeaders } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { ExtractMaterialsRequestSchema, parseRequestBody } from '@/lib/validation';
import { anthropic as anthropicConfig } from '@/lib/config';
import { withRetry } from '@/lib/api-retry';
import { logger } from '@/lib/logger';
import { lookupMaterialPrices } from '@/lib/product-extractor';

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    // Rate limiting (per-IP, 10/min)
    const rateLimitResult = checkRateLimit(req, null, 'extractMaterials');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter),
          },
        }
      ));
    }

    const body = await req.json();

    // Validate request body
    const parsed = parseRequestBody(ExtractMaterialsRequestSchema, body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { conversationContext } = parsed.data;
    const startTime = Date.now();

    logger.info('Extract materials request', { requestId, messageCount: conversationContext.length });

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    const extractionPrompt = `Based on this conversation, extract a complete materials list for the DIY project discussed.

Conversation:
${conversationContext.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join('\n\n')}

Analyze the conversation and extract ALL materials mentioned that would be needed for this project.

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just the JSON):
{
  "project_description": "Brief description of the project (2-5 words)",
  "materials": [
    {
      "name": "Specific product name",
      "quantity": "Amount needed (e.g., '2', '1 box', '10 feet')",
      "category": "electrical|lumber|plumbing|hardware|tools|paint|fasteners|general",
      "estimated_price": "Per-unit price as number only, NOT multiplied by quantity (e.g., '15.99')",
      "required": true
    }
  ],
  "total_estimate": 0
}

Important:
- Include ALL materials mentioned in the conversation
- Use specific product names when possible
- estimated_price MUST reflect current big-box retailer prices (Home Depot, Lowe's level)
- Use standard/builder-grade products, not premium brands
- Common references: 2x4x8 ~$4, Romex 12/2 250ft ~$85, GFCI outlet ~$17, drywall 4x8 ~$14, paint gallon ~$30
- When in doubt, estimate conservatively (lower)
- Set required to true for essential items, false for optional
- Calculate total_estimate as the sum of (estimated_price × quantity) for all items
- If no materials are found, return an empty materials array`;

    const response = await withRetry(
      () => anthropic.messages.create({
        model: anthropicConfig.model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: extractionPrompt }]
      }),
      { maxRetries: 2, baseDelayMs: 1000 }
    );

    const content = response.content[0];
    if (content.type === 'text') {
      // Try to extract JSON from the response
      let jsonText = content.text.trim();

      // Remove markdown code blocks if present
      const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1].trim();
      }

      // Try to find JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const materials = JSON.parse(jsonMatch[0]);

          // Validate structure
          if (materials.materials && Array.isArray(materials.materials)) {
            // Live price lookup — more time budget here (no 15s tool constraint)
            await lookupMaterialPrices(materials.materials, {
              limit: 10, concurrency: 5, perCallTimeoutMs: 3000, totalTimeoutMs: 12000,
            });

            // Always recalculate total from per-unit prices × quantities
            materials.total_estimate = materials.materials.reduce(
              (sum: number, m: { estimated_price?: string; quantity?: string }) => {
                const price = parseFloat(m.estimated_price || '0');
                const qty = parseInt(m.quantity || '1') || 1;
                return sum + (price * qty);
              },
              0
            );

            logger.info('Materials extracted', { requestId, duration: Date.now() - startTime, materialCount: materials.materials.length });
            return applyCorsHeaders(req, NextResponse.json(materials));
          }
        } catch (parseError) {
          logger.error('JSON parse error in materials extraction', parseError, { requestId });
        }
      }
    }

    logger.warn('Failed to extract materials from response', { requestId, duration: Date.now() - startTime });
    return applyCorsHeaders(req, NextResponse.json({ error: 'Failed to extract materials from conversation' }, { status: 500 }));
  } catch (error) {
    logger.error('Extract materials error', error, { requestId });
    return applyCorsHeaders(req, NextResponse.json({ error: 'Failed to extract materials' }, { status: 500 }));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
