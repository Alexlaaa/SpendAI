import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsEnum,
  IsDateString,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BudgetPeriod } from '../schemas/budget.schema';
import { Category } from '../../receipt/receipt.enums';

export class CreateBudgetDto {
  @ApiProperty({
    description: 'Category for the budget',
    enum: Category,
    example: Category.FOOD,
  })
  @IsEnum(Category)
  @IsNotEmpty()
  readonly category: Category;

  @ApiProperty({ description: 'Allocated budget amount', example: 500 })
  @IsNumber()
  @IsPositive()
  readonly amount: number;

  @ApiProperty({
    description: 'Budget period',
    enum: BudgetPeriod,
    example: BudgetPeriod.MONTHLY,
  })
  @IsEnum(BudgetPeriod)
  @IsNotEmpty()
  readonly period: BudgetPeriod;

  @ApiProperty({
    description: 'Start date of the budget period (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  readonly startDate: string;

  @ApiProperty({
    description: 'End date for custom budget periods (ISO 8601 format)',
    required: false,
    example: '2024-01-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => o.period === BudgetPeriod.CUSTOM) // Only require endDate if period is CUSTOM
  @IsNotEmpty({ message: 'endDate is required for custom budget periods' })
  readonly endDate?: string;
}
