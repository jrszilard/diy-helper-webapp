import { z } from 'zod';

export const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(10000, 'Message too long'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.union([z.string(), z.array(z.any())]),
      })
    )
    .max(100, 'History too long')
    .default([]),
  streaming: z.boolean().default(true),
  project_id: z.string().optional(),
});

export const SearchStoresRequestSchema = z.object({
  materialName: z.string().min(1, 'Material name is required').max(200, 'Material name too long'),
  location: z.string().min(1, 'Location is required').max(200, 'Location too long'),
  stores: z
    .array(z.enum(['home-depot', 'lowes', 'ace-hardware', 'menards']))
    .default(['home-depot', 'lowes', 'ace-hardware']),
  validatePricing: z.boolean().default(true),
});

export const ExtractMaterialsRequestSchema = z.object({
  conversationContext: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
      })
    )
    .min(1, 'Conversation context is required')
    .max(100, 'Conversation context too long'),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type SearchStoresRequest = z.infer<typeof SearchStoresRequestSchema>;
export type ExtractMaterialsRequest = z.infer<typeof ExtractMaterialsRequestSchema>;

type ParseSuccess<T> = { success: true; data: T };
type ParseError = { success: false; error: string };

export function parseRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): ParseSuccess<T> | ParseError {
  const result = schema.safeParse(body);

  if (!result.success) {
    const messages = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    );
    return { success: false, error: messages.join('; ') };
  }

  return { success: true, data: result.data };
}
