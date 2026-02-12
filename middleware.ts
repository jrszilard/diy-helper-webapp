import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Generate request ID for correlation
  const requestId = crypto.randomUUID();
  response.headers.set('x-request-id', requestId);
  // Forward to API routes via request header
  request.headers.set('x-request-id', requestId);

  const isDev = process.env.NODE_ENV === 'development';
  // Next.js requires 'unsafe-inline' for RSC hydration scripts in production.
  // In dev, 'unsafe-eval' is also needed for HMR/Turbopack.
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

  response.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self' https://*.supabase.co https://api.search.brave.com https://api.anthropic.com; frame-ancestors 'none'`
  );
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=()'
  );

  return response;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
