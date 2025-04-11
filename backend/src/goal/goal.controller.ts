import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GoalService } from './goal.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { AddContributionDto } from './dto/add-contribution.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  // ApiProperty, // Removed unused import
} from '@nestjs/swagger';
import { AuthMiddleware } from '../user/auth.middleware';
import { User as GetUser } from '../user/user.decorator';
import { AuthenticatedUser } from './goal.service';
import { GoalResponseDto } from './dto/goal-response.dto';
import { ParseObjectIdPipe } from '../shared/pipes/parse-object-id.pipe';
import { RequiredTier, TierGuard } from '../shared/guards/tier.guard';
import { UserTier } from '../user/schemas/user.schema';

@ApiTags('Goals')
@ApiBearerAuth()
@UseGuards(AuthMiddleware, TierGuard) // Apply Auth and Tier guards globally to this controller
@Controller('goals')
export class GoalController {
  private readonly logger = new Logger(GoalController.name);

  constructor(private readonly goalService: GoalService) {}

  @Post()
  @RequiredTier(UserTier.TIER2) // Requires Tier 2 or higher
  @ApiOperation({ summary: 'Create a new financial goal' })
  @ApiResponse({
    status: 201,
    description: 'The goal has been successfully created.',
    type: GoalResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Insufficient Tier).' })
  create(
    @Body() createGoalDto: CreateGoalDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<GoalResponseDto> {
    this.logger.log(`Received request to create goal for user ${user.id} `);
    return this.goalService.create(createGoalDto, user);
  }

  @Get()
  @RequiredTier(UserTier.TIER2) // Requires Tier 2 or higher
  @ApiOperation({ summary: "Get all of the user's financial goals" })
  @ApiResponse({
    status: 200,
    description: 'List of goals retrieved successfully.',
    type: [GoalResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Insufficient Tier).' })
  findAll(@GetUser() user: AuthenticatedUser): Promise<GoalResponseDto[]> {
    this.logger.log(`Received request to find all goals for user ${user.id} `);
    return this.goalService.findAll(user);
  }

  @Get(':id')
  @RequiredTier(UserTier.TIER2) // Requires Tier 2 or higher
  @ApiOperation({ summary: 'Get a specific financial goal by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the goal to retrieve' })
  @ApiResponse({
    status: 200,
    description: 'Goal retrieved successfully.',
    type: GoalResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Insufficient Tier).' })
  @ApiResponse({ status: 404, description: 'Goal not found.' })
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<GoalResponseDto> {
    this.logger.log(`Received request to find goal ${id} for user ${user.id} `);
    return this.goalService.findOne(id, user);
  }

  @Patch(':id')
  @RequiredTier(UserTier.TIER2) // Requires Tier 2 or higher
  @ApiOperation({ summary: 'Update a specific financial goal by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the goal to update' })
  @ApiResponse({
    status: 200,
    description: 'Goal updated successfully.',
    type: GoalResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Insufficient Tier).' })
  @ApiResponse({ status: 404, description: 'Goal not found.' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateGoalDto: UpdateGoalDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<GoalResponseDto> {
    this.logger.log(
      `Received request to update goal ${id} for user ${user.id} `,
    );
    return this.goalService.update(id, updateGoalDto, user);
  }

  @Delete(':id')
  @RequiredTier(UserTier.TIER2) // Requires Tier 2 or higher
  @HttpCode(HttpStatus.NO_CONTENT) // Return 204 on successful deletion
  @ApiOperation({ summary: 'Delete a specific financial goal by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the goal to delete' })
  @ApiResponse({
    status: 204,
    description: 'Goal deleted successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Insufficient Tier).' })
  @ApiResponse({ status: 404, description: 'Goal not found.' })
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<void> {
    this.logger.log(
      `Received request to delete goal ${id} for user ${user.id} `,
    );
    return this.goalService.remove(id, user);
  }

  @Post(':id/contribute')
  @RequiredTier(UserTier.TIER2) // Requires Tier 2 or higher
  @ApiOperation({ summary: 'Add a contribution to a specific goal' })
  @ApiParam({ name: 'id', description: 'The ID of the goal to contribute to' })
  @ApiResponse({
    status: 200,
    description: 'Contribution added successfully.',
    type: GoalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., invalid amount).',
  }) // Correct formatting
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Insufficient Tier).' })
  @ApiResponse({ status: 404, description: 'Goal not found.' })
  async addContribution(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() addContributionDto: AddContributionDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<GoalResponseDto> {
    this.logger.log(
      `Received request to add contribution to goal ${id} for user ${user.id}`,
    );
    return this.goalService.addContribution(
      id,
      addContributionDto.amount,
      user,
    );
  }
}
