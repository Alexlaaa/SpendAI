import { ApiProperty } from '@nestjs/swagger';
import { Category } from '../../receipt/receipt.enums';
import { BudgetPeriod } from '../schemas/budget.schema';

export class BudgetResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the budget',
    example: '60d5ecb8b4850b3a8c8e8f1a',
  })
  _id: string;

  @ApiProperty({
    description: 'The ID of the user who owns the budget',
    example: '60d5ecb8b4850b3a8c8e8f1b',
  })
  userId: string;

  @ApiProperty({
    description: 'The category for the budget',
    enum: Category,
    example: Category.FOOD,
  })
  category: Category;

  @ApiProperty({ description: 'The allocated budget amount', example: 500 })
  amount: number;

  @ApiProperty({
    description: 'The period for the budget',
    enum: BudgetPeriod,
    example: BudgetPeriod.MONTHLY,
  })
  period: BudgetPeriod;

  @ApiProperty({
    description: 'The start date of the budget period',
    type: String,
    format: 'date-time',
    example: '2024-01-01T00:00:00.000Z',
  })
  startDate: string;

  @ApiProperty({
    description: 'The end date of the budget period (for custom periods)',
    type: String,
    format: 'date-time',
    required: false,
    example: '2024-01-31T23:59:59.999Z',
  })
  endDate?: string;

  @ApiProperty({
    description: 'Timestamp of budget creation',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Timestamp of last budget update',
    type: String,
    format: 'date-time',
  })
  updatedAt: string;
}
