import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import type { ReportSection, PricedMaterial, DesignMaterial } from '@/lib/agents/types';

// POST /api/reports/[id]/apply — Apply report materials to a project's shopping list
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthFromRequest(req);

    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const rateLimitResult = checkRateLimit(req, auth.userId, 'agents');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    // Fetch the report
    const { data: report, error: reportError } = await auth.supabaseClient
      .from('project_reports')
      .select('*')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .single();

    if (reportError || !report) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Report not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Try sourcing phase first (legacy pipeline), fall back to plan phase (new pipeline)
    const { data: sourcingPhase } = await auth.supabaseClient
      .from('agent_phases')
      .select('output_data')
      .eq('run_id', report.run_id)
      .eq('phase', 'sourcing')
      .single();

    let planPhase = null;
    if (!sourcingPhase) {
      const { data } = await auth.supabaseClient
        .from('agent_phases')
        .select('output_data')
        .eq('run_id', report.run_id)
        .eq('phase', 'plan')
        .single();
      planPhase = data;
    }

    const body = await req.json().catch(() => ({}));
    let targetProjectId = body.projectId || report.project_id;

    // Infer category from report title
    const inferCategory = (title: string): string => {
      const patterns: [string, RegExp][] = [
        ['electrical', /outlet|wire|circuit|switch|light|fan|electrical|panel|breaker|socket|volt/i],
        ['flooring', /tile|floor|carpet|laminate|hardwood|vinyl|grout/i],
        ['plumbing', /pipe|faucet|toilet|sink|drain|shower|bath|plumb/i],
        ['structural', /wall|beam|joist|foundation|drywall|frame|stud|ceiling/i],
        ['painting', /paint|prime|stain|finish|coat|brush|roller/i],
        ['outdoor', /deck|fence|patio|garden|landscap|yard|outdoor|pergola|shed/i],
      ];
      for (const [category, pattern] of patterns) {
        if (pattern.test(title)) return category;
      }
      return 'other';
    };

    // If no project exists, create one
    if (!targetProjectId) {
      const { data: project, error: projectError } = await auth.supabaseClient
        .from('projects')
        .insert({
          user_id: auth.userId,
          name: report.title,
          description: (report.sections as ReportSection[])
            .find((s: ReportSection) => s.type === 'overview')?.content?.slice(0, 500) || report.summary || '',
          category: inferCategory(report.title),
        })
        .select()
        .single();

      if (projectError || !project) {
        logger.error('Failed to create project', projectError);
        return applyCorsHeaders(req, new Response(
          JSON.stringify({ error: 'Failed to create project' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      targetProjectId = project.id;

      // Link the report and run to the project
      await auth.supabaseClient
        .from('project_reports')
        .update({ project_id: targetProjectId })
        .eq('id', id);

      await auth.supabaseClient
        .from('agent_runs')
        .update({ project_id: targetProjectId })
        .eq('id', report.run_id);
    }

    // Extract materials — try legacy sourcing phase first, then new plan phase
    const sourcingData = sourcingPhase?.output_data as { pricedMaterials?: PricedMaterial[] } | null;
    const pricedMaterials = sourcingData?.pricedMaterials || [];

    const planData = planPhase?.output_data as { materials?: DesignMaterial[] } | null;
    const designMaterials = planData?.materials || [];

    if (pricedMaterials.length === 0 && designMaterials.length === 0) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'No materials found in report' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Insert materials into shopping_list_items
    const items = pricedMaterials.length > 0
      ? pricedMaterials.map((m: PricedMaterial) => ({
          project_id: targetProjectId,
          user_id: auth.userId,
          product_name: m.name,
          quantity: parseInt(m.quantity) || 1,
          category: m.category,
          required: m.required,
          price: m.bestPrice || m.estimatedPrice || null,
          purchased: false,
          notes: m.bestStore ? `Best price at ${m.bestStore}` : null,
        }))
      : designMaterials.map((m: DesignMaterial) => ({
          project_id: targetProjectId,
          user_id: auth.userId,
          product_name: m.name,
          quantity: parseInt(m.quantity) || 1,
          category: m.category,
          required: m.required,
          price: m.estimatedPrice || null,
          purchased: false,
          notes: m.notes || null,
        }));

    const { error: insertError } = await auth.supabaseClient
      .from('shopping_list_items')
      .insert(items);

    if (insertError) {
      logger.error('Failed to insert shopping list items', insertError);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to save materials to shopping list' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        success: true,
        projectId: targetProjectId,
        itemCount: items.length,
        message: `Saved ${items.length} materials to your project shopping list.`,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    logger.error('Apply report error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}

