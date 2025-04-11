import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Goal, GoalSchema } from './schemas/goal.schema';
import { UserModule } from '../user/user.module';
import { GoalController } from './goal.controller';
import { GoalService } from './goal.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Goal.name, schema: GoalSchema }]),
    UserModule,
  ],
  controllers: [GoalController],
  providers: [GoalService],
})
export class GoalModule {}
