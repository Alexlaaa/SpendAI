// user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import * as argon2 from 'argon2';

export enum UserTier {
  TIER1 = 'tier1',
  TIER2 = 'tier2',
  TIER3 = 'tier3',
}

export type UserDocument = User & Document;

@Schema()
export class User {
  @ApiProperty({ description: 'Unique username of the user', example: 'user' })
  @Prop({ unique: true, required: true })
  username: string;

  @ApiProperty({
    description: 'Email of the user',
    example: 'user@example.com',
  })
  @Prop({ unique: true, required: true })
  email: string;

  @ApiProperty({ description: 'First name of the user', example: 'Mike' })
  @Prop({ required: true })
  firstName: string;

  @ApiProperty({ description: 'Last name of the user', example: 'Ross' })
  @Prop({ required: true })
  lastName: string;

  @ApiProperty({ description: 'Profile image stored as binary data' })
  @Prop({ type: Buffer })
  image: Buffer;

  @ApiProperty({ description: 'Hashed password of the user', writeOnly: true })
  @Prop({ required: true })
  password: string;

  @ApiProperty({ description: 'Security question for password recovery' })
  @Prop({ required: true })
  securityQuestion: string;

  @ApiProperty({ description: 'Hashed answer to the security question' })
  @Prop({ required: true })
  securityAnswer: string;

  @ApiProperty({ description: 'Password reset token', writeOnly: true })
  @Prop()
  passwordResetToken: string;

  @ApiProperty({
    description: 'Expiration date of the password reset token',
    writeOnly: true,
  })
  @Prop()
  passwordResetTokenExpiry: Date;

  @ApiProperty({ description: 'API tokens for external services' })
  @Prop({ type: Object })
  apiToken?: {
    defaultModel: string;
    geminiKey: string;
    openaiKey: string;
  };

  @ApiProperty({
    description: 'Subscription tier of the user',
    enum: UserTier,
    enumName: 'UserTier',
    default: UserTier.TIER1,
  })
  @Prop({
    type: String,
    enum: Object.values(UserTier), // Use enum values for Mongoose enum validation
    default: UserTier.TIER1,
    required: true,
  })
  tier: UserTier;

  @ApiProperty({
    description: 'Billing cycle for the subscription',
    enum: ['monthly', 'annual'],
    required: false,
    default: 'monthly',
  })
  @Prop({
    type: String,
    enum: ['monthly', 'annual'],
    default: 'monthly', // Default to monthly if not specified
  })
  billingCycle?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Mongoose pre-save middleware to hash password and security answer if needed
UserSchema.pre<UserDocument>('save', async function (next) {
  const user = this as UserDocument;

  // Hash the password if it has been modified and is not already hashed
  if (user.isModified('password') && !user.password.startsWith('$argon2')) {
    user.password = await argon2.hash(user.password);
  }

  // Hash the security answer if it has been modified and is not already hashed
  if (
    user.isModified('securityAnswer') &&
    !user.securityAnswer.startsWith('$argon2')
  ) {
    user.securityAnswer = await argon2.hash(user.securityAnswer.toLowerCase());
  }

  next();
});
