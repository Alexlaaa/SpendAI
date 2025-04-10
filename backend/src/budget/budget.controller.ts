import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  UsePipes,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BudgetService } from './budget.service';
import { CreateBudgetDto, UpdateBudgetDto, BudgetResponseDto } from './dto';
import { User } from '../user/user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
// Helper function or custom pipe to validate MongoDB ObjectId strings
import { ParseObjectIdPipe } from '../shared/pipes/parse-object-id.pipe';

@ApiTags('budgets')
@Controller('budgets')
export class BudgetController {
  private readonly logger = new Logger(BudgetController.name);
  constructor(private readonly budgetService: BudgetService) {}

  @UsePipes(new ValidationPipe())
  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new budget for the user' })
  @ApiResponse({
    status: 201,
    description: 'Budget successfully created.',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(
    @Body(ValidationPipe) createBudgetDto: CreateBudgetDto,
    @User('_id') userId: string,
  ): Promise<BudgetResponseDto> {
    this.logger.log(
      `User ${userId} creating budget: ${JSON.stringify(createBudgetDto)}`,
    );

    return await this.budgetService.create(createBudgetDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all budgets for the logged-in user' })
  @ApiResponse({
    status: 200,
    description: 'Budgets retrieved successfully.',
    type: [BudgetResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(@User('_id') userId: string): Promise<BudgetResponseDto[]> {
    this.logger.log(`User ${userId} fetching all budgets.`);
    return await this.budgetService.findAllByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific budget by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the budget to retrieve',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Budget retrieved successfully.',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Budget not found or invalid ID.' })
  async findOne(
    @Param('id', ParseObjectIdPipe) id: string,
    @User('_id') userId: string,
  ): Promise<BudgetResponseDto> {
    this.logger.log(`User ${userId} fetching budget with ID: ${id}`);
    return await this.budgetService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a specific budget by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the budget to update',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Budget updated successfully.',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Budget not found or invalid ID.' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body(ValidationPipe) updateBudgetDto: UpdateBudgetDto,
    @User('_id') userId: string,
  ): Promise<BudgetResponseDto> {
    this.logger.log(
      `User ${userId} updating budget ${id}: ${JSON.stringify(updateBudgetDto)}`,
    );
    return await this.budgetService.update(id, updateBudgetDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a specific budget by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the budget to delete',
    type: String,
  })
  @ApiResponse({ status: 204, description: 'Budget successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Budget not found or invalid ID.' })
  async remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @User('_id') userId: string,
  ): Promise<void> {
    this.logger.log(`User ${userId} deleting budget with ID: ${id}`);
    await this.budgetService.remove(id, userId);
  }
}
