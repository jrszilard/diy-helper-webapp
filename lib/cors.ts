import { NextRequest } from 'next/server';
import { cors as corsConfig } from '@/lib/config';

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (corsConfig.allowedOrigins.includes(origin)) return true;
  if (corsConfig.vercelRegex.test(origin)) return true;
  return false;
}

/**
 * Get a validated origin from the request, falling back to the first
 * configured allowed origin. Prevents open-redirect via Origin header.
 */
export function getSafeOrigin(req: NextRequest): string {
  const origin = req.headers.get('origin');
  if (origin && isOriginAllowed(origin)) return origin;
  return corsConfig.allowedOrigins[0] || 'http://localhost:3000';
}

/**
 * Validate that a URL's origin is in the allowed list.
 * Returns the URL if safe, or a fallback path-only URL otherwise.
 */
export function validateRedirectUrl(url: string, fallback: string): string {
  try {
    const parsed = new URL(url);
    if (isOriginAllowed(parsed.origin)) return url;
  } catch {
    // not a valid URL
  }
  return fallback;
}

export function getCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin');

  if (!isOriginAllowed(origin)) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin!,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCorsOptions(req: NextRequest): Response {
  const headers = getCorsHeaders(req);

  return new Response(null, {
    status: 204,
    headers,
  });
}

export function applyCorsHeaders(req: NextRequest, response: Response): Response {
  const corsHeaders = getCorsHeaders(req);

  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}
