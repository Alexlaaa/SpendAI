import { Module } from '@nestjs/common';
import { ReceiptService } from './receipt.service';
import { ReceiptController } from './receipt.controller';
import { Receipt, ReceiptSchema } from './schemas/receipt.schema';
import { UserModule } from '../user/user.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Receipt.name, schema: ReceiptSchema }]),
    ConfigModule,
    UserModule,
  ],
  providers: [ReceiptService],
  controllers: [ReceiptController],
  exports: [ReceiptService],
})
export class ReceiptModule {}
