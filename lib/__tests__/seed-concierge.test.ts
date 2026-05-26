import { describe, it, expect } from 'vitest';
import { buildCheatSheet, emailFor, ROSTER } from '../../scripts/seed-concierge-experts.mjs';

describe('concierge seed helpers', () => {
  it('builds + sub-addressed emails on the catchall mailbox', () => {
    expect(emailFor({ key: 'electrician' })).toBe(
      'fixeratortestaccounts+electrician@madebylakeshore.com'
    );
  });

  it('has 4 roster entries, each with the required fields', () => {
    expect(ROSTER).toHaveLength(4);
    for (const e of ROSTER) {
      expect(e.key).toBeTruthy();
      expect(e.displayName).toBeTruthy();
      expect(e.specialty).toBeTruthy();
      expect(e.bio).toBeTruthy();
      expect(e.licenseType).toBeTruthy();
      expect(['insured', 'bonded_insured']).toContain(e.insuranceStatus);
    }
  });

  it('cheat-sheet includes the password, sign-in URL, and every account email', () => {
    const md = buildCheatSheet(ROSTER, { password: 'pw-123', signinUrl: 'https://x/?signIn=true' });
    expect(md).toContain('pw-123');
    expect(md).toContain('https://x/?signIn=true');
    for (const e of ROSTER) expect(md).toContain(emailFor(e));
    expect(md).toMatch(/gitignored/i);
  });
});
