// Shared security utilities used across server and client code.

/**
 * Escape HTML special characters to prevent XSS in HTML template strings
 * (print/PDF generation, etc.).
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitize an href value: only allow http:, https:, mailto:, fragment (#),
 * and root-relative (/) URLs.  Blocks javascript:, data:, vbscript:, etc.
 */
export function sanitizeHref(href: string | undefined): string {
  if (!href) return '#';
  const trimmed = href.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
  try {
    const url = new URL(trimmed);
    if (['http:', 'https:', 'mailto:'].includes(url.protocol)) return trimmed;
  } catch {
    // relative URLs that aren't root-relative — block them
  }
  return '#';
}

// Private IP / cloud metadata patterns for SSRF protection
const PRIVATE_IP_PATTERNS = [
  /^127\./,                     // loopback
  /^10\./,                      // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^192\.168\./,                // 192.168.0.0/16
  /^169\.254\./,                // link-local
  /^0\./,                       // 0.0.0.0/8
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  'metadata.google',
];

/**
 * SSRF guard: returns true if the URL is safe to fetch (public http/https).
 * Blocks private IPs, localhost, cloud metadata endpoints, and non-http(s) schemes.
 */
export function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;

    const hostname = parsed.hostname.toLowerCase();

    // Block known dangerous hostnames
    if (BLOCKED_HOSTNAMES.includes(hostname)) return false;

    // Block cloud metadata IP
    if (hostname === '169.254.169.254') return false;

    // Block private IP ranges
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) return false;
    }

    // Block IPv6 loopback / private (bracketed in URLs)
    if (hostname === '[::1]' || hostname === '::1') return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Strip sensitive fields (share_token) from a report record before sending
 * it over the wire in SSE events or API responses.
 */
export function sanitizeReportRecord<T extends Record<string, unknown>>(report: T): T {
  const { share_token: _, ...clean } = report;
  return clean as T;
}
