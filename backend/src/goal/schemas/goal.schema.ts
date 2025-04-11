import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { ApiProperty } from '@nestjs/swagger';

// Define the structure for a single contribution
@Schema({ _id: false, timestamps: { createdAt: 'date', updatedAt: false } })
class Contribution {
  @ApiProperty({ description: 'Amount contributed' })
  @Prop({ required: true, type: Number })
  amount: number;

  @ApiProperty({ description: 'Date of contribution' })
  @Prop({ required: true, type: Date, default: Date.now })
  date: Date;
}
const ContributionSchema = SchemaFactory.createForClass(Contribution);

export enum GoalType {
  SHORT_TERM = 'short-term',
  LONG_TERM = 'long-term',
}

@Schema({ timestamps: true })
export class Goal extends Document {
  @ApiProperty({ description: 'The unique identifier of the goal' })
  id: string; // Virtual getter

  @ApiProperty({ description: 'The name or description of the financial goal' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ description: 'The target amount for the goal' })
  @Prop({ required: true, type: Number })
  targetAmount: number;

  @ApiProperty({
    description: 'The current amount saved towards the goal',
    default: 0,
  })
  @Prop({ required: true, type: Number, default: 0 })
  currentAmount: number;

  @ApiProperty({
    description: 'The deadline to achieve the goal',
    required: false,
    type: Date,
  })
  @Prop({ type: Date, required: false })
  deadline?: Date;

  @ApiProperty({
    description: 'The type of the goal',
    enum: GoalType,
    enumName: 'GoalType',
  })
  @Prop({ required: true, enum: GoalType })
  type: GoalType;

  @ApiProperty({ description: 'The user who owns this goal' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId | User; // Link to User

  @ApiProperty({
    description: 'Category for the goal (e.g., Housing, Travel)',
    required: false,
  })
  @Prop({ type: String, required: false, trim: true })
  category?: string;

  @ApiProperty({
    description: 'Priority level for the goal (e.g., 1-5)',
    required: false,
  })
  @Prop({ type: Number, required: false })
  priority?: number;

  @ApiProperty({
    description: 'History of contributions made towards the goal',
    type: () => [Contribution], // Use function for Swagger with sub-schema
    required: false,
  })
  @Prop({ type: [ContributionSchema], default: [] }) // Use the sub-schema here
  contributions: Contribution[];

  @ApiProperty({ description: 'Timestamp of creation' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of last update' })
  updatedAt: Date;
}

export const GoalSchema = SchemaFactory.createForClass(Goal);

// Virtual getter for id
GoalSchema.virtual('id').get(function (this: Goal) {
  // Explicitly type 'this' and cast _id
  return (this._id as Types.ObjectId).toHexString();
});

// Ensure virtual fields are included when converting to JSON/Object
GoalSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id; // remove _id
  },
});
GoalSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id; // remove _id
  },
});

// Indexing for faster queries by user
GoalSchema.index({ userId: 1 });
