import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Receipt, ReceiptDocument } from './schemas/receipt.schema';
import { CreateReceiptDto, UpdateReceiptDto, ReceiptResponseDto } from './dto';
import * as FormData from 'form-data';
import axios from 'axios';
import { UserService } from '../user/user.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { parse, isValid, format } from 'date-fns';
import { TrackErrors } from '../metrics/function-error.decorator';
import { unparse } from 'papaparse';

@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);

  constructor(
    @InjectModel(Receipt.name)
    private readonly receiptModel: Model<ReceiptDocument>,
    private readonly userService: UserService,
  ) {}

  // Stage 1: Process receipt image and return data without saving
  @TrackErrors
  async processReceipt(
    userId: string,
    image: Express.Multer.File,
  ): Promise<ReceiptResponseDto> {
    if (!image) {
      throw new HttpException('No image uploaded', HttpStatus.BAD_REQUEST);
    }

    // Send the image directly to Flask for processing (no need for Binary conversion)
    const flaskResponse = await this.processReceiptWithFlask(userId, image);

    // Attempt to parse the date with custom format "DD/MM/YYYY"
    let receiptDate: string;
    try {
      const parsedDate = parse(flaskResponse.date, 'dd/MM/yyyy', new Date());
      receiptDate = parsedDate.toISOString();
    } catch {
      this.logger.error(`Invalid date format received: ${flaskResponse.date}`);
      receiptDate = ''; // Fallback to empty string or another default value
    }

    // Map Flask response fields to internal naming convention
    return {
      id: '',
      merchantName: flaskResponse.merchant_name,
      date: receiptDate,
      totalCost: parseFloat(flaskResponse.total_cost),
      category: flaskResponse.category,
      itemizedList: flaskResponse.itemized_list
        ? flaskResponse.itemized_list.map((item) => ({
            itemName: item.item_name,
            itemQuantity: parseInt(item.item_quantity),
            itemCost: parseFloat(item.item_cost),
          }))
        : [], // Fallback to empty array if itemized_list is missing
      userId: '',
    };
  }

  // Stage 2: Create a new receipt for the user
  @TrackErrors
  async createReceipt(
    userId: string,
    createReceiptDto: CreateReceiptDto,
  ): Promise<ReceiptResponseDto> {
    // Parse the date (try both ISO and dd/MM/yyyy formats)
    let parsedDate: Date | null = null;
    if (createReceiptDto.date) {
      parsedDate = this.parseDate(createReceiptDto.date);
      if (!parsedDate) {
        this.logger.error(
          `Invalid date format received: ${createReceiptDto.date}`,
        );
        throw new HttpException('Invalid date format', HttpStatus.BAD_REQUEST);
      }
    }

    this.logger.log('Creating receipt for user:', userId);

    // Save receipt with image buffer in the database
    const receipt = new this.receiptModel({
      ...createReceiptDto,
      date: parsedDate,
      userId,
    });

    const savedReceipt = await receipt.save();
    return this.buildReceiptResponse(savedReceipt);
  }

  // Update an existing receipt
  @TrackErrors
  async updateReceipt(
    userId: string,
    receiptId: string,
    updateReceiptDto: UpdateReceiptDto,
  ): Promise<ReceiptResponseDto> {
    this.logger.log('Received request to update receiptId:', receiptId);
    const receipt = await this.receiptModel.findById(receiptId);

    if (!receipt || receipt.userId !== userId.toString()) {
      throw new HttpException(
        'Receipt not found or not owned by the user',
        HttpStatus.NOT_FOUND,
      );
    }

    // Parse the date (try both ISO and dd/MM/yyyy formats)
    let parsedDate: Date | null = null;
    if (updateReceiptDto.date) {
      parsedDate = this.parseDate(updateReceiptDto.date);
      if (!parsedDate) {
        this.logger.error(
          `Invalid date format received: ${updateReceiptDto.date}`,
        );
        throw new HttpException('Invalid date format', HttpStatus.BAD_REQUEST);
      }
    }

    Object.assign(receipt, updateReceiptDto);
    if (parsedDate) {
      receipt.date = parsedDate; // Set the parsed date
    }

    const updatedReceipt = await receipt.save();
    return this.buildReceiptResponse(updatedReceipt);
  }

  // Delete a receipt
  @TrackErrors
  async deleteReceipt(
    userId: string,
    receiptId: string,
  ): Promise<{ message: string }> {
    this.logger.log('Deleting receipt:', receiptId);
    const receipt = await this.receiptModel.findById(receiptId);
    if (!receipt || receipt.userId !== userId.toString()) {
      throw new HttpException(
        'Receipt not found or not owned by the user',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.receiptModel.deleteOne({ _id: receiptId });
    return { message: 'Receipt successfully deleted.' };
  }

  // Get all receipts for a user
  @TrackErrors
  async getReceiptsByUser(userId: string): Promise<ReceiptResponseDto[]> {
    this.logger.log('Fetching receipts for user:', userId);
    const receipts = await this.receiptModel.find({ userId });
    this.logger.log('Found receipts:', receipts.length);
    return receipts.map((receipt) => this.buildReceiptResponse(receipt));
  }

  // Get transaction review for a user
  @TrackErrors
  async getTransactionReview(
    userId: string,
    customPrompt: string,
  ): Promise<string> {
    // Get all receipts for the user
    const receipts = await this.receiptModel.find({ userId });

    // Get the API keys
    const { model, geminiKey, openaiKey } = await this.getApiKeys(userId);

    // Prepare data to send to Flask
    const apiKeys = {
      defaultModel: model,
      geminiKey: geminiKey,
      openaiKey: openaiKey,
    };

    const receiptsData = receipts.map((receipt) =>
      this.buildReceiptResponse(receipt),
    );

    const data = {
      apiKeys: apiKeys,
      receipts: receiptsData,
      query: customPrompt,
    };

    this.logger.log('Fetching transaction review for user:', userId);
    try {
      const response = await axios.post(
        'http://receipt-service:8081/review',
        data,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.toString();
    } catch (error) {
      this.logger.error(
        'Error fetching transaction review from Flask',
        error.message,
      );
      this.logger.error('Full error stack:', error.stack);

      throw new HttpException(
        'Transaction review failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async processReceiptWithFlask(
    userId: string, // Add userId parameter
    image: Express.Multer.File,
  ): Promise<any> {
    // Fetch the user's API token information
    const { model, geminiKey, openaiKey } = await this.getApiKeys(userId);

    try {
      const formData = new FormData();

      // Append the image as a file
      formData.append('file', image.buffer, {
        filename: image.originalname,
        contentType: image.mimetype,
      });

      // Append model and api keys to the form data
      formData.append('defaultModel', model);
      formData.append('geminiKey', geminiKey);
      formData.append('openaiKey', openaiKey);

      this.logger.log('Sending image to Flask for processing');

      const response = await axios.post(
        'http://receipt-service:8081/upload',
        formData,
        {
          headers: formData.getHeaders(), // Ensures the correct Content-Type headers are set
        },
      );

      this.logger.log('Response from Flask:', response.data);
      return response.data;
    } catch (error) {
      this.logger.error('Error processing receipt with Flask', error.message);
      this.logger.error('Full error stack:', error.stack);

      throw new HttpException(
        'Receipt processing failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Utility function to handle getting API keys
  private async getApiKeys(userId: string): Promise<{
    model: string;
    geminiKey: string;
    openaiKey: string;
  }> {
    const user = await this.userService.findEntityById(userId);
    if (!user || !user.apiToken) {
      throw new HttpException(
        'User or API token not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const model = user.apiToken.defaultModel;
    let geminiKey: string, openaiKey: string;

    try {
      ({ geminiKey, openaiKey } = this.userService.getDecryptedApiKey(
        user,
        model,
      ));
    } catch (error) {
      throw new HttpException(
        `API key not set for the selected model: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return { model, geminiKey, openaiKey };
  }

  // Utility function to handle both date formats
  private parseDate(dateString: string): Date | null {
    // Try to parse the ISO date format first
    const isoDate = new Date(dateString);
    if (isValid(isoDate)) {
      return isoDate; // Return if it's a valid ISO date
    }

    // If it's not a valid ISO date, try parsing it as "dd/MM/yyyy"
    const parsedDate = parse(dateString, 'dd/MM/yyyy', new Date());
    if (isValid(parsedDate)) {
      return parsedDate;
    } else {
      this.logger.log('Invalid date format received:', dateString);
      return null; // Return null if neither format is valid
    }
  }

  // Build receipt response DTO
  private buildReceiptResponse(receipt: ReceiptDocument): ReceiptResponseDto {
    const { _id, ...rest } = receipt.toObject({ versionKey: false });

    return {
      id: _id, // Add the 'id' field with the value of '_id'
      ...rest, // Spread all other fields
    };
  }

  // Export receipts as CSV
  @TrackErrors
  async exportReceiptsAsCsv(userId: string): Promise<string> {
    this.logger.log(`Exporting receipts for user: ${userId}`);
    const receipts = await this.receiptModel.find({ userId }).lean().exec(); // Use lean() for performance

    if (!receipts || receipts.length === 0) {
      this.logger.warn(`No receipts found for user ${userId} to export.`);
      return ''; // Return empty string if no receipts
    }

    // Define the maximum number of items to flatten
    const maxItems = receipts.reduce((max, receipt) => {
      return receipt.itemizedList
        ? Math.max(max, receipt.itemizedList.length) // Format ternary
        : max;
    }, 0);

    // Prepare data for CSV conversion
    const dataToExport = receipts.map((receipt) => {
      const baseData = {
        ReceiptID: receipt._id.toString(),
        MerchantName: receipt.merchantName,
        Date: receipt.date ? format(receipt.date, 'yyyy-MM-dd') : '', // Format date
        TotalCost: receipt.totalCost,
        Category: receipt.category,
        // Add other base fields if necessary
      };

      // Flatten itemizedList
      const itemData = {};
      if (receipt.itemizedList) {
        for (let i = 0; i < maxItems; i++) {
          const item = receipt.itemizedList[i];
          itemData[`Item_${i + 1}_Name`] = item ? item.itemName : '';
          itemData[`Item_${i + 1}_Quantity`] = item ? item.itemQuantity : '';
          itemData[`Item_${i + 1}_Cost`] = item ? item.itemCost : '';
        }
      } else {
         // Add empty item columns if no itemizedList exists for this receipt
         for (let i = 0; i < maxItems; i++) {
          itemData[`Item_${i + 1}_Name`] = '';
          itemData[`Item_${i + 1}_Quantity`] = '';
          itemData[`Item_${i + 1}_Cost`] = '';
        }
      }
      // Remove extra blank line
      return { ...baseData, ...itemData };
    });

    // Define CSV headers dynamically based on maxItems
    const baseHeaders = [
      'ReceiptID',
      'MerchantName',
      'Date',
      'TotalCost',
      'Category',
    ]; // Format array
    const itemHeaders = [];
    for (let i = 0; i < maxItems; i++) {
      itemHeaders.push(
        `Item_${i + 1}_Name`,
        `Item_${i + 1}_Quantity`,
        `Item_${i + 1}_Cost`,
      ); // Format array elements
    }
    const headers = [...baseHeaders, ...itemHeaders];
    try {
      const csvString = unparse(dataToExport, {
        header: true,
        columns: headers, // Ensure columns are ordered correctly
      });
      this.logger.log(`Successfully generated CSV for user ${userId}`);
      return csvString;
    } catch (error) {
      this.logger.error(
        `Error generating CSV for user ${userId}: ${error.message}`,
        error.stack,
      ); // Format logger arguments

      throw new HttpException(
        'Failed to generate CSV data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      ); // Format exception arguments
    }
  }
}
