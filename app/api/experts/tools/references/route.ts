import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { detectLicensingGap, buildLicensingAdvisory } from '@/lib/marketplace/expert-tools';

const ReferencesSchema = z.object({
  questionId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ReferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    const { data: question } = await adminClient
      .from('qa_questions')
      .select('trade_category, state')
      .eq('id', parsed.data.questionId)
      .single();

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const { data: expertProfile } = await adminClient
      .from('expert_profiles')
      .select('id')
      .eq('user_id', auth.userId)
      .single();

    let expertTrades: string[] = [];
    if (expertProfile) {
      const { data: licenses } = await adminClient
        .from('expert_licenses')
        .select('license_type')
        .eq('expert_id', expertProfile.id)
        .eq('verified', true);

      expertTrades = (licenses || []).map(l => l.license_type?.toLowerCase() || '').filter(Boolean);
    }

    const gap = detectLicensingGap(expertTrades, question.trade_category || 'general');

    let licensingRule = null;
    if (gap.hasGap && question.state && question.trade_category) {
      const { data: rule } = await adminClient
        .from('trade_licensing_rules')
        .select('state, license_type, homeowner_exemption, homeowner_exemption_notes')
        .eq('state', question.state)
        .eq('trade_category', question.trade_category)
        .single();

      licensingRule = rule;
    }

    const advisory = gap.hasGap
      ? buildLicensingAdvisory({ ...gap, licensingRule })
      : null;

    return NextResponse.json({
      hasLicensingGap: gap.hasGap,
      noLicensesOnFile: gap.noLicensesOnFile || false,
      advisory,
      questionTrade: question.trade_category,
      expertTrades,
    });
  } catch (error) {
    logger.error('Reference surfacer error', error);
    return NextResponse.json({
      hasLicensingGap: true,
      advisory: 'Licensing requirements vary by state. If this question falls outside your licensed trade, consider framing advice for homeowner self-work.',
    }, { status: 500 });
  }
}
