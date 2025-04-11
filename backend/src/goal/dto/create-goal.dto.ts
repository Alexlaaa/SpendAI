import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsDateString,
  IsEnum,
  IsPositive,
  MaxLength,
  Max,
} from 'class-validator';
import { Trim } from 'class-sanitizer';
import { GoalType } from '../schemas/goal.schema';

export class CreateGoalDto {
  @ApiProperty({
    description: 'The name or description of the financial goal',
    example: 'Save for Vacation',
  })
  @IsString()
  @IsNotEmpty()
  @Trim()
  name: string;

  @ApiProperty({
    description: 'The target amount for the goal',
    example: 5000,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(0.01)
  targetAmount: number;

  @ApiProperty({
    description:
      'The current amount saved towards the goal (optional, defaults to 0)',
    example: 1000,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2, // Format options object
  })
  @Min(0)
  currentAmount?: number = 0;

  @ApiProperty({
    description: 'The deadline to achieve the goal (optional, ISO 8601 format)',
    example: '2026-12-31T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiProperty({
    description: 'The type of the goal',
    enum: GoalType,
    enumName: 'GoalType',
    example: GoalType.SHORT_TERM,
  })
  @IsEnum(GoalType)
  @IsNotEmpty()
  type: GoalType;

  @ApiProperty({
    description: 'Optional category for the goal',
    example: 'Travel',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(50)
  category?: string;

  @ApiProperty({
    description: 'Optional priority level for the goal (e.g., 1-5)',
    example: 3,
    required: false,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;
}
