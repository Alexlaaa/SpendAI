import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { SenderType } from '../schemas/message.schema';

export class MessageResponseDto {
  @ApiProperty({
    description: 'Message ID',
    example: '60f7e1b9b5f3f8a3c4f3d3b1',
    type: String,
  })
  @IsMongoId()
  @IsString()
  _id: string;

  @ApiProperty({
    enum: SenderType,
    description: 'Sender type (user or ai)',
    example: SenderType.USER,
  })
  @IsEnum(SenderType)
  sender: SenderType;

  @ApiProperty({
    description: 'Message content',
    example: 'What was my total spending last month?',
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Conversation ID this message belongs to',
    example: '60f7e1b9b5f3f8a3c4f3d3b0',
    type: String,
  })
  @IsMongoId()
  @IsString()
  conversationId: string;

  @ApiProperty({
    description: 'Timestamp of message creation',
    example: '2023-10-27T10:00:00.000Z',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp of last update',
    example: '2023-10-27T10:00:00.000Z',
    type: Date,
  })
  updatedAt: Date;
}

export class CreateMessageDto {
  @ApiProperty({
    description: 'Message content from the user',
    example: 'What was my total spending last month?',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
