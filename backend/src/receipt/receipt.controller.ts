import {
  Controller,
  Post,
  Put,
  Delete,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  HttpCode,
  Logger,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReceiptService } from './receipt.service';
import { CreateReceiptDto, UpdateReceiptDto, ReceiptResponseDto } from './dto';
import { ValidationPipe } from '../shared/pipes/validation.pipe';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from '../user/user.decorator';
import { RequiredTier, TierGuard } from '../shared/guards/tier.guard';
import { UserTier } from '../user/schemas/user.schema';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthenticatedUserPayload } from '@/shared/types/auth.types';

@ApiTags('receipts')
@Controller('receipts')
export class ReceiptController {
  private readonly logger = new Logger(ReceiptController.name);
  constructor(private readonly receiptService: ReceiptService) {}

  // Stage 1: Process receipt image and return details without saving
  @Post('process')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload receipt image for processing (does not store the receipt)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Receipt image processed successfully and data returned.',
    type: ReceiptResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User or API token not found.',
  })
  @ApiResponse({
    status: 400,
    description: 'API key not set for the primary model.',
  })
  @UseInterceptors(FileInterceptor('image'))
  async processReceipt(
    @User('_id') userId: string,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<ReceiptResponseDto> {
    this.logger.log('Extracted user ID from decorator:', userId);
    return this.receiptService.processReceipt(userId, image);
  }

  // Stage 2: Confirm and create receipt in the database
  @UsePipes(new ValidationPipe())
  @Post('create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create receipt with the confirmed details' })
  @ApiResponse({
    status: 201,
    description: 'Receipt successfully created.',
    type: ReceiptResponseDto,
  })
  async createReceipt(
    @User('_id') userId: string,
    @Body() createReceiptDto: CreateReceiptDto,
  ): Promise<ReceiptResponseDto> {
    this.logger.log('Extracted user ID from decorator:', userId);
    return this.receiptService.createReceipt(userId, createReceiptDto);
  }

  @UsePipes(new ValidationPipe())
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update receipt' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Receipt successfully updated.',
    type: ReceiptResponseDto,
  })
  @UseInterceptors(FileInterceptor('image'))
  async updateReceipt(
    @User('_id') userId: string,
    @Param('id') receiptId: string,
    @Body() updateReceiptDto: UpdateReceiptDto,
  ): Promise<ReceiptResponseDto> {
    this.logger.log('Extracted user ID from decorator:', userId);
    return this.receiptService.updateReceipt(
      userId,
      receiptId,
      updateReceiptDto,
    );
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete receipt' })
  @ApiResponse({
    status: 204,
    description: 'Receipt successfully deleted.',
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt not found.',
  })
  @HttpCode(200)
  async deleteReceipt(
    @User('_id') userId: string,
    @Param('id') receiptId: string,
  ): Promise<{ message: string }> {
    this.logger.log('Extracted user ID from decorator:', userId);
    return this.receiptService.deleteReceipt(userId, receiptId);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all receipts for the user' })
  @ApiResponse({
    status: 200,
    description: 'Receipts retrieved successfully.',
    type: [ReceiptResponseDto],
  })
  @HttpCode(200)
  async getReceiptsByUser(
    @User('_id') userId: string,
  ): Promise<ReceiptResponseDto[]> {
    this.logger.log('Extracted user ID from decorator:', userId);
    return this.receiptService.getReceiptsByUser(userId);
  }

  @Post('review')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user transaction review with a custom prompt.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction review retrieved successfully.',
    type: String,
  })
  @HttpCode(200)
  async getTransactionReview(
    @User('_id') userId: string,
    @Body() body: { query: string }, // Accepting prompt from the request body
  ): Promise<string> {
    const customPrompt = body.query;
    this.logger.log('customPrompt:', customPrompt);
    return this.receiptService.getTransactionReview(userId, customPrompt);
  }

  @Get('export')
  @UseGuards(TierGuard)
  @RequiredTier(UserTier.TIER2) // Requires Tier 2 or higher
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export user receipts as CSV' })
  @ApiResponse({
    status: 200,
    description: 'Receipts exported successfully as CSV.',
    content: { 'text/csv': {} }, // Indicate CSV content type
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Insufficient Tier).' })
  async exportReceipts(
    @User() user: AuthenticatedUserPayload,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `Received request to export receipts for user ${user.userId}  `,
    );
    // Assuming service expects string ID based on other methods
    const csvData = await this.receiptService.exportReceiptsAsCsv(user.userId);

    // Set headers for CSV download
    const filename = `spendai_receipts_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    // Send the CSV data
    res.send(csvData);
  }
}
