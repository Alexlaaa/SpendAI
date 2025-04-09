import { ApiProperty } from '@nestjs/swagger';
// Add IsOptional
import { IsEnum, IsOptional } from 'class-validator';
import { Tier } from '../../shared/guards/tier.guard';

export class UpdateUserTierDto {
  @ApiProperty({
    description: 'The new subscription tier for the user',
    enum: ['tier1', 'tier2', 'tier3'],
    example: 'tier2',
    required: true,
  })
  @IsEnum(['tier1', 'tier2', 'tier3'], { message: 'Invalid tier value' })
  readonly tier: Tier;

  @ApiProperty({
    description:
      'The new billing cycle for the subscription (optional, defaults based on tier logic if not provided)',
    enum: ['monthly', 'annual'],
    example: 'annual',
    required: false,
  })
  @IsOptional()
  @IsEnum(['monthly', 'annual'], { message: 'Invalid billing cycle value' })
  readonly billingCycle?: 'monthly' | 'annual';
}
