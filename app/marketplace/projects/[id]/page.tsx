import { redirect, notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/supabase-admin';
import { isValidUUID } from '@/lib/validation';

// Placeholder route that resolves a graduated RFP back to its source Q&A.
// The full RFP/bidding detail page is not built yet (the "Project leads" feature
// is on the punch list). Until then, surface the source Q&A — which already
// shows the "graduated" notice — instead of 404-ing on the notification link.
export default async function ProjectRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    notFound();
  }

  const adminClient = getAdminClient();
  const { data } = await adminClient
    .from('project_rfps')
    .select('source_qa_question_id')
    .eq('id', id)
    .single();

  if (!data?.source_qa_question_id) {
    notFound();
  }

  redirect(`/marketplace/qa/${data.source_qa_question_id}`);
}
