import { describe, it, expect } from 'vitest';
import { isUrlSafe, isBlockedIp } from '@/lib/security';

describe('isBlockedIp', () => {
  it('blocks IPv4 loopback', () => {
    expect(isBlockedIp('127.0.0.1')).toBe(true);
  });

  it('blocks IPv4 private ranges', () => {
    expect(isBlockedIp('10.0.0.1')).toBe(true);
    expect(isBlockedIp('172.16.0.1')).toBe(true);
    expect(isBlockedIp('192.168.1.1')).toBe(true);
  });

  it('blocks the cloud metadata IP', () => {
    expect(isBlockedIp('169.254.169.254')).toBe(true);
  });

  it('blocks 0.0.0.0/8', () => {
    expect(isBlockedIp('0.0.0.0')).toBe(true);
  });

  it('allows public IPv4', () => {
    expect(isBlockedIp('8.8.8.8')).toBe(false);
    expect(isBlockedIp('1.1.1.1')).toBe(false);
  });

  it('blocks IPv6 loopback and unspecified', () => {
    expect(isBlockedIp('::1')).toBe(true);
    expect(isBlockedIp('::')).toBe(true);
  });

  it('blocks IPv6 unique-local (fc00::/7)', () => {
    expect(isBlockedIp('fc00::1')).toBe(true);
    expect(isBlockedIp('fd00:ec2::254')).toBe(true);
  });

  it('blocks IPv6 link-local (fe80::/10)', () => {
    expect(isBlockedIp('fe80::1')).toBe(true);
  });

  it('blocks IPv4-mapped IPv6 pointing at private/metadata addresses', () => {
    expect(isBlockedIp('::ffff:10.0.0.1')).toBe(true);
    expect(isBlockedIp('::ffff:169.254.169.254')).toBe(true);
  });

  it('allows public IPv6', () => {
    expect(isBlockedIp('2606:4700:4700::1111')).toBe(false);
  });

  it('allows IPv4-mapped IPv6 pointing at a public address', () => {
    expect(isBlockedIp('::ffff:8.8.8.8')).toBe(false);
  });

  it('does not treat a regular hostname as a blocked IP', () => {
    expect(isBlockedIp('example.com')).toBe(false);
  });
});

describe('isUrlSafe', () => {
  it('allows public http(s) URLs', () => {
    expect(isUrlSafe('https://example.com/page')).toBe(true);
    expect(isUrlSafe('http://93.184.216.34/')).toBe(true);
  });

  it('blocks non-http(s) schemes', () => {
    expect(isUrlSafe('ftp://example.com')).toBe(false);
    expect(isUrlSafe('file:///etc/passwd')).toBe(false);
  });

  it('blocks localhost and metadata hostnames', () => {
    expect(isUrlSafe('http://localhost/')).toBe(false);
    expect(isUrlSafe('http://metadata.google.internal/')).toBe(false);
    expect(isUrlSafe('http://169.254.169.254/latest/meta-data/')).toBe(false);
  });

  it('blocks IPv4 private literals', () => {
    expect(isUrlSafe('http://10.0.0.5/')).toBe(false);
    expect(isUrlSafe('http://192.168.0.1/')).toBe(false);
  });

  it('blocks bracketed IPv6 private/loopback literals', () => {
    expect(isUrlSafe('http://[::1]/')).toBe(false);
    expect(isUrlSafe('http://[fc00::1]/')).toBe(false);
    expect(isUrlSafe('http://[fe80::1]/')).toBe(false);
    expect(isUrlSafe('http://[::ffff:169.254.169.254]/')).toBe(false);
  });

  it('allows a bracketed public IPv6 literal', () => {
    expect(isUrlSafe('http://[2606:4700:4700::1111]/')).toBe(true);
  });

  it('returns false for malformed URLs', () => {
    expect(isUrlSafe('not a url')).toBe(false);
  });
});
