import { marketplace as marketplaceConfig } from '@/lib/config';
import { isFeatureEnabled } from '@/lib/feature-flags';
import type { DifficultyResult } from '@/lib/marketplace/difficulty-scorer';

// ── Bidding Constants ───────────────────────────────────────────────────────

/** Minimum difficulty score to auto-enter bidding mode */
export const BIDDING_DIFFICULTY_THRESHOLD = 7;

/** Maximum number of bids before auto-closing bid window */
export const MAX_BIDS_BEFORE_CLOSE = 3;

/** Minimum bid price in cents */
export const MIN_BID_CENTS = 1500; // $15

/** Maximum bid price in cents */
export const MAX_BID_CENTS = 15000; // $150

// ── Bidding Mode Detection ──────────────────────────────────────────────────

/**
 * Determine if a question should enter bidding mode based on difficulty.
 * Only specialist-tier questions (difficulty 7+) qualify.
 * Feature-flag gated via `expertBidding`.
 */
export function shouldEnterBiddingMode(
  difficulty: DifficultyResult,
  userId?: string,
): boolean {
  if (!isFeatureEnabled('expertBidding', userId)) return false;
  return difficulty.score >= BIDDING_DIFFICULTY_THRESHOLD;
}

/**
 * Calculate the bid deadline from now.
 */
export function calculateBidDeadline(): string {
  const now = new Date();
  const deadline = new Date(now.getTime() + marketplaceConfig.bidWindowHours * 60 * 60 * 1000);
  return deadline.toISOString();
}

// ── Bid Validation ──────────────────────────────────────────────────────────

export interface BidValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a bid's proposed price against constraints.
 */
export function validateBidPrice(proposedPriceCents: number): BidValidationResult {
  if (proposedPriceCents < MIN_BID_CENTS) {
    return { valid: false, error: `Minimum bid is $${(MIN_BID_CENTS / 100).toFixed(0)}` };
  }
  if (proposedPriceCents > MAX_BID_CENTS) {
    return { valid: false, error: `Maximum bid is $${(MAX_BID_CENTS / 100).toFixed(0)}` };
  }
  return { valid: true };
}

/**
 * Calculate platform fee and expert payout for a bid price.
 */
export function calculateBidPricing(proposedPriceCents: number): {
  platformFeeCents: number;
  expertPayoutCents: number;
} {
  const platformFeeCents = Math.round(proposedPriceCents * marketplaceConfig.platformFeeRate);
  return {
    platformFeeCents,
    expertPayoutCents: proposedPriceCents - platformFeeCents,
  };
}

// ── Bid Window Status ───────────────────────────────────────────────────────

export interface BidWindowStatus {
  isOpen: boolean;
  reason: 'active' | 'deadline_passed' | 'max_bids_reached' | 'bid_accepted';
  timeRemainingMs?: number;
}

/**
 * Check if the bidding window is still open for a question.
 */
export function checkBidWindowStatus(params: {
  bidDeadline: string | null;
  bidCount: number;
  acceptedBidId: string | null;
  status: string;
}): BidWindowStatus {
  const { bidDeadline, bidCount, acceptedBidId, status } = params;

  // If a bid is already accepted
  if (acceptedBidId) {
    return { isOpen: false, reason: 'bid_accepted' };
  }

  // If question is no longer open
  if (status !== 'open') {
    return { isOpen: false, reason: 'bid_accepted' };
  }

  // Check max bids
  if (bidCount >= MAX_BIDS_BEFORE_CLOSE) {
    return { isOpen: false, reason: 'max_bids_reached' };
  }

  // Check deadline
  if (bidDeadline) {
    const now = Date.now();
    const deadline = new Date(bidDeadline).getTime();
    if (now >= deadline) {
      return { isOpen: false, reason: 'deadline_passed' };
    }
    return { isOpen: true, reason: 'active', timeRemainingMs: deadline - now };
  }

  return { isOpen: true, reason: 'active' };
}
