import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId || !isAdmin(auth.userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: correctionId } = await params;
  const supabase = getAdminClient();

  const { error } = await supabase
    .from('advisor_correction_queue')
    .update({ status: 'rejected' })
    .eq('id', correctionId)
    .eq('status', 'pending');

  if (error) {
    logger.error('Failed to reject correction', { error });
    return NextResponse.json({ error: 'Failed to reject' }, { status: 500 });
  }

  logger.info('Admin rejected correction', { correctionId });
  return NextResponse.json({ ok: true });
}
