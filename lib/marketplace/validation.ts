import { z } from 'zod';
import { SPECIALTIES } from './constants';

// ── Expert Registration ─────────────────────────────────────────────────────

export const ExpertRegistrationSchema = z.object({
  displayName: z.string().min(2, 'Display name is required').max(100),
  bio: z.string().max(500).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(50),
  zipCode: z.string().max(10).optional(),
  serviceRadiusMiles: z.number().int().min(1).max(500).default(50),
  hourlyRateCents: z.number().int().min(0).max(50000).optional(),
  qaRateCents: z.number().int().min(0).max(5000).optional(),
  specialties: z.array(z.object({
    specialty: z.enum(SPECIALTIES as unknown as [string, ...string[]]),
    yearsExperience: z.number().int().min(0).max(60).optional(),
    isPrimary: z.boolean().default(false),
  })).min(1, 'At least one specialty is required').max(5),
});

export const UpdateExpertProfileSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(50).optional(),
  zipCode: z.string().max(10).optional(),
  serviceRadiusMiles: z.number().int().min(1).max(500).optional(),
  hourlyRateCents: z.number().int().min(0).max(50000).optional(),
  qaRateCents: z.number().int().min(0).max(5000).optional(),
  isAvailable: z.boolean().optional(),
  profilePhotoUrl: z.string().url().max(500).optional(),
  specialties: z.array(z.object({
    specialty: z.enum(SPECIALTIES as unknown as [string, ...string[]]),
    yearsExperience: z.number().int().min(0).max(60).optional(),
    isPrimary: z.boolean().default(false),
  })).min(1).max(5).optional(),
});

// ── Q&A ─────────────────────────────────────────────────────────────────────

export const SubmitQuestionSchema = z.object({
  questionText: z.string().min(20, 'Please provide more detail').max(500),
  category: z.enum(SPECIALTIES as unknown as [string, ...string[]]),
  reportId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  photoUrls: z.array(z.string().url()).max(3).default([]),
  diyerCity: z.string().max(100).optional(),
  diyerState: z.string().max(50).optional(),
});

export const AnswerQuestionSchema = z.object({
  answerText: z.string().min(50, 'Please provide a more detailed answer').max(2000),
  answerPhotos: z.array(z.string().url()).max(3).default([]),
  recommendsProfessional: z.boolean().default(false),
  proRecommendationReason: z.string().max(500).optional(),
});

// ── Reviews ─────────────────────────────────────────────────────────────────

export const SubmitReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  body: z.string().max(1000).optional(),
});

// ── Messaging ───────────────────────────────────────────────────────────────

export const SendMessageSchema = z.object({
  recipientUserId: z.string().uuid(),
  content: z.string().min(1, 'Message cannot be empty').max(2000),
  qaQuestionId: z.string().uuid().optional(),
  consultationId: z.string().uuid().optional(),
  rfpId: z.string().uuid().optional(),
  bidId: z.string().uuid().optional(),
});

// ── Subscriptions ───────────────────────────────────────────────────────────

export const CreateCheckoutSchema = z.object({
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export type ExpertRegistration = z.infer<typeof ExpertRegistrationSchema>;
export type UpdateExpertProfile = z.infer<typeof UpdateExpertProfileSchema>;
export type SubmitQuestion = z.infer<typeof SubmitQuestionSchema>;
export type AnswerQuestion = z.infer<typeof AnswerQuestionSchema>;
export type SubmitReview = z.infer<typeof SubmitReviewSchema>;
export type SendMessage = z.infer<typeof SendMessageSchema>;
