import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { handleCorsOptions, applyCorsHeaders } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { ExtractMaterialsRequestSchema, parseRequestBody } from '@/lib/validation';
import { anthropic as anthropicConfig } from '@/lib/config';

export async function POST(req: NextRequest) {
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
      "estimated_price": "Price as number only (e.g., '15.99')",
      "required": true
    }
  ],
  "total_estimate": 0
}

Important:
- Include ALL materials mentioned in the conversation
- Use specific product names when possible
- estimated_price should be a reasonable estimate as a number string
- Set required to true for essential items, false for optional
- Calculate total_estimate as the sum of all estimated prices
- If no materials are found, return an empty materials array`;

    const response = await anthropic.messages.create({
      model: anthropicConfig.model,
      max_tokens: 2000,
      messages: [{ role: 'user', content: extractionPrompt }]
    });

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
            // Calculate total if not provided
            if (!materials.total_estimate) {
              materials.total_estimate = materials.materials.reduce(
                (sum: number, m: { estimated_price?: string; quantity?: string }) => {
                  const price = parseFloat(m.estimated_price || '0');
                  const qty = parseInt(m.quantity || '1') || 1;
                  return sum + (price * qty);
                },
                0
              );
            }

            return applyCorsHeaders(req, NextResponse.json(materials));
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
        }
      }
    }

    return applyCorsHeaders(req, NextResponse.json({ error: 'Failed to extract materials from conversation' }, { status: 500 }));
  } catch (error) {
    console.error('Extract materials error:', error);
    return applyCorsHeaders(req, NextResponse.json({ error: 'Failed to extract materials' }, { status: 500 }));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
