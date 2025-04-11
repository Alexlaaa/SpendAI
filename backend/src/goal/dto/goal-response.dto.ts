import { ApiProperty } from '@nestjs/swagger';
import { GoalType } from '../schemas/goal.schema';

// Define a DTO for the nested Contribution object to be used in the response
class ContributionDto {
  @ApiProperty({ description: 'Amount contributed' })
  amount: number;

  @ApiProperty({ description: 'Date of contribution' })
  date: Date;
}

export class GoalResponseDto {
  @ApiProperty({ description: 'The unique identifier of the goal' })
  id: string;

  @ApiProperty({ description: 'The name or description of the financial goal' })
  name: string;

  @ApiProperty({ description: 'The target amount for the goal' })
  targetAmount: number;

  @ApiProperty({ description: 'The current amount saved towards the goal' })
  currentAmount: number;

  @ApiProperty({
    description: 'The deadline to achieve the goal',
    required: false,
    type: Date,
  })
  deadline?: Date;

  @ApiProperty({
    description: 'The type of the goal',
    enum: GoalType,
    enumName: 'GoalType',
  })
  type: GoalType;

  // Note: userId is intentionally omitted from the response DTO

  @ApiProperty({
    description: 'Category for the goal',
    required: false,
  })
  category?: string;

  @ApiProperty({
    description: 'Priority level for the goal',
    required: false,
  })
  priority?: number;

  @ApiProperty({
    description: 'History of contributions made towards the goal',
    type: [ContributionDto], // Specify the nested DTO type for Swagger
    required: false,
  })
  contributions: ContributionDto[];

  @ApiProperty({ description: 'Timestamp of creation' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of last update' })
  updatedAt: Date;
}
