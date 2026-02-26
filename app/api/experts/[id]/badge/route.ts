import { NextRequest } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

/**
 * GET /api/experts/[id]/badge — Returns an SVG badge for embedding on expert websites.
 * Public endpoint, no auth required. Cached for 1 hour.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adminClient = getAdminClient();

  const { data: expert } = await adminClient
    .from('expert_profiles')
    .select('display_name, avg_rating, total_reviews, expert_level, is_active, verification_level, total_questions_answered')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (!expert) {
    return new Response('Expert not found', { status: 404 });
  }

  const level = (expert.expert_level || 'bronze') as string;
  const rating = (expert.avg_rating || 0).toFixed(1);
  const reviews = expert.total_reviews || 0;
  const answered = expert.total_questions_answered || 0;
  const verified = (expert.verification_level || 0) >= 2;
  const name = expert.display_name || 'Expert';

  // Level-specific accent colors
  const levelColors: Record<string, { bg: string; text: string; label: string }> = {
    bronze: { bg: '#D97706', text: '#92400E', label: 'Bronze' },
    silver: { bg: '#6B7280', text: '#374151', label: 'Silver' },
    gold: { bg: '#EAB308', text: '#854D0E', label: 'Gold' },
    platinum: { bg: '#7C3AED', text: '#4C1D95', label: 'Platinum' },
  };
  const lc = levelColors[level] || levelColors.bronze;

  // Stars SVG (filled vs empty)
  const fullStars = Math.round(expert.avg_rating || 0);
  const starsXml = Array.from({ length: 5 }, (_, i) => {
    const cx = 130 + i * 14;
    return i < fullStars
      ? `<polygon points="${cx},42 ${cx + 3},48 ${cx + 6},48 ${cx + 4},52 ${cx + 5},58 ${cx},55 ${cx - 5},58 ${cx - 4},52 ${cx - 6},48 ${cx - 3},48" fill="#C67B5C" stroke="none"/>`
      : `<polygon points="${cx},42 ${cx + 3},48 ${cx + 6},48 ${cx + 4},52 ${cx + 5},58 ${cx},55 ${cx - 5},58 ${cx - 4},52 ${cx - 6},48 ${cx - 3},48" fill="none" stroke="#D4C8B8" stroke-width="1"/>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="90" viewBox="0 0 280 90">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FDFBF7"/>
      <stop offset="100%" stop-color="#F5F0E6"/>
    </linearGradient>
  </defs>
  <rect width="280" height="90" rx="8" fill="url(#bg)" stroke="#D4C8B8" stroke-width="1"/>
  <!-- Logo area -->
  <rect x="8" y="8" width="36" height="36" rx="6" fill="#5D7B93"/>
  <text x="26" y="32" font-family="Arial,sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">DH</text>
  <!-- Expert name -->
  <text x="52" y="22" font-family="Arial,sans-serif" font-size="12" font-weight="bold" fill="#3E2723">${escapeXml(truncate(name, 24))}</text>
  <!-- Verified badge -->
  ${verified ? '<text x="52" y="35" font-family="Arial,sans-serif" font-size="9" fill="#5D7B93">Verified Expert</text>' : '<text x="52" y="35" font-family="Arial,sans-serif" font-size="9" fill="#7D6B5D">Expert on DIY Helper</text>'}
  <!-- Stars -->
  ${starsXml}
  <text x="202" y="53" font-family="Arial,sans-serif" font-size="9" fill="#7D6B5D">${rating} (${reviews})</text>
  <!-- Stats row -->
  <text x="12" y="72" font-family="Arial,sans-serif" font-size="9" fill="#7D6B5D">${answered} questions answered</text>
  <!-- Level badge -->
  <rect x="195" y="10" width="${lc.label.length * 7 + 16}" height="18" rx="9" fill="${lc.bg}" opacity="0.15"/>
  <text x="${195 + (lc.label.length * 7 + 16) / 2}" y="22" font-family="Arial,sans-serif" font-size="9" font-weight="bold" fill="${lc.text}" text-anchor="middle">${lc.label}</text>
  <!-- Powered by -->
  <text x="268" y="80" font-family="Arial,sans-serif" font-size="7" fill="#B0A696" text-anchor="end">diyhelper.com</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str;
}
