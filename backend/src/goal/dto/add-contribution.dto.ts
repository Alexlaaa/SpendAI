import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Min } from 'class-validator';

export class AddContributionDto {
  @ApiProperty({
    description: 'The amount to contribute',
    example: 100,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(0.01) // Ensure contribution is at least 1 cent
  amount: number;
}
