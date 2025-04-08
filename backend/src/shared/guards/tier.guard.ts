import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

const TIER_LEVELS = {
  tier1: 1,
  tier2: 2,
  tier3: 3,
};

export type Tier = keyof typeof TIER_LEVELS;

@Injectable()
export class TierGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Get the required minimum tier level from the @Tier decorator
    const requiredTier = this.reflector.get<Tier>('tier', context.getHandler());

    // If no tier is required for this route, allow access
    if (!requiredTier) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If user data or tier is missing, deny access (should ideally be handled by Auth guard first)
    if (!user || !user.tier) {
      // Fix ESLint formatting
      throw new ForbiddenException(
        'Access denied. User tier information missing.',
      );
    }

    const userTierLevel = TIER_LEVELS[user.tier as Tier];
    const requiredTierLevel = TIER_LEVELS[requiredTier];

    // Check if user's tier level meets the required level
    if (userTierLevel >= requiredTierLevel) {
      return true; // Allow access if user tier is sufficient
    } else {
      // Deny access if user tier is insufficient
      throw new ForbiddenException(
        `Access denied. Requires ${requiredTier} tier or higher.`,
      );
    }
  }
}

// Decorator to apply to controllers/routes
import { SetMetadata } from '@nestjs/common';

export const RequiredTier = (tier: Tier) => SetMetadata('tier', tier);
