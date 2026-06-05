import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Link a chat conversation to a project by stamping `conversations.project_id`.
 *
 * This is the *write* side of the contract that the project restore *reads*:
 * `app/page.tsx` opens a project by querying `conversations WHERE project_id =
 * <project>`. If a project is saved from a chat but its conversation is never
 * stamped, that query finds nothing and the restore falls back to a blank chat.
 *
 * No-ops when there is no persisted conversation yet (guest mode / a fresh chat
 * that hasn't been saved server-side), since there is no row to stamp.
 */
export async function linkConversationToProject(
  client: SupabaseClient,
  conversationId: string | null | undefined,
  projectId: string,
): Promise<void> {
  if (!conversationId) return;
  await client
    .from('conversations')
    .update({ project_id: projectId })
    .eq('id', conversationId);
}
