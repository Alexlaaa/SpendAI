import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class ConversationResponseDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: '60f7e1b9b5f3f8a3c4f3d3b0',
    type: String,
  })
  @IsMongoId()
  @IsString()
  _id: string;

  @ApiProperty({
    description: 'User ID associated with the conversation',
    example: '60f7e1b9b5f3f8a3c4f3d3a9',
    type: String,
  })
  @IsMongoId()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Conversation title',
    example: 'Spending Analysis Q3',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Timestamp of conversation creation',
    example: '2023-10-27T09:00:00.000Z',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp of last update',
    example: '2023-10-27T09:30:00.000Z',
    type: Date,
  })
  updatedAt: Date;
}

export class UpdateConversationDto {
  @ApiProperty({
    description: 'New title for the conversation',
    example: 'Updated Chat Title',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;
}
