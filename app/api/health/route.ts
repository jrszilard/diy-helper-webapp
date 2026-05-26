import { NextResponse } from 'next/server';

// Liveness probe for uptime monitoring / Sentry error-rate alerts. Intentionally
// dependency-free: returns 200 as long as the app is serving requests. Keep it
// cheap and side-effect-free — don't gate it on DB/3rd-party reachability, or a
// transient upstream blip would page on a false "app down".
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  });
}
