import { UserTier } from '@/user/schemas/user.schema';

// Defines the structure of the user object injected by the @User decorator,
// based on the JWT payload content.
export interface AuthenticatedUserPayload {
  userId: string; // MongoDB ObjectId as a string
  email?: string;
  tier: UserTier;
  billingCycle?: 'monthly' | 'annual';
}
