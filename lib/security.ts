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

function isBlockedIPv4(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

/**
 * Returns true if the given address literal is a private, loopback, link-local,
 * unique-local, unspecified, or cloud-metadata IP (IPv4 or IPv6). Returns false
 * for public IPs and for non-IP strings (e.g. regular hostnames).
 *
 * Used both for URL literals and — critically — for DNS-resolved addresses, so a
 * public hostname that resolves to a private IP is still rejected (see webFetch).
 */
export function isBlockedIp(host: string): boolean {
  const ip = host.toLowerCase();

  // Dotted IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return isBlockedIPv4(ip);

  if (!ip.includes(':')) return false; // not an IP literal

  // IPv6 below.
  if (ip === '::1' || ip === '::') return true; // loopback / unspecified

  // IPv4-mapped IPv6 in dotted form (::ffff:a.b.c.d).
  const mappedDotted = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedDotted) return isBlockedIPv4(mappedDotted[1]);

  // IPv4-mapped IPv6 in hex form (::ffff:HHHH:HHHH) — this is how the WHATWG URL
  // parser normalizes it (e.g. 169.254.169.254 -> ::ffff:a9fe:a9fe). Decode the
  // two trailing hextets back to dotted IPv4.
  const mappedHex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    const ipv4 = `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
    return isBlockedIPv4(ipv4);
  }

  // Classify by the leading hextet value.
  const firstHextet = ip.split(':')[0];
  if (!firstHextet) return false;
  const val = parseInt(firstHextet, 16);
  if (Number.isNaN(val)) return false;
  if (val >= 0xfc00 && val <= 0xfdff) return true; // fc00::/7  unique-local
  if (val >= 0xfe80 && val <= 0xfebf) return true; // fe80::/10 link-local

  return false;
}

/**
 * SSRF guard: returns true if the URL is safe to fetch (public http/https).
 * Blocks private IPs, localhost, cloud metadata endpoints, and non-http(s) schemes.
 *
 * NOTE: this only validates the URL literal. For server-side fetches that follow
 * redirects, also re-check each hop AND resolve the hostname to verify it doesn't
 * point at a private address (DNS rebinding) — see webFetch in lib/search.ts.
 */
export function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;

    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.includes(hostname)) return false;

    // Strip IPv6 brackets (new URL keeps them, e.g. "[::1]") before IP analysis.
    const host = hostname.replace(/^\[/, '').replace(/\]$/, '');
    if (isBlockedIp(host)) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Strip sensitive fields (share_token) from a report record before sending
 * it over the wire in SSE events or API responses.
 */
export function sanitizeReportRecord<T extends Record<string, unknown>>(report: T): Omit<T, 'share_token'> {
  const { share_token: _, ...clean } = report;
  return clean as Omit<T, 'share_token'>;
}
