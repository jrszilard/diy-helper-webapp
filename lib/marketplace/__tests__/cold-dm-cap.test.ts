import { describe, it, expect } from 'vitest';
import { exceedsColdDmCap } from '@/lib/marketplace/messaging';

describe('exceedsColdDmCap', () => {
  const cap = 10;

  it('never caps a message tied to a marketplace context (qa/consultation/rfp/bid)', () => {
    expect(exceedsColdDmCap({ hasContext: true, hasExistingRelationship: false, distinctNewRecipientsToday: 999, cap })).toBe(false);
  });

  it('never caps a reply within an existing conversation', () => {
    expect(exceedsColdDmCap({ hasContext: false, hasExistingRelationship: true, distinctNewRecipientsToday: 999, cap })).toBe(false);
  });

  it('allows a cold DM to a new recipient while under the daily cap', () => {
    expect(exceedsColdDmCap({ hasContext: false, hasExistingRelationship: false, distinctNewRecipientsToday: 9, cap })).toBe(false);
  });

  it('blocks a cold DM to a new recipient once the daily cap is reached', () => {
    expect(exceedsColdDmCap({ hasContext: false, hasExistingRelationship: false, distinctNewRecipientsToday: 10, cap })).toBe(true);
  });
});
