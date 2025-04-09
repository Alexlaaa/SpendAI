import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Tier } from '../../shared/guards/tier.guard'; // Assuming Tier type is defined here

export class UpdateUserTierDto {
  @ApiProperty({
    description: 'The new subscription tier for the user',
    enum: ['tier1', 'tier2', 'tier3'],
    example: 'tier2',
    required: true,
  })
  @IsEnum(['tier1', 'tier2', 'tier3'], { message: 'Invalid tier value' })
  readonly tier: Tier;
}
