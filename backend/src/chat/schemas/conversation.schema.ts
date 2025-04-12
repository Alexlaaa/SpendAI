import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '@/user/schemas/user.schema';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId | User;

  @Prop({ type: String, default: 'New Chat' })
  title: string;

  // Timestamps are automatically added by { timestamps: true }
  createdAt: Date;
  updatedAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
