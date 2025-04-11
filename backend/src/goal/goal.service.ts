import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Goal } from './schemas/goal.schema';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalResponseDto } from './dto/goal-response.dto';

export interface AuthenticatedUser {
  id: string;
  _id: Types.ObjectId;
}

@Injectable()
export class GoalService {
  private readonly logger = new Logger(GoalService.name);

  constructor(@InjectModel(Goal.name) private goalModel: Model<Goal>) {}

  // Helper function to map Goal document to GoalResponseDto
  private buildGoalResponse(goal: Goal): GoalResponseDto {
    return {
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      deadline: goal.deadline,
      type: goal.type,
      category: goal.category,
      priority: goal.priority,
      contributions: goal.contributions,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };
  }

  async create(
    createGoalDto: CreateGoalDto,
    user: AuthenticatedUser,
  ): Promise<GoalResponseDto> {
    this.logger.log(
      `Creating goal "${createGoalDto.name}" for user ${user.id}`,
    );
    const goalData = {
      ...createGoalDto,
      userId: user._id, // Assign the user's ObjectId
      deadline: createGoalDto.deadline
        ? new Date(createGoalDto.deadline)
        : undefined, // Convert deadline string to Date
      // category and priority are already in createGoalDto
    };
    if (goalData.category === undefined) delete goalData.category;
    if (goalData.priority === undefined) delete goalData.priority;

    const newGoal = new this.goalModel(goalData);
    const savedGoal = await newGoal.save();
    return this.buildGoalResponse(savedGoal);
  }

  async findAll(user: AuthenticatedUser): Promise<GoalResponseDto[]> {
    this.logger.log(`Fetching all goals for user ${user.id}`);
    const goals = await this.goalModel.find({ userId: user._id }).exec();
    return goals.map(this.buildGoalResponse);
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<GoalResponseDto> {
    this.logger.log(`Fetching goal with id ${id} for user ${user.id}`);
    const goal = await this.goalModel
      .findOne({ _id: new Types.ObjectId(id), userId: user._id })
      .exec();
    if (!goal) {
      throw new NotFoundException(`Goal with ID "${id}" not found`);
    }
    return this.buildGoalResponse(goal);
  }

  async update(
    id: string,
    updateGoalDto: UpdateGoalDto,
    user: AuthenticatedUser,
  ): Promise<GoalResponseDto> {
    this.logger.log(`Updating goal with id ${id} for user ${user.id}`);

    // Prepare update data, handling deadline conversion
    const { deadline, ...restOfDto } = updateGoalDto;
    const updateData: Partial<Goal> = { ...restOfDto };
    if (deadline) {
      updateData.deadline = new Date(deadline); // Convert string to Date
    } else if (deadline === null) {
      // Allow explicitly setting deadline to null/undefined if needed by schema/logic
      updateData.deadline = undefined;
    }

    const updatedGoal = await this.goalModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: user._id }, // Use user._id for DB query
        updateData,
        { new: true }, // Return the updated document
      )
      .exec();

    if (!updatedGoal) {
      throw new NotFoundException(`Goal with ID "${id}" not found`);
    }
    return this.buildGoalResponse(updatedGoal);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    // Use AuthenticatedUser
    this.logger.log(`Deleting goal with id ${id} for user ${user.id}`); // Use user.id for logging
    const result = await this.goalModel
      .deleteOne({ _id: new Types.ObjectId(id), userId: user._id }) // Use user._id for DB query
      .exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Goal with ID "${id}" not found`);
    }
    this.logger.log(`Successfully deleted goal with id ${id}`);
  }

  // New method to add a contribution to a goal
  async addContribution(
    id: string,
    amount: number,
    user: AuthenticatedUser,
  ): Promise<GoalResponseDto> {
    this.logger.log(
      `Adding contribution of ${amount} to goal ${id} for user ${user.id}`,
    );

    if (amount <= 0) {
      throw new Error('Contribution amount must be positive.'); // Or use BadRequestException
    }

    const goalObjectId = new Types.ObjectId(id);

    // Find the goal and update it atomically
    const updatedGoal = await this.goalModel
      .findOneAndUpdate(
        { _id: goalObjectId, userId: user._id }, // Match goal ID and user ID
        {
          $inc: { currentAmount: amount }, // Increment current amount
          $push: {
            contributions: { amount: amount, date: new Date() }, // Add to contributions array
          },
        },
        { new: true }, // Return the updated document
      )
      .exec();

    if (!updatedGoal) {
      throw new NotFoundException(
        `Goal with ID "${id}" not found or not owned by user ${user.id}`,
      );
    }

    this.logger.log(`Successfully added contribution to goal ${id}`);
    return this.buildGoalResponse(updatedGoal);
  }
}
