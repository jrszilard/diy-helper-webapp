// ── Expert Profile ──────────────────────────────────────────────────────────

export type VerificationLevel = 1 | 2 | 3;
export type VerificationStatus = 'pending' | 'under_review' | 'verified' | 'rejected';

export type Specialty =
  | 'electrical' | 'plumbing' | 'hvac' | 'carpentry'
  | 'flooring' | 'roofing' | 'concrete' | 'drywall'
  | 'painting' | 'tile' | 'landscaping' | 'general_contracting'
  | 'other';

export interface ExpertProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  profilePhotoUrl: string | null;
  city: string;
  state: string;
  zipCode: string | null;
  serviceRadiusMiles: number;
  latitude: number | null;
  longitude: number | null;
  verificationLevel: VerificationLevel;
  verificationStatus: VerificationStatus;
  hourlyRateCents: number | null;
  qaRateCents: number | null;
  avgRating: number;
  totalReviews: number;
  totalEarningsCents: number;
  responseTimeHours: number | null;
  stripeConnectAccountId: string | null;
  stripeOnboardingComplete: boolean;
  isActive: boolean;
  isAvailable: boolean;
  specialties: ExpertSpecialty[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpertSpecialty {
  id?: string;
  specialty: Specialty;
  yearsExperience: number | null;
  isPrimary: boolean;
}

export interface ExpertLicense {
  id: string;
  expertId: string;
  licenseType: string;
  licenseNumber: string;
  issuingState: string;
  expirationDate: string | null;
  verificationStatus: string;
  documentUrl: string | null;
  createdAt: string;
}

export interface ExpertInsurance {
  id: string;
  expertId: string;
  insuranceType: string;
  carrier: string | null;
  policyNumber: string | null;
  expirationDate: string | null;
  coverageAmountCents: number | null;
  documentUrl: string | null;
  verificationStatus: string;
  createdAt: string;
}

// ── Q&A ─────────────────────────────────────────────────────────────────────

export type QuestionMode = 'pool' | 'direct';
export type QAStatus = 'open' | 'claimed' | 'answered' | 'accepted' | 'expired' | 'disputed' | 'resolved';

export interface QAQuestion {
  id: string;
  diyerUserId: string;
  expertId: string | null;
  reportId: string | null;
  projectId: string | null;
  questionText: string;
  category: string;
  aiContext: ExpertContext | null;
  photoUrls: string[];
  priceCents: number;
  platformFeeCents: number;
  expertPayoutCents: number;
  status: QAStatus;
  claimedAt: string | null;
  claimExpiresAt: string | null;
  answeredAt: string | null;
  answerText: string | null;
  answerPhotos: string[];
  recommendsProfessional: boolean;
  proRecommendationReason: string | null;
  paymentIntentId: string | null;
  payoutStatus: string;
  payoutReleasedAt: string | null;
  diyerCity: string | null;
  diyerState: string | null;
  // Payment flow v2 fields
  questionMode: QuestionMode;
  targetExpertId: string | null;
  paymentMethodId: string | null;
  stripeCustomerId: string | null;
  refundId: string | null;
  refundedAt: string | null;
  markedNotHelpful: boolean;
  notHelpfulAt: string | null;
  creditAppliedCents: number;
  createdAt: string;
  updatedAt: string;
}

// ── Consultation ────────────────────────────────────────────────────────────

export type ConsultationStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Consultation {
  id: string;
  diyerUserId: string;
  expertId: string;
  reportId: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  videoRoomUrl: string | null;
  diyerNotes: string | null;
  expertSummary: string | null;
  priceCents: number;
  platformFeeCents: number;
  expertPayoutCents: number;
  status: ConsultationStatus;
  createdAt: string;
}

// ── RFP & Bidding ───────────────────────────────────────────────────────────

export type RFPStatus = 'open' | 'reviewing' | 'awarded' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
export type BidStatus = 'submitted' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';
export type MaterialsHandling = 'diyer_provides' | 'contractor_provides' | 'discuss';
export type TimelinePreference = 'asap' | 'within_2_weeks' | 'within_month' | 'flexible';
export type PermitHandling = 'contractor_pulls' | 'homeowner_pulls' | 'not_required';

export interface ProjectRFP {
  id: string;
  diyerUserId: string;
  reportId: string;
  projectId: string | null;
  title: string;
  description: string | null;
  selectedSteps: number[];
  materialsHandling: MaterialsHandling;
  timelinePreference: TimelinePreference;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  city: string;
  state: string;
  sitePhotos: string[];
  status: RFPStatus;
  expiresAt: string;
  bidCount: number;
  viewCount: number;
  createdAt: string;
}

export interface ProjectBid {
  id: string;
  rfpId: string;
  expertId: string;
  totalPriceCents: number;
  perPhasePricing: Record<string, number> | null;
  estimatedStartDate: string | null;
  estimatedDurationDays: number | null;
  scopeNotes: string | null;
  materialsApproach: string | null;
  planModifications: string | null;
  permitHandling: PermitHandling;
  messageToDiyer: string | null;
  status: BidStatus;
  createdAt: string;
}

// ── Review ──────────────────────────────────────────────────────────────────

export type ReviewType = 'qa' | 'consultation' | 'project';

export interface ExpertReview {
  id: string;
  expertId: string;
  reviewerUserId: string;
  reviewType: ReviewType;
  qaQuestionId: string | null;
  consultationId: string | null;
  rfpId: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  expertResponse: string | null;
  expertRespondedAt: string | null;
  isVisible: boolean;
  createdAt: string;
}

// ── AI Context (shared with experts) ────────────────────────────────────────

export interface ExpertContext {
  projectSummary: string;
  projectType: string;
  location: { city: string; state: string };
  relevantCodes: string;
  safetyWarnings: string[];
  proRequired: boolean;
  proRequiredReason?: string;
  skillLevel: string;
  estimatedCost: number;
  steps: Array<{ order: number; title: string; skillLevel: string }>;
  diyerExperienceLevel: string;
  fullReportShareUrl?: string;
  materialsCount?: number;
  toolsCount?: number;
}

// ── Messaging ───────────────────────────────────────────────────────────────

export interface MarketplaceMessage {
  id: string;
  qaQuestionId: string | null;
  consultationId: string | null;
  rfpId: string | null;
  bidId: string | null;
  senderUserId: string;
  recipientUserId: string;
  content: string;
  attachments: string[];
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

// ── Notification ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'qa_question_posted' | 'qa_question_claimed' | 'qa_answer_received'
  | 'qa_answer_accepted' | 'qa_review_received' | 'qa_claim_expired'
  | 'qa_not_helpful'
  | 'consultation_booked' | 'consultation_reminder' | 'consultation_summary'
  | 'rfp_new_bid' | 'rfp_bid_accepted' | 'rfp_bid_rejected'
  | 'message_received'
  | 'payment_received' | 'payment_sent' | 'payment_refunded'
  | 'expert_verified';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

// ── Subscription & Usage ────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';
export type UsageType = 'report' | 'chat_message' | 'saved_project';

export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsageRecord {
  id: string;
  userId: string;
  usageType: UsageType;
  periodStart: string;
  count: number;
}

// ── DB row helper (snake_case to camelCase mapping) ─────────────────────────

export interface ExpertProfileRow {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  profile_photo_url: string | null;
  city: string;
  state: string;
  zip_code: string | null;
  service_radius_miles: number;
  latitude: number | null;
  longitude: number | null;
  verification_level: number;
  verification_status: string;
  hourly_rate_cents: number | null;
  qa_rate_cents: number | null;
  avg_rating: number;
  total_reviews: number;
  total_earnings_cents: number;
  response_time_hours: number | null;
  stripe_connect_account_id: string | null;
  stripe_onboarding_complete: boolean;
  is_active: boolean;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  expert_specialties?: Array<{
    id: string;
    specialty: string;
    years_experience: number | null;
    is_primary: boolean;
  }>;
}

export function toExpertProfile(row: ExpertProfileRow): ExpertProfile {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    bio: row.bio,
    profilePhotoUrl: row.profile_photo_url,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    serviceRadiusMiles: row.service_radius_miles,
    latitude: row.latitude,
    longitude: row.longitude,
    verificationLevel: row.verification_level as VerificationLevel,
    verificationStatus: row.verification_status as VerificationStatus,
    hourlyRateCents: row.hourly_rate_cents,
    qaRateCents: row.qa_rate_cents,
    avgRating: Number(row.avg_rating),
    totalReviews: row.total_reviews,
    totalEarningsCents: Number(row.total_earnings_cents),
    responseTimeHours: row.response_time_hours ? Number(row.response_time_hours) : null,
    stripeConnectAccountId: row.stripe_connect_account_id,
    stripeOnboardingComplete: row.stripe_onboarding_complete,
    isActive: row.is_active,
    isAvailable: row.is_available,
    specialties: (row.expert_specialties || []).map(s => ({
      id: s.id,
      specialty: s.specialty as Specialty,
      yearsExperience: s.years_experience,
      isPrimary: s.is_primary,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
