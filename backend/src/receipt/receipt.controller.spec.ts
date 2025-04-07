// src/receipt/receipt.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ReceiptController } from './receipt.controller';
import { ReceiptService } from './receipt.service';
import { CreateReceiptDto, ReceiptResponseDto, UpdateReceiptDto } from './dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Category } from './receipt.enums';

describe('ReceiptController', () => {
  let controller: ReceiptController;
  let service: ReceiptService;

  // Mocked ReceiptService with all necessary methods
  const mockReceiptService = {
    processReceipt: jest.fn(),
    createReceipt: jest.fn(),
    updateReceipt: jest.fn(),
    deleteReceipt: jest.fn(),
    getReceiptsByUser: jest.fn(),
    getTransactionReview: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceiptController],
      providers: [{ provide: ReceiptService, useValue: mockReceiptService }],
    }).compile();

    controller = module.get<ReceiptController>(ReceiptController);
    service = module.get<ReceiptService>(ReceiptService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  // Helper function to create a mock Express.Multer.File
  const createMockFile = (
    buffer: Buffer,
    originalname: string,
    mimetype: string,
    size: number,
  ): Express.Multer.File => ({
    fieldname: 'image',
    originalname,
    encoding: '7bit',
    mimetype,
    size,
    buffer,
    destination: '',
    filename: '',
    path: '',
    stream: null,
  });

  describe('processReceipt', () => {
    it('should process receipt image and return details', async () => {
      const userId = 'user_id';
      const mockImage = createMockFile(
        Buffer.from('image_data'),
        'receipt.png',
        'image/png',
        1024,
      );

      const mockReceipt: ReceiptResponseDto = {
        id: 'receipt_id',
        merchantName: 'Test Store',
        totalCost: 100.0,
        date: '2024-09-01T00:00:00.000Z', // ISO string
        category: 'Food',
        itemizedList: [],
        userId: userId,
      };

      // Mock the service.processReceipt method
      mockReceiptService.processReceipt.mockResolvedValue(mockReceipt);

      const result = await controller.processReceipt(userId, mockImage);

      expect(service.processReceipt).toHaveBeenCalledWith(userId, mockImage);
      expect(result).toEqual(mockReceipt);
    });

    it('should throw an error if user or API token not found', async () => {
      const userId = 'invalid_user_id';
      const mockImage = createMockFile(
        Buffer.from('image_data'),
        'receipt.png',
        'image/png',
        1024,
      );

      // Mock the service.processReceipt method to throw an error
      mockReceiptService.processReceipt.mockRejectedValue(
        new HttpException('User or API token not found', HttpStatus.NOT_FOUND),
      );

      await expect(
        controller.processReceipt(userId, mockImage),
      ).rejects.toThrow(
        new HttpException('User or API token not found', HttpStatus.NOT_FOUND),
      );

      expect(service.processReceipt).toHaveBeenCalledWith(userId, mockImage);
    });

    it('should throw an error if API key not set for primary model', async () => {
      const userId = 'user_id';
      const mockImage = createMockFile(
        Buffer.from('image_data'),
        'receipt.png',
        'image/png',
        1024,
      );

      // Mock the service.processReceipt method to throw an error
      mockReceiptService.processReceipt.mockRejectedValue(
        new HttpException(
          'API key not set for the primary model',
          HttpStatus.BAD_REQUEST,
        ),
      );

      await expect(
        controller.processReceipt(userId, mockImage),
      ).rejects.toThrow(
        new HttpException(
          'API key not set for the primary model',
          HttpStatus.BAD_REQUEST,
        ),
      );

      expect(service.processReceipt).toHaveBeenCalledWith(userId, mockImage);
    });
  });

  describe('createReceipt', () => {
    it('should create a new receipt and return receipt details', async () => {
      const userId = 'user_id';
      const createReceiptDto: CreateReceiptDto = {
        merchantName: 'Test Store',
        date: '2024-09-01', // ISO string
        totalCost: 100.0,
        category: Category.FOOD,
        itemizedList: [],
      };

      const mockReceipt: ReceiptResponseDto = {
        id: 'receipt_id',
        merchantName: 'Test Store',
        totalCost: 100.0,
        date: '2024-09-01T00:00:00.000Z', // ISO string
        category: 'Food',
        itemizedList: [],
        userId: userId,
      };

      // Mock the service.createReceipt method
      mockReceiptService.createReceipt.mockResolvedValue(mockReceipt);

      const result = await controller.createReceipt(userId, createReceiptDto);

      expect(service.createReceipt).toHaveBeenCalledWith(
        userId,
        createReceiptDto,
      );
      expect(result).toEqual(mockReceipt);
    });

    it('should throw an error if user not found', async () => {
      const userId = 'invalid_user_id';
      const createReceiptDto: CreateReceiptDto = {
        merchantName: 'Test Store',
        date: '2024-09-01', // ISO string
        totalCost: 100.0,
        category: Category.FOOD,
        itemizedList: [],
      };

      // Mock the service.createReceipt method to throw an error
      mockReceiptService.createReceipt.mockRejectedValue(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      await expect(
        controller.createReceipt(userId, createReceiptDto),
      ).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      expect(service.createReceipt).toHaveBeenCalledWith(
        userId,
        createReceiptDto,
      );
    });
  });

  describe('updateReceipt', () => {
    it('should update receipt successfully and return updated receipt', async () => {
      const userId = 'user_id';
      const receiptId = 'receipt_id';
      const updateReceiptDto: UpdateReceiptDto = {
        merchantName: 'Updated Store',
        date: '2024-10-01', // ISO string
        totalCost: 150.0,
        category: Category.FOOD,
        itemizedList: [],
      };

      const mockReceipt: ReceiptResponseDto = {
        id: receiptId,
        merchantName: 'Updated Store',
        totalCost: 150.0,
        date: '2024-10-01T00:00:00.000Z', // ISO string
        category: 'Food',
        itemizedList: [],
        userId: userId,
      };

      // Mock the service.updateReceipt method
      mockReceiptService.updateReceipt.mockResolvedValue(mockReceipt);

      const result = await controller.updateReceipt(
        userId,
        receiptId,
        updateReceiptDto,
      );

      expect(service.updateReceipt).toHaveBeenCalledWith(
        userId,
        receiptId,
        updateReceiptDto,
      );
      expect(result).toEqual(mockReceipt);
    });

    it('should throw an error if receipt not found', async () => {
      const userId = 'user_id';
      const receiptId = 'invalid_receipt_id';
      const updateReceiptDto: UpdateReceiptDto = {
        merchantName: 'Updated Store',
        date: '2024-10-01', // ISO string
        totalCost: 150.0,
        category: Category.FOOD,
        itemizedList: [],
      };

      // Mock the service.updateReceipt method to throw an error
      mockReceiptService.updateReceipt.mockRejectedValue(
        new HttpException('Receipt not found', HttpStatus.NOT_FOUND),
      );

      await expect(
        controller.updateReceipt(userId, receiptId, updateReceiptDto),
      ).rejects.toThrow(
        new HttpException('Receipt not found', HttpStatus.NOT_FOUND),
      );

      expect(service.updateReceipt).toHaveBeenCalledWith(
        userId,
        receiptId,
        updateReceiptDto,
      );
    });
  });

  describe('deleteReceipt', () => {
    it('should delete receipt successfully and return success message', async () => {
      const userId = 'user_id';
      const receiptId = 'receipt_id';

      // Mock the service.deleteReceipt method
      mockReceiptService.deleteReceipt.mockResolvedValue({
        message: 'Receipt successfully deleted.',
      });

      const result = await controller.deleteReceipt(userId, receiptId);

      expect(service.deleteReceipt).toHaveBeenCalledWith(userId, receiptId);
      expect(result).toEqual({ message: 'Receipt successfully deleted.' });
    });

    it('should throw an error if receipt not found', async () => {
      const userId = 'user_id';
      const receiptId = 'invalid_receipt_id';

      // Mock the service.deleteReceipt method to throw an error
      mockReceiptService.deleteReceipt.mockRejectedValue(
        new HttpException('Receipt not found', HttpStatus.NOT_FOUND),
      );

      await expect(controller.deleteReceipt(userId, receiptId)).rejects.toThrow(
        new HttpException('Receipt not found', HttpStatus.NOT_FOUND),
      );

      expect(service.deleteReceipt).toHaveBeenCalledWith(userId, receiptId);
    });
  });

  describe('getReceiptsByUser', () => {
    it('should return all receipts for the user', async () => {
      const userId = 'user_id';

      const mockReceipts: ReceiptResponseDto[] = [
        {
          id: 'receipt1',
          merchantName: 'Store A',
          totalCost: 50.0,
          date: '2024-09-01T00:00:00.000Z', // ISO string
          category: 'Food',
          itemizedList: [],
          userId: userId,
        },
        {
          id: 'receipt2',
          merchantName: 'Store B',
          totalCost: 75.0,
          date: '2024-09-02T00:00:00.000Z', // ISO string
          category: 'Utilities',
          itemizedList: [],
          userId: userId,
        },
      ];

      // Mock the service.getReceiptsByUser method
      mockReceiptService.getReceiptsByUser.mockResolvedValue(mockReceipts);

      const result = await controller.getReceiptsByUser(userId);

      expect(service.getReceiptsByUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockReceipts);
    });

    it('should throw an error if user not found', async () => {
      const userId = 'invalid_user_id';

      // Mock the service.getReceiptsByUser method to throw an error
      mockReceiptService.getReceiptsByUser.mockRejectedValue(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      await expect(controller.getReceiptsByUser(userId)).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      expect(service.getReceiptsByUser).toHaveBeenCalledWith(userId);
    });
  });

  describe('getTransactionReview', () => {
    it('should return user transaction review successfully', async () => {
      const userId = 'user_id';
      const customPrompt = 'Summarize my spending habits.';
      const mockReview = 'Your transaction review summary.';

      // Mock the service.getTransactionReview method
      mockReceiptService.getTransactionReview.mockResolvedValue(mockReview);

      const result = await controller.getTransactionReview(userId, {
        query: customPrompt,
      });

      expect(service.getTransactionReview).toHaveBeenCalledWith(
        userId,
        customPrompt,
      );
      expect(result).toEqual(mockReview);
    });

    it('should throw an error if user not found', async () => {
      const userId = 'invalid_user_id';
      const customPrompt = 'Analyze recent transactions.';

      // Mock the service.getTransactionReview method to throw an error
      mockReceiptService.getTransactionReview.mockRejectedValue(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      await expect(
        controller.getTransactionReview(userId, { query: customPrompt }),
      ).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      expect(service.getTransactionReview).toHaveBeenCalledWith(
        userId,
        customPrompt,
      );
    });
  });
});
