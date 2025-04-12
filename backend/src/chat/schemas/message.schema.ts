import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Conversation } from './conversation.schema';

export type MessageDocument = Message & Document;

export enum SenderType {
  USER = 'user',
  AI = 'ai',
}

@Schema({ timestamps: true })
export class Message {
  @Prop({
    type: String,
    enum: SenderType,
    required: true,
  })
  sender: SenderType;

  @Prop({
    type: String,
    required: true,
  })
  content: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  })
  conversationId: Types.ObjectId | Conversation;

  // Timestamps are automatically added by { timestamps: true }
  createdAt: Date;
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
