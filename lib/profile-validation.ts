import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
});

export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
