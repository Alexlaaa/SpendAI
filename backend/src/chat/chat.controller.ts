import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateMessageDto, MessageResponseDto } from './dto/message.dto';
import {
  ConversationResponseDto,
  UpdateConversationDto,
} from './dto/conversation.dto';
import { RequiredTier, TierGuard } from '@/shared/guards/tier.guard';
import { UserTier } from '@/user/schemas/user.schema';
import { User } from '@/user/user.decorator';
import { AuthenticatedUserPayload } from '@/shared/types/auth.types';
import { ParseObjectIdPipe } from '@/shared/pipes/parse-object-id.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(TierGuard)
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  // --- Conversation Endpoints ---

  @Post('conversations')
  @RequiredTier(UserTier.TIER3)
  @ApiOperation({ summary: 'Create a new chat conversation' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully.',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Tier requirement not met.',
  })
  createConversation(
    @User() user: AuthenticatedUserPayload,
  ): Promise<ConversationResponseDto> {
    this.logger.log(
      `Received request to create conversation for user ${user.userId}`,
    );
    return this.chatService.createConversation(user);
  }

  @Get('conversations')
  @RequiredTier(UserTier.TIER3)
  @ApiOperation({ summary: 'Get all conversations for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of conversations.',
    type: [ConversationResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Tier requirement not met.',
  })
  getUserConversations(
    @User() user: AuthenticatedUserPayload,
  ): Promise<ConversationResponseDto[]> {
    this.logger.log(
      `Received request to get conversations for user ${user.userId}`,
    );
    return this.chatService.getUserConversations(user);
  }

  @Get('conversations/:id')
  @RequiredTier(UserTier.TIER3)
  @ApiOperation({ summary: 'Get a specific conversation by ID' })
  @ApiParam({ name: 'id', description: 'Conversation ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Conversation details.',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden. Tier requirement not met or conversation not owned by user.',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found.' })
  getConversationById(
    @User() user: AuthenticatedUserPayload,
    @Param('id', ParseObjectIdPipe) conversationId: string,
  ): Promise<ConversationResponseDto> {
    this.logger.log(
      `Received request to get conversation ${conversationId} for user ${user.userId}`,
    );
    return this.chatService.getConversationById(user, conversationId);
  }

  @Patch('conversations/:id')
  @RequiredTier(UserTier.TIER3)
  @ApiOperation({ summary: 'Update a conversation (e.g., rename)' })
  @ApiParam({ name: 'id', description: 'Conversation ID', type: String })
  @ApiBody({ type: UpdateConversationDto })
  @ApiResponse({
    status: 200,
    description: 'Conversation updated successfully.',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden. Tier requirement not met or conversation not owned by user.',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found.' })
  updateConversation(
    @User() user: AuthenticatedUserPayload,
    @Param('id', ParseObjectIdPipe) conversationId: string,
    @Body() updateConversationDto: UpdateConversationDto,
  ): Promise<ConversationResponseDto> {
    this.logger.log(
      `Received request to update conversation ${conversationId} for user ${user.userId}`,
    );
    return this.chatService.updateConversation(
      user,
      conversationId,
      updateConversationDto,
    );
  }

  @Delete('conversations/:id')
  @RequiredTier(UserTier.TIER3)
  @HttpCode(HttpStatus.NO_CONTENT) // Return 204 on successful deletion
  @ApiOperation({ summary: 'Delete a conversation and its messages' })
  @ApiParam({ name: 'id', description: 'Conversation ID', type: String })
  @ApiResponse({
    status: 204,
    description: 'Conversation deleted successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden. Tier requirement not met or conversation not owned by user.',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found.' })
  deleteConversation(
    @User() user: AuthenticatedUserPayload,
    @Param('id', ParseObjectIdPipe) conversationId: string,
  ): Promise<void> {
    this.logger.log(
      `Received request to delete conversation ${conversationId} for user ${user.userId}`,
    );
    return this.chatService.deleteConversation(user, conversationId);
  }

  // --- Message Endpoints ---

  @Get('conversations/:id/messages')
  @RequiredTier(UserTier.TIER3)
  @ApiOperation({ summary: 'Get all messages for a specific conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'List of messages.',
    type: [MessageResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden. Tier requirement not met or conversation not owned by user.',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found.' })
  getMessagesForConversation(
    @User() user: AuthenticatedUserPayload,
    @Param('id', ParseObjectIdPipe) conversationId: string,
  ): Promise<MessageResponseDto[]> {
    this.logger.log(
      `Received request to get messages for conversation ${conversationId}, user ${user.userId}`,
    );
    return this.chatService.getMessagesForConversation(user, conversationId);
  }

  @Post('conversations/:id/messages')
  @RequiredTier(UserTier.TIER3)
  @ApiOperation({
    summary: 'Post a message to a conversation and get AI response',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID', type: String })
  @ApiBody({ type: CreateMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Message processed, AI response returned.',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden. Tier requirement not met or conversation not owned by user.',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found.' })
  @ApiResponse({
    status: 500,
    description: 'Internal server error (e.g., failed to contact AI service).',
  })
  postMessage(
    @User() user: AuthenticatedUserPayload,
    @Param('id', ParseObjectIdPipe) conversationId: string,
    @Body() createMessageDto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    this.logger.log(
      `Received request to post message to conversation ${conversationId} for user ${user.userId}`,
    );
    // This service method handles saving user message, calling AI, saving AI message, and returning AI message
    return this.chatService.addUserMessageAndGetResponse(
      user,
      conversationId,
      createMessageDto,
    );
  }
}
