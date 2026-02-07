import { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://localhost:3000',
];

const VERCEL_ORIGIN_REGEX = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (VERCEL_ORIGIN_REGEX.test(origin)) return true;
  return false;
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
