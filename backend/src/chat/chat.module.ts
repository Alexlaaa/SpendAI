import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { UserModule } from '@/user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    UserModule,
    HttpModule.register({
      // Register HttpModule for microservice calls
      timeout: 30000, // Default timeout for HTTP requests (30 seconds)
      maxRedirects: 5,
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
