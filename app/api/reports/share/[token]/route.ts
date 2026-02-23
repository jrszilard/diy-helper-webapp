import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

// GET /api/reports/share/[token] — Public report access (bypasses RLS)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const rateLimitResult = checkRateLimit(req, null, 'share-public');
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      );
    }

    if (!token || token.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Invalid share token' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client to bypass RLS for public access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!serviceRoleKey) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: report, error } = await serviceClient
      .from('project_reports')
      .select('id, title, sections, summary, total_cost, created_at')
      .eq('share_token', token)
      .eq('share_enabled', true)
      .single();

    if (error || !report) {
      return new Response(
        JSON.stringify({ error: 'Report not found or sharing is disabled' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ report }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        },
      }
    );
  } catch (error) {
    logger.error('Shared report fetch error', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
