export const SPECIALTIES = [
  'electrical',
  'plumbing',
  'hvac',
  'carpentry',
  'flooring',
  'roofing',
  'concrete',
  'drywall',
  'painting',
  'tile',
  'landscaping',
  'general_contracting',
  'other',
] as const;

export const SPECIALTY_LABELS: Record<string, string> = {
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  hvac: 'HVAC',
  carpentry: 'Carpentry',
  flooring: 'Flooring',
  roofing: 'Roofing',
  concrete: 'Concrete',
  drywall: 'Drywall',
  painting: 'Painting',
  tile: 'Tile',
  landscaping: 'Landscaping',
  general_contracting: 'General Contracting',
  other: 'Other',
};

// ── Q&A Pricing ─────────────────────────────────────────────────────────────

export const QA_PRICING = {
  generalCents: 500,         // $5
  codeSpecificCents: 800,    // $8
  photoAssessmentCents: 1000, // $10
  urgentCents: 1500,         // $15
  platformFeeRate: 0.20,     // 20%
} as const;

// ── Q&A Pricing V2 (Dynamic) ──────────────────────────────────────────────

export { QA_PRICING_V2 } from '@/lib/marketplace/pricing-engine';

// ── Consultation Pricing ────────────────────────────────────────────────────

export const CONSULTATION_PRICING = {
  platformFeeRate: 0.15,   // 15%
  minDurationMinutes: 15,
  maxDurationMinutes: 60,
  durations: [15, 30, 60] as const,
} as const;

// ── Bidding ─────────────────────────────────────────────────────────────────

export const BIDDING_COMMISSION = {
  tier1: { upTo: 1000000, rate: 0.10 },     // 10% on first $10K
  tier2: { upTo: 2500000, rate: 0.07 },      // 7% on $10K-$25K
  tier3: { above: 2500000, rate: 0.05 },     // 5% above $25K
  repeatCustomerRate: 0.05,                   // 5% flat for re-hires
} as const;

// ── Timing (read from config / env vars) ────────────────────────────────────

import { marketplace as marketplaceConfig } from '@/lib/config';

export const CLAIM_EXPIRY_HOURS = marketplaceConfig.claimExpiryHours;
export const AUTO_ACCEPT_HOURS = marketplaceConfig.autoAcceptHours;
export const PAYOUT_HOLD_HOURS = marketplaceConfig.payoutHoldHours;
export const RFP_DEFAULT_DAYS = 7;

// ── Consultation Cancellation Policy ────────────────────────────────────────

export const CANCELLATION_POLICY = {
  fullRefundHours: 4,      // 4+ hours before = full refund
  partialRefundRate: 0.50, // <4 hours = 50% refund
  noShowRefundRate: 0.00,  // no-show = full charge
} as const;
