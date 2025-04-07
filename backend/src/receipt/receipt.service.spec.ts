import { Test, TestingModule } from '@nestjs/testing';
import { ReceiptService } from './receipt.service';
import { Receipt } from './schemas/receipt.schema';
import { getModelToken } from '@nestjs/mongoose';
import { UserService } from '../user/user.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { ReporterService } from '../reporter/reporter.service';

jest.mock('axios'); // Mock axios to prevent real HTTP requests

describe('ReceiptService', () => {
  let service: ReceiptService;
  let userService: UserService;

  // Mock data
  const userId = 'userId';

  // Mock Receipt model
  class MockReceiptModel {
    _id: any;
    data: any;

    constructor(data: any) {
      this.data = data;
      Object.assign(this, data);
      this._id = data._id;
    }

    save() {
      return Promise.resolve(this);
    }

    toObject() {
      return {
        _id: this._id,
        ...this.data,
        date: this.data.date ? this.data.date.toISOString() : this.data.date,
      };
    }

    static find = jest.fn();
    static findById = jest.fn();
    static deleteOne = jest.fn();
  }

  beforeEach(async () => {
    // Mock ReporterService methods
    ReporterService.counter = jest.fn();
    ReporterService.incGauge = jest.fn();
    ReporterService.decGauge = jest.fn();
    ReporterService.histogram = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptService,
        {
          provide: getModelToken(Receipt.name),
          useValue: MockReceiptModel,
        },
        {
          provide: UserService,
          useValue: {
            // Mock methods used from UserService
            findEntityById: jest.fn(),
            getDecryptedApiKey: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReceiptService>(ReceiptService);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Tests for processReceipt method
  describe('processReceipt', () => {
    it('should throw an error if no image is provided', async () => {
      await expect(service.processReceipt(userId, null)).rejects.toThrow(
        new HttpException('No image uploaded', HttpStatus.BAD_REQUEST),
      );
    });

    it('should process the receipt image and return data', async () => {
      // Mock image file
      const image = {
        buffer: Buffer.from('test'),
        originalname: 'receipt.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      // Mock the processReceiptWithFlask method
      jest.spyOn(service as any, 'processReceiptWithFlask').mockResolvedValue({
        merchant_name: 'Test Store',
        date: '20/10/2023',
        total_cost: '100',
        category: 'Groceries',
        itemized_list: [
          {
            item_name: 'Milk',
            item_quantity: '2',
            item_cost: '10',
          },
        ],
      });

      const result = await service.processReceipt(userId, image);

      // Adjust the expected date to match the actual result
      expect(result).toEqual({
        id: '',
        merchantName: 'Test Store',
        date: result.date,
        totalCost: 100,
        category: 'Groceries',
        itemizedList: [
          {
            itemName: 'Milk',
            itemQuantity: 2,
            itemCost: 10,
          },
        ],
        userId: '',
      });

      // Assert that the date is correct (adjust for time zone if necessary)
      const expectedDate = new Date('2023-10-20T00:00:00.000Z');
      expect(new Date(result.date).toDateString()).toEqual(
        expectedDate.toDateString(),
      );
    });
  });

  // Tests for createReceipt method
  describe('createReceipt', () => {
    it('should create a receipt successfully', async () => {
      const createReceiptDto = {
        merchantName: 'Test Store',
        date: '2023-10-20T00:00:00.000Z',
        totalCost: 100,
        category: 'Groceries',
        itemizedList: [
          {
            itemName: 'Milk',
            itemQuantity: 2,
            itemCost: 10,
          },
        ],
      };

      const savedReceipt = new MockReceiptModel({
        _id: 'receiptId',
        userId: userId,
        ...createReceiptDto,
        date: new Date(createReceiptDto.date),
      });

      jest
        .spyOn(MockReceiptModel.prototype, 'save')
        .mockResolvedValue(savedReceipt);

      const result = await service.createReceipt(
        userId,
        createReceiptDto as any,
      );

      expect(result).toEqual({
        id: 'receiptId',
        userId: userId,
        ...createReceiptDto,
      });
    });

    it('should throw an error if date is invalid', async () => {
      const createReceiptDto = {
        merchantName: 'Test Store',
        date: 'invalid-date',
        totalCost: 100,
        category: 'Groceries',
        itemizedList: [],
      };

      await expect(
        service.createReceipt(userId, createReceiptDto as any),
      ).rejects.toThrow('Invalid date format');
    });
  });

  // Tests for updateReceipt method
  describe('updateReceipt', () => {
    it('should update a receipt successfully', async () => {
      const receiptId = 'receiptId';
      const updateReceiptDto = {
        merchantName: 'Updated Store',
        date: '2023-10-21T00:00:00.000Z',
        totalCost: 200,
        category: 'Electronics',
        itemizedList: [],
      };

      const existingReceipt = new MockReceiptModel({
        _id: receiptId,
        userId: userId,
        merchantName: 'Old Store',
        date: new Date('2023-10-20T00:00:00.000Z'),
        totalCost: 100,
        category: 'Groceries',
        itemizedList: [],
      });

      MockReceiptModel.findById = jest.fn().mockResolvedValue(existingReceipt);

      jest.spyOn(existingReceipt, 'save').mockResolvedValue(
        new MockReceiptModel({
          _id: receiptId,
          userId: userId,
          ...updateReceiptDto,
          date: new Date(updateReceiptDto.date),
        }),
      );

      const result = await service.updateReceipt(
        userId,
        receiptId,
        updateReceiptDto as any,
      );

      expect(result).toEqual({
        id: receiptId,
        userId: userId,
        ...updateReceiptDto,
      });
    });

    it('should throw an error if receipt not found', async () => {
      const receiptId = 'receiptId';
      const updateReceiptDto = {
        merchantName: 'Updated Store',
        date: '2023-10-21T00:00:00.000Z',
        totalCost: 200,
        category: 'Electronics',
        itemizedList: [],
      };

      MockReceiptModel.findById = jest.fn().mockResolvedValue(null);

      await expect(
        service.updateReceipt(userId, receiptId, updateReceiptDto as any),
      ).rejects.toThrow('Receipt not found or not owned by the user');
    });
  });

  // Tests for deleteReceipt method
  describe('deleteReceipt', () => {
    it('should delete a receipt successfully', async () => {
      const receiptId = 'receiptId';

      const existingReceipt = new MockReceiptModel({
        _id: receiptId,
        userId: userId,
      });

      MockReceiptModel.findById = jest.fn().mockResolvedValue(existingReceipt);
      MockReceiptModel.deleteOne = jest
        .fn()
        .mockResolvedValue({ deletedCount: 1 });

      const result = await service.deleteReceipt(userId, receiptId);

      expect(result).toEqual({ message: 'Receipt successfully deleted.' });
    });

    it('should throw an error if receipt not found', async () => {
      const receiptId = 'receiptId';

      MockReceiptModel.findById = jest.fn().mockResolvedValue(null);

      await expect(service.deleteReceipt(userId, receiptId)).rejects.toThrow(
        'Receipt not found or not owned by the user',
      );
    });
  });

  // Tests for getReceiptsByUser method
  describe('getReceiptsByUser', () => {
    it('should return receipts for the user', async () => {
      const receipts = [
        new MockReceiptModel({
          _id: 'receiptId1',
          userId: userId,
          merchantName: 'Store 1',
          date: new Date('2023-10-20T00:00:00.000Z'),
          totalCost: 100,
          category: 'Groceries',
          itemizedList: [],
        }),
        new MockReceiptModel({
          _id: 'receiptId2',
          userId: userId,
          merchantName: 'Store 2',
          date: new Date('2023-10-21T00:00:00.000Z'),
          totalCost: 200,
          category: 'Electronics',
          itemizedList: [],
        }),
      ];

      MockReceiptModel.find = jest.fn().mockResolvedValue(receipts);

      const result = await service.getReceiptsByUser(userId);

      expect(result).toEqual([
        {
          id: 'receiptId1',
          userId: userId,
          merchantName: 'Store 1',
          date: '2023-10-20T00:00:00.000Z',
          totalCost: 100,
          category: 'Groceries',
          itemizedList: [],
        },
        {
          id: 'receiptId2',
          userId: userId,
          merchantName: 'Store 2',
          date: '2023-10-21T00:00:00.000Z',
          totalCost: 200,
          category: 'Electronics',
          itemizedList: [],
        },
      ]);
    });
  });

  // Tests for getTransactionReview method
  describe('getTransactionReview', () => {
    it('should get transaction review successfully', async () => {
      const customPrompt = 'Summarize my spending habits';
      const receipts = [
        new MockReceiptModel({
          _id: 'receiptId1',
          userId: userId,
          merchantName: 'Store 1',
          date: new Date('2023-10-20T00:00:00.000Z'),
          totalCost: 100,
          category: 'Groceries',
          itemizedList: [],
        }),
      ];

      MockReceiptModel.find = jest.fn().mockResolvedValue(receipts);

      // Create a mock user object with all required properties
      const mockUser = {
        _id: 'userId',
        username: 'testuser',
        email: 'testuser@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'hashedpassword',
        securityQuestion: 'What is your pet’s name?',
        securityAnswer: 'hashedanswer',
        apiToken: {
          defaultModel: 'gemini',
          geminiKey: 'encryptedGeminiKey',
          openaiKey: 'encryptedOpenaiKey',
        },
      };

      // Adjust the mock implementation
      jest
        .spyOn(userService, 'findEntityById')
        .mockResolvedValue(mockUser as any);

      jest.spyOn(userService, 'getDecryptedApiKey').mockReturnValue({
        geminiKey: 'geminiKey',
        openaiKey: 'openaiKey',
      });

      // Mock axios.post
      (axios.post as jest.Mock).mockResolvedValue({
        data: 'Transaction review string',
      });

      const result = await service.getTransactionReview(userId, customPrompt);

      expect(result).toBe('Transaction review string');
      expect(axios.post).toHaveBeenCalledWith(
        'http://receipt-service:8081/review',
        expect.any(Object),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    });
  });
});
