import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Budget, BudgetDocument } from './schemas/budget.schema';
import { CreateBudgetDto, UpdateBudgetDto, BudgetResponseDto } from './dto';

@Injectable()
export class BudgetService {
  constructor(
    @InjectModel(Budget.name) private budgetModel: Model<BudgetDocument>,
  ) {}

  async create(
    createBudgetDto: CreateBudgetDto,
    userId: string,
  ): Promise<BudgetResponseDto> {
    // Return DTO
    const newBudget = new this.budgetModel({
      ...createBudgetDto,
      startDate: new Date(createBudgetDto.startDate), // Convert string date to Date object
      endDate: createBudgetDto.endDate
        ? new Date(createBudgetDto.endDate)
        : undefined, // Convert optional string date
      userId: userId, // Assign userId string directly, let Mongoose cast
    });
    const savedBudget = await newBudget.save();
    return this.buildBudgetResponse(savedBudget);
  }

  async findAllByUser(userId: string): Promise<BudgetResponseDto[]> {
    // Return DTO array
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID format');
    }
    // Mongoose find expects ObjectId for ref matching, even if schema allows string assignment on create
    const budgets = await this.budgetModel
      .find({ userId: new Types.ObjectId(userId) })
      .exec();
    return budgets.map(this.buildBudgetResponse);
  }

  async findOne(id: string, userId: string): Promise<BudgetResponseDto> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid ID format');
    }
    const budget = await this.budgetModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!budget) {
      throw new NotFoundException(
        `Budget with ID "${id}" not found for this user`,
      );
    }
    return this.buildBudgetResponse(budget);
  }

  async update(
    id: string,
    updateBudgetDto: UpdateBudgetDto,
    userId: string,
  ): Promise<BudgetResponseDto> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid ID format');
    }
    const updatedBudget = await this.budgetModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          userId: new Types.ObjectId(userId),
        },
        {
          ...updateBudgetDto,
          // Convert dates if they are present in the update DTO
          ...(updateBudgetDto.startDate && {
            startDate: new Date(updateBudgetDto.startDate),
          }),
          ...(updateBudgetDto.endDate && {
            endDate: new Date(updateBudgetDto.endDate),
          }),
        },
        { new: true }, // Return the updated document
      )
      .exec();

    if (!updatedBudget) {
      throw new NotFoundException(
        `Budget with ID "${id}" not found for this user`,
      );
    }
    return this.buildBudgetResponse(updatedBudget);
  }

  async remove(
    id: string,
    userId: string,
  ): Promise<{ deleted: boolean; message?: string }> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid ID format');
    }
    const result = await this.budgetModel
      .deleteOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(
        `Budget with ID "${id}" not found for this user`,
      );
    }
    return { deleted: true };
  }

  private buildBudgetResponse(budget: BudgetDocument): BudgetResponseDto {
    // Ensure budget and necessary fields exist before mapping
    if (!budget?._id) {
      throw new Error('Invalid budget document passed to buildBudgetResponse');
    }
    return {
      _id: budget._id.toString(),
      // Ensure userId is converted correctly (it might be ObjectId or populated User object)
      userId: budget.userId?.toString() || '', // Handle potential population or just ObjectId ref
      category: budget.category,
      amount: budget.amount,
      period: budget.period,
      startDate: budget.startDate.toISOString(),
      endDate: budget.endDate?.toISOString(), // Handle optional endDate
      createdAt:
        (budget as any).createdAt?.toISOString() || new Date(0).toISOString(),
      updatedAt:
        (budget as any).updatedAt?.toISOString() || new Date(0).toISOString(),
    };
  }
}
