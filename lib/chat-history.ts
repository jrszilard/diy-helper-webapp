import { SupabaseClient } from '@supabase/supabase-js';

export function generateTitle(firstMessage: string): string {
  // Strip markdown/markers, take first ~80 chars as title
  const cleaned = firstMessage
    .replace(/---[A-Z_]+---[\s\S]*?---END_[A-Z_]+---/g, '')
    .replace(/[#*_~`]/g, '')
    .trim();
  if (cleaned.length <= 80) return cleaned;
  return cleaned.slice(0, 77) + '...';
}

export async function createConversation(
  client: SupabaseClient,
  userId: string,
  title?: string,
  projectId?: string
) {
  const { data, error } = await client
    .from('conversations')
    .insert({
      user_id: userId,
      title: title || 'New Conversation',
      project_id: projectId || null,
    })
    .select('id, title, created_at, updated_at, project_id')
    .single();

  if (error) throw error;
  return data;
}

export async function addMessage(
  client: SupabaseClient,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, unknown>
) {
  const { data, error } = await client
    .from('conversation_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      metadata: metadata || null,
    })
    .select('id, role, content, metadata, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function getConversationMessages(
  client: SupabaseClient,
  conversationId: string,
  limit = 100,
  before?: string
) {
  let query = client
    .from('conversation_messages')
    .select('id, role, content, metadata, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
