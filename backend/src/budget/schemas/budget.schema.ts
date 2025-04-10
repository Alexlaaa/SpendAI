import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { Category } from '../../receipt/receipt.enums';

export type BudgetDocument = Budget & Document;

export enum BudgetPeriod {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

@Schema({ timestamps: true })
export class Budget {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  @ApiProperty({
    type: String,
    description: 'User ID associated with the budget',
  })
  userId: User;

  @Prop({ required: true, enum: Category })
  @ApiProperty({ enum: Category, description: 'Budget category' })
  category: Category;

  @Prop({ required: true, type: Number })
  @ApiProperty({ type: Number, description: 'Allocated budget amount' })
  amount: number;

  @Prop({ required: true, enum: BudgetPeriod, default: BudgetPeriod.MONTHLY })
  @ApiProperty({ enum: BudgetPeriod, description: 'Budget period' })
  period: BudgetPeriod;

  @Prop({ required: true, type: Date })
  @ApiProperty({ type: Date, description: 'Start date of the budget period' })
  startDate: Date;

  @Prop({ type: Date }) // Optional: Only needed for custom periods
  @ApiProperty({
    type: Date,
    required: false,
    description: 'End date for custom budget periods',
  })
  endDate?: Date;
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);
