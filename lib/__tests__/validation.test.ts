import { describe, it, expect } from 'vitest';
import {
  ChatRequestSchema,
  SearchStoresRequestSchema,
  ExtractMaterialsRequestSchema,
  CreateConversationSchema,
  AddMessageSchema,
  UpdateConversationSchema,
  parseRequestBody,
} from '../validation';

describe('ChatRequestSchema', () => {
  it('accepts a valid chat request', () => {
    const result = ChatRequestSchema.safeParse({
      message: 'How do I install a ceiling fan?',
      history: [],
      streaming: true,
    });
    expect(result.success).toBe(true);
  });

  it('applies defaults for optional fields', () => {
    const result = ChatRequestSchema.safeParse({ message: 'hello' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.history).toEqual([]);
      expect(result.data.streaming).toBe(true);
    }
  });

  it('rejects empty message', () => {
    const result = ChatRequestSchema.safeParse({ message: '' });
    expect(result.success).toBe(false);
  });

  it('rejects message over 10000 chars', () => {
    const result = ChatRequestSchema.safeParse({ message: 'x'.repeat(10001) });
    expect(result.success).toBe(false);
  });

  it('accepts history with string and array content', () => {
    const result = ChatRequestSchema.safeParse({
      message: 'hello',
      history: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: [{ type: 'text', text: 'hello' }] },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid role in history', () => {
    const result = ChatRequestSchema.safeParse({
      message: 'hello',
      history: [{ role: 'system', content: 'nope' }],
    });
    expect(result.success).toBe(false);
  });

  it('validates optional uuid fields', () => {
    const result = ChatRequestSchema.safeParse({
      message: 'hello',
      project_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('SearchStoresRequestSchema', () => {
  it('accepts valid request with defaults', () => {
    const result = SearchStoresRequestSchema.safeParse({
      materialName: '12-gauge wire',
      location: 'Portland, OR',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stores).toEqual(['home-depot', 'lowes', 'ace-hardware']);
      expect(result.data.validatePricing).toBe(true);
    }
  });

  it('rejects empty materialName', () => {
    const result = SearchStoresRequestSchema.safeParse({
      materialName: '',
      location: 'Portland, OR',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid store name', () => {
    const result = SearchStoresRequestSchema.safeParse({
      materialName: 'wire',
      location: 'Portland',
      stores: ['walmart'],
    });
    expect(result.success).toBe(false);
  });
});

describe('ExtractMaterialsRequestSchema', () => {
  it('accepts valid conversation context', () => {
    const result = ExtractMaterialsRequestSchema.safeParse({
      conversationContext: [
        { role: 'user', content: 'I need to build a deck' },
        { role: 'assistant', content: 'Here are the materials...' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty conversation context', () => {
    const result = ExtractMaterialsRequestSchema.safeParse({
      conversationContext: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateConversationSchema', () => {
  it('accepts empty object', () => {
    const result = CreateConversationSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts optional title and project_id', () => {
    const result = CreateConversationSchema.safeParse({
      title: 'My Chat',
      project_id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects title over 200 chars', () => {
    const result = CreateConversationSchema.safeParse({
      title: 'x'.repeat(201),
    });
    expect(result.success).toBe(false);
  });
});

describe('AddMessageSchema', () => {
  it('accepts valid message', () => {
    const result = AddMessageSchema.safeParse({
      role: 'user',
      content: 'Hello!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty content', () => {
    const result = AddMessageSchema.safeParse({
      role: 'user',
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = AddMessageSchema.safeParse({
      role: 'system',
      content: 'hello',
    });
    expect(result.success).toBe(false);
  });
});

describe('UpdateConversationSchema', () => {
  it('accepts valid title', () => {
    const result = UpdateConversationSchema.safeParse({ title: 'New Title' });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = UpdateConversationSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });
});

describe('parseRequestBody', () => {
  it('returns success with parsed data', () => {
    const result = parseRequestBody(AddMessageSchema, {
      role: 'user',
      content: 'hello',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('user');
      expect(result.data.content).toBe('hello');
    }
  });

  it('returns error with joined messages on failure', () => {
    const result = parseRequestBody(AddMessageSchema, {
      role: 'invalid',
      content: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('role');
    }
  });
});
