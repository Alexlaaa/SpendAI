import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema';
import { Message, MessageDocument, SenderType } from './schemas/message.schema';
import {
  ConversationResponseDto,
  UpdateConversationDto,
} from './dto/conversation.dto';
import { CreateMessageDto, MessageResponseDto } from './dto/message.dto';
import { User } from '@/user/user.decorator';
import { AuthenticatedUserPayload } from '@/shared/types/auth.types';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { UserService } from '@/user/user.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private readonly httpService: HttpService,
    private readonly userService: UserService,
  ) {}

  // --- Conversation Methods ---

  async createConversation(
    @User() user: AuthenticatedUserPayload,
  ): Promise<ConversationResponseDto> {
    this.logger.log(`Creating new conversation for user ${user.userId}`);
    const newConversation = new this.conversationModel({
      userId: new Types.ObjectId(user.userId), // Ensure userId is ObjectId
    });
    const savedConversation = await newConversation.save();
    return this.buildConversationResponse(savedConversation);
  }

  async getUserConversations(
    @User() user: AuthenticatedUserPayload,
  ): Promise<ConversationResponseDto[]> {
    this.logger.log(`Fetching conversations for user ${user.userId}`);
    const conversations = await this.conversationModel
      .find({ userId: new Types.ObjectId(user.userId) }) // Ensure userId is ObjectId
      .sort({ updatedAt: -1 })
      .exec();
    return conversations.map(this.buildConversationResponse);
  }

  async getConversationById(
    @User() user: AuthenticatedUserPayload,
    conversationId: string | Types.ObjectId,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.findConversationForUser(
      user.userId,
      conversationId,
    );
    return this.buildConversationResponse(conversation);
  }

  async updateConversation(
    @User() user: AuthenticatedUserPayload,
    conversationId: string | Types.ObjectId,
    updateDto: UpdateConversationDto,
  ): Promise<ConversationResponseDto> {
    this.logger.log(
      `Updating conversation ${conversationId} for user ${user.userId}`,
    );
    const conversation = await this.findConversationForUser(
      user.userId,
      conversationId,
    );

    if (updateDto.title) {
      conversation.title = updateDto.title;
    }

    const updatedConversation = await conversation.save();
    return this.buildConversationResponse(updatedConversation);
  }

  async deleteConversation(
    @User() user: AuthenticatedUserPayload,
    conversationId: string | Types.ObjectId,
  ): Promise<void> {
    this.logger.log(
      `Deleting conversation ${conversationId} for user ${user.userId}`,
    );
    const conversationObjectId = new Types.ObjectId(conversationId); // Ensure ObjectId
    // Ensure user owns the conversation before deleting
    await this.findConversationForUser(user.userId, conversationObjectId);

    // Delete associated messages first
    const deleteMessagesResult = await this.messageModel
      .deleteMany({ conversationId: conversationObjectId })
      .exec();
    this.logger.log(
      `Deleted ${deleteMessagesResult.deletedCount} messages for conversation ${conversationId}`,
    );

    // Delete the conversation
    await this.conversationModel
      .deleteOne({ _id: conversationObjectId })
      .exec();
    this.logger.log(`Successfully deleted conversation ${conversationId}`);
  }

  // --- Message Methods ---

  async getMessagesForConversation(
    @User() user: AuthenticatedUserPayload,
    conversationId: string | Types.ObjectId,
  ): Promise<MessageResponseDto[]> {
    this.logger.log(
      `Fetching messages for conversation ${conversationId}, user ${user.userId}`,
    );
    const conversationObjectId = new Types.ObjectId(conversationId); // Ensure ObjectId
    // Ensure user owns the conversation first
    await this.findConversationForUser(user.userId, conversationObjectId);

    const messages = await this.messageModel
      .find({ conversationId: conversationObjectId })
      .sort({ createdAt: 'asc' })
      .exec();
    return messages.map(this.buildMessageResponse);
  }

  async addUserMessageAndGetResponse(
    @User() user: AuthenticatedUserPayload,
    conversationId: string | Types.ObjectId,
    createMessageDto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    this.logger.log(
      `Adding user message to conversation ${conversationId} for user ${user.userId}`,
    );
    const conversationObjectId = new Types.ObjectId(conversationId); // Ensure ObjectId
    // Ensure user owns the conversation
    await this.findConversationForUser(user.userId, conversationObjectId);

    // 1. Save the user's message
    const userMessage = new this.messageModel({
      sender: SenderType.USER,
      content: createMessageDto.content,
      conversationId: conversationObjectId,
    });
    await userMessage.save();
    this.logger.log(`User message saved (ID: ${userMessage._id})`);

    // 2. Prepare data for microservice (history + new message)
    const history = await this.messageModel
      .find({ conversationId: conversationObjectId })
      .sort({ createdAt: -1 })
      .limit(10) // Limit history size
      .select('sender content -_id') // Select only needed fields, exclude _id
      .lean() // Use lean for plain JS objects
      .exec();

    const payloadForMicroservice = {
      message: createMessageDto.content,
      history: history.reverse(), // Reverse to chronological order
      userId: user.userId,
    };
    this.logger.log(
      `Payload for microservice (without keys): ${JSON.stringify(payloadForMicroservice)}`,
    );

    // 3. Call the Python microservice's /chat endpoint
    let aiResponseContent: string;
    try {
      // Fetch API keys
      const userEntity = await this.userService.findEntityById(user.userId);
      if (!userEntity || !userEntity.apiToken) {
        throw new HttpException(
          'User or API token not found for chat service',
          HttpStatus.NOT_FOUND,
        );
      }
      const model = userEntity.apiToken.defaultModel;
      let geminiKey: string, openaiKey: string;
      try {
        ({ geminiKey, openaiKey } = this.userService.getDecryptedApiKey(
          userEntity,
          model,
        ));
      } catch (error) {
        throw new HttpException(
          `API key not set for the selected model: ${error.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Add API keys to the payload for the microservice
      const payloadWithKeys = {
        ...payloadForMicroservice,
        apiKeys: {
          defaultModel: model,
          geminiKey: geminiKey,
          openaiKey: openaiKey,
        },
      };

      const microserviceUrl = 'http://receipt-service:8081/chat';
      this.logger.log(`Calling microservice at ${microserviceUrl}`);

      // Make the actual microservice call
      const response = await firstValueFrom(
        this.httpService.post<{ response: string }>(
          microserviceUrl,
          payloadWithKeys, // Send payload with keys
          {
            timeout: 60000, // Increased timeout (60 seconds)
          },
        ),
      );
      aiResponseContent = response.data.response;
      this.logger.log(
        `Received response from microservice: ${aiResponseContent}`,
      );
    } catch (error) {
      this.logger.error(
        `Error calling chat microservice: ${error.message}`,
        error.stack,
      );
      // Simplified error check
      if (error.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(error.response?.data)}`,
        );
      }
      // Save an error message as the AI response
      aiResponseContent =
        "Sorry, I couldn't connect to the AI service right now. Please try again later.";
    }

    // 4. Save the AI's response (even if it's an error message)
    const aiMessage = new this.messageModel({
      sender: SenderType.AI,
      content: aiResponseContent,
      conversationId: conversationObjectId,
    });
    const savedAiMessage = await aiMessage.save();
    this.logger.log(`AI message saved (ID: ${savedAiMessage._id})`);

    // 5. Update conversation timestamp
    await this.conversationModel
      .findByIdAndUpdate(conversationObjectId, { updatedAt: new Date() })
      .exec();

    // 6. Return the AI's response DTO
    return this.buildMessageResponse(savedAiMessage);
  }

  // --- Helper Methods ---

  private async findConversationForUser(
    userId: string | Types.ObjectId,
    conversationId: string | Types.ObjectId,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .exec();
    if (!conversation) {
      this.logger.warn(`Conversation not found: ${conversationId}`);
      throw new NotFoundException(
        `Conversation with ID ${conversationId} not found`,
      );
    }
    // Ensure consistent comparison (string vs string)
    if (conversation.userId.toString() !== userId.toString()) {
      this.logger.error(
        `User ${userId} attempted to access conversation ${conversationId} owned by ${conversation.userId}`,
      );
      throw new ForbiddenException(
        'You do not have permission to access this conversation',
      );
    }
    return conversation;
  }

  private buildConversationResponse(
    conversation: ConversationDocument,
  ): ConversationResponseDto {
    // Ensure properties exist before accessing and convert IDs to strings
    return {
      _id: conversation?._id?.toString(),
      userId: conversation?.userId?.toString(), // Convert userId to string
      title: conversation?.title,
      createdAt: conversation?.createdAt,
      updatedAt: conversation?.updatedAt,
    };
  }

  private buildMessageResponse(message: MessageDocument): MessageResponseDto {
    // Ensure properties exist before accessing and convert IDs to strings
    return {
      _id: message?._id?.toString(),
      sender: message?.sender,
      content: message?.content,
      conversationId: message?.conversationId?.toString(), // Convert conversationId to string
      createdAt: message?.createdAt,
      updatedAt: message?.updatedAt,
    };
  }
}
