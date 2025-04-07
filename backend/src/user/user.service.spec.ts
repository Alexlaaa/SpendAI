import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as nodemailer from 'nodemailer';
import {
  CreateUserDto,
  LoginRequestDto,
  UpdateUserDto,
  UpdateApiTokenDto,
  ResetPasswordDto,
  VerifySecurityQuestionDto,
  RequestPasswordResetDto,
} from './dto';
import { ReporterService } from '../reporter/reporter.service';

jest.mock('jsonwebtoken');
jest.mock('googleapis', () => {
  return {
    google: {
      auth: {
        OAuth2: jest.fn().mockImplementation(() => {
          return {
            setCredentials: jest.fn(),
            getAccessToken: jest
              .fn()
              .mockResolvedValue({ token: 'test_access_token' }),
          };
        }),
      },
    },
  };
});
jest.mock('nodemailer');
jest.mock('fs');

class MockUserModel {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  securityQuestion: string;
  securityAnswer: string;
  image: Buffer;
  apiToken?: {
    defaultModel: string;
    geminiKey: string;
    openaiKey: string;
  };
  passwordResetToken: string;
  passwordResetTokenExpiry: Date;

  constructor(data: any) {
    Object.assign(this, data);
  }

  static findOne = jest.fn();
  static findById = jest.fn();
  static find = jest.fn();

  save(): Promise<this> {
    return Promise.resolve(this);
  }

  toObject(): any {
    return this;
  }
}

describe('UserService', () => {
  let service: UserService;

  const sendMailMock = jest.fn().mockResolvedValue(true);

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock argon2.hash
    (argon2.hash as jest.Mock).mockImplementation(async (data) => {
      // Check if data is the security answer
      if (data === 'fluffy' || data === 'Fluffy') {
        // Lowercase the security answer before hashing
        return `hashed_${data.toLowerCase()}`;
      }
      // For passwords, hash as is
      return `hashed_${data}`;
    });

    // Mock argon2.verify
    (argon2.verify as jest.Mock).mockImplementation(async (hash, data) => {
      // Check if hash matches hashed password
      if (hash === `hashed_${data}`) {
        return true;
      }
      // Check if hash matches hashed security answer (lowercased)
      return hash === `hashed_${data.toLowerCase()}`;
    });

    // Mock ReporterService methods
    ReporterService.counter = jest.fn();
    ReporterService.incGauge = jest.fn();
    ReporterService.decGauge = jest.fn();
    ReporterService.histogram = jest.fn();

    (jwt.sign as jest.Mock).mockImplementation((payload) => {
      console.log('jwt.sign called with payload:', payload);
      return 'test_token';
    });
    (jwt.verify as jest.Mock).mockImplementation((token) => {
      if (token === 'valid_token') {
        return {
          id: 'user_id',
          username: 'testuser',
          email: 'test@example.com',
        };
      } else {
        throw new Error('Invalid token');
      }
    });

    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });

    (fs.readFileSync as jest.Mock).mockReturnValue(
      Buffer.from('default_image'),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: MockUserModel,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test_jwt_secret'),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);

    // Mock encryption and decryption methods
    jest
      .spyOn(service as any, 'encrypt')
      .mockImplementation((text: string) => `encrypted_${text}`);
    jest.spyOn(service as any, 'decrypt').mockImplementation((text: string) => {
      if (text.startsWith('encrypted_')) {
        return text.replace('encrypted_', '');
      }
      throw new Error(`Invalid encrypted key format ${text}`);
    });
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const createUserDto: CreateUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'Test@1234',
        securityQuestion: 'What was your childhood nickname?',
        securityAnswer: 'Fluffy',
        image: null,
      };

      (MockUserModel.findOne as jest.Mock).mockResolvedValue(null);

      // Mock the save method to set _id
      jest
        .spyOn(MockUserModel.prototype, 'save')
        .mockImplementation(function () {
          this._id = 'user_id';
          return Promise.resolve(this);
        });

      // Mock the toObject method to return the user object with _id
      jest
        .spyOn(MockUserModel.prototype, 'toObject')
        .mockImplementation(function () {
          return { ...this };
        });

      const result = await service.create(createUserDto);

      expect(MockUserModel.findOne).toHaveBeenCalledTimes(2); // For username and email
      expect(fs.readFileSync).toHaveBeenCalled();

      expect(result).toEqual({
        user: {
          id: 'user_id',
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          image: Buffer.from('default_image').toString('base64'),
          securityQuestion: 'What was your childhood nickname?',
        },
        token: 'test_token',
      });

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 'user_id', username: 'testuser', email: 'test@example.com' },
        'test_jwt_secret',
        { expiresIn: '1h' },
      );
    });

    it('should throw an error if username already exists', async () => {
      const createUserDto: CreateUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'Test@1234',
        securityQuestion: 'What was your childhood nickname?',
        securityAnswer: 'Fluffy',
        image: null,
      };

      (MockUserModel.findOne as jest.Mock).mockImplementation((query) => {
        if (query.username === 'testuser') {
          return Promise.resolve({ username: 'testuser' });
        }
        return Promise.resolve(null);
      });

      await expect(service.create(createUserDto)).rejects.toThrow(
        new HttpException('Username already exists', HttpStatus.BAD_REQUEST),
      );

      expect(MockUserModel.findOne).toHaveBeenCalledWith({
        username: 'testuser',
      });
    });

    it('should throw an error if email already exists', async () => {
      const createUserDto: CreateUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'Test@1234',
        securityQuestion: 'What was your childhood nickname?',
        securityAnswer: 'Fluffy',
        image: null,
      };

      (MockUserModel.findOne as jest.Mock).mockImplementation((query) => {
        if (query.email === 'test@example.com') {
          return Promise.resolve({ email: 'test@example.com' });
        }
        return Promise.resolve(null);
      });

      await expect(service.create(createUserDto)).rejects.toThrow(
        new HttpException('Email already exists', HttpStatus.BAD_REQUEST),
      );

      expect(MockUserModel.findOne).toHaveBeenCalledWith({
        username: 'testuser',
      });
      expect(MockUserModel.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const loginRequestDto: LoginRequestDto = {
        username: 'testuser',
        password: 'Test@1234',
      };

      const user = new MockUserModel({
        _id: 'user_id',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed_Test@1234',
      });

      (MockUserModel.findOne as jest.Mock).mockResolvedValue(user);

      const result = await service.login(loginRequestDto);

      expect(MockUserModel.findOne).toHaveBeenCalledWith({
        username: 'testuser',
      });
      expect(argon2.verify).toHaveBeenCalledWith(
        'hashed_Test@1234',
        'Test@1234',
      );

      expect(result).toEqual({
        user: {
          id: 'user_id',
          username: 'testuser',
          email: 'test@example.com',
          firstName: undefined,
          lastName: undefined,
          image: '',
          securityQuestion: undefined,
        },
        token: 'test_token',
      });

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 'user_id', username: 'testuser', email: 'test@example.com' },
        'test_jwt_secret',
        { expiresIn: '1h' },
      );
    });

    it('should throw an error if credentials are invalid', async () => {
      const loginRequestDto: LoginRequestDto = {
        username: 'testuser',
        password: 'WrongPassword',
      };

      const user = new MockUserModel({
        _id: 'user_id',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed_Test@1234',
      });

      (MockUserModel.findOne as jest.Mock).mockResolvedValue(user);

      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginRequestDto)).rejects.toThrow(
        new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED),
      );

      expect(MockUserModel.findOne).toHaveBeenCalledWith({
        username: 'testuser',
      });
      expect(argon2.verify).toHaveBeenCalledWith(
        'hashed_Test@1234',
        'WrongPassword',
      );
    });

    it('should throw an error if user is not found', async () => {
      const loginRequestDto: LoginRequestDto = {
        username: 'nonexistentuser',
        password: 'Test@1234',
      };

      (MockUserModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.login(loginRequestDto)).rejects.toThrow(
        new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED),
      );

      expect(MockUserModel.findOne).toHaveBeenCalledWith({
        username: 'nonexistentuser',
      });
    });
  });

  describe('update', () => {
    it('should update user details successfully', async () => {
      const userId = 'user_id';
      const updateUserDto: UpdateUserDto = {
        username: 'updateduser',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
      };

      const existingUser = new MockUserModel({
        _id: userId,
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });

      (MockUserModel.findById as jest.Mock).mockResolvedValue(existingUser);

      jest.spyOn(existingUser, 'save').mockResolvedValue(existingUser);
      jest.spyOn(existingUser, 'toObject').mockReturnValue({
        _id: userId,
        ...updateUserDto,
      });

      const result = await service.update(userId, updateUserDto);

      expect(MockUserModel.findById).toHaveBeenCalledWith(userId);
      expect(existingUser.save).toHaveBeenCalled();

      expect(result).toEqual({
        id: userId,
        username: 'updateduser',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
        image: '',
        securityQuestion: undefined,
      });
    });

    it('should throw an error if user not found', async () => {
      const userId = 'nonexistent_id';
      const updateUserDto: UpdateUserDto = {
        username: 'updateduser',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
      };

      (MockUserModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.update(userId, updateUserDto)).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      expect(MockUserModel.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('findById', () => {
    it('should return user details successfully', async () => {
      const userId = 'user_id';

      const existingUser = new MockUserModel({
        _id: userId,
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });

      (MockUserModel.findById as jest.Mock).mockResolvedValue(existingUser);

      jest.spyOn(existingUser, 'toObject').mockReturnValue({
        _id: userId,
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });

      const result = await service.findById(userId);

      expect(MockUserModel.findById).toHaveBeenCalledWith(userId);

      expect(result).toEqual({
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        image: '',
        securityQuestion: undefined,
      });
    });

    it('should throw an error if user not found', async () => {
      const userId = 'nonexistent_id';

      (MockUserModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.findById(userId)).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      expect(MockUserModel.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateApiToken', () => {
    it('should update API tokens successfully', async () => {
      const userId = 'user_id';
      const updateApiTokenDto: UpdateApiTokenDto = {
        defaultModel: 'GEMINI',
        geminiKey: 'gemini_test_key',
        openaiKey: 'openai_test_key',
      };

      const existingUser = new MockUserModel({
        _id: userId,
        username: 'testuser',
        email: 'test@example.com',
      });

      (MockUserModel.findById as jest.Mock).mockResolvedValue(existingUser);
      jest.spyOn(existingUser, 'save').mockResolvedValue(existingUser);

      await service.updateApiToken(userId, updateApiTokenDto);

      expect(MockUserModel.findById).toHaveBeenCalledWith(userId);
      expect(existingUser.save).toHaveBeenCalled();

      // Verify that the API tokens are encrypted and saved
      expect(existingUser.apiToken.defaultModel).toBe('GEMINI');
      expect(existingUser.apiToken.geminiKey).toBe('encrypted_gemini_test_key');
      expect(existingUser.apiToken.openaiKey).toBe('encrypted_openai_test_key');
    });

    it('should throw an error if user not found', async () => {
      const userId = 'nonexistent_id';
      const updateApiTokenDto: UpdateApiTokenDto = {
        defaultModel: 'GEMINI',
        geminiKey: 'gemini_test_key',
        openaiKey: 'openai_test_key',
      };

      (MockUserModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateApiToken(userId, updateApiTokenDto),
      ).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      expect(MockUserModel.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('getApiToken', () => {
    it('should get API tokens successfully', async () => {
      const userId = 'user_id';

      const existingUser = new MockUserModel({
        _id: userId,
        username: 'testuser',
        email: 'test@example.com',
        apiToken: {
          defaultModel: 'GEMINI',
          geminiKey: 'encrypted_gemini_key',
          openaiKey: 'encrypted_openai_key',
        },
      });

      (MockUserModel.findById as jest.Mock).mockResolvedValue(existingUser);

      const result = await service.getApiToken(userId);

      expect(MockUserModel.findById).toHaveBeenCalledWith(userId);

      expect(result).toEqual({
        defaultModel: 'GEMINI',
        geminiKey: 'SET',
        openaiKey: 'SET',
      });
    });

    it('should return UNSET if API keys are not set', async () => {
      const userId = 'user_id';

      const existingUser = new MockUserModel({
        _id: userId,
        username: 'testuser',
        email: 'test@example.com',
      });

      (MockUserModel.findById as jest.Mock).mockResolvedValue(existingUser);

      const result = await service.getApiToken(userId);

      expect(MockUserModel.findById).toHaveBeenCalledWith(userId);

      expect(result).toEqual({
        defaultModel: 'UNSET',
        geminiKey: 'UNSET',
        openaiKey: 'UNSET',
      });
    });

    it('should throw an error if user not found', async () => {
      const userId = 'nonexistent_id';

      (MockUserModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getApiToken(userId)).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      expect(MockUserModel.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('getDecryptedApiKey', () => {
    it('should get decrypted API keys successfully for GEMINI', () => {
      const user = new MockUserModel({
        apiToken: {
          defaultModel: 'GEMINI',
          geminiKey: 'encrypted_gemini_key',
          openaiKey: 'encrypted_openai_key',
        },
      });

      const result = service.getDecryptedApiKey(user as any, 'GEMINI');

      expect(result).toEqual({
        geminiKey: 'gemini_key',
        openaiKey: 'openai_key',
      });
    });

    it('should throw an error if API key for model is not set', () => {
      const user = new MockUserModel({
        apiToken: {
          defaultModel: 'GEMINI',
          geminiKey: '',
          openaiKey: '',
        },
      });

      expect(() => service.getDecryptedApiKey(user as any, 'GEMINI')).toThrow(
        new HttpException(
          'API key for default model GEMINI is not set',
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('should initiate password reset and send email', async () => {
      const requestPasswordResetDto: RequestPasswordResetDto = {
        email: 'test@example.com',
      };

      const user = new MockUserModel({
        _id: 'user_id',
        email: 'test@example.com',
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
      });

      (MockUserModel.findOne as jest.Mock).mockResolvedValue(user);
      jest.spyOn(user, 'save').mockResolvedValue(user);

      // Mock the private method 'sendResetEmail'
      const sendResetEmailSpy = jest
        .spyOn<any, any>(service, 'sendResetEmail')
        .mockResolvedValue(undefined);

      await service.requestPasswordReset(requestPasswordResetDto);

      expect(MockUserModel.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(user.save).toHaveBeenCalled();

      expect(sendResetEmailSpy).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
      );

      expect(user.passwordResetToken).toBeDefined();
      expect(user.passwordResetTokenExpiry).toBeDefined();
    });

    it('should throw an error if user not found', async () => {
      const requestPasswordResetDto: RequestPasswordResetDto = {
        email: 'nonexistent@example.com',
      };

      (MockUserModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.requestPasswordReset(requestPasswordResetDto),
      ).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      expect(MockUserModel.findOne).toHaveBeenCalledWith({
        email: 'nonexistent@example.com',
      });
    });
  });

  describe('verifySecurityQuestion', () => {
    it('should verify security question successfully', async () => {
      const verifySecurityQuestionDto: VerifySecurityQuestionDto = {
        token: 'reset_token',
        answer: 'Fluffy',
      };

      const user = new MockUserModel({
        _id: 'user_id',
        passwordResetToken: 'reset_token',
        passwordResetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
        securityAnswer: 'hashed_fluffy',
      });

      (MockUserModel.findOne as jest.Mock).mockResolvedValue(user);

      const result = await service.verifySecurityQuestion(
        verifySecurityQuestionDto,
      );

      expect(MockUserModel.findOne).toHaveBeenCalledWith({
        passwordResetToken: 'reset_token',
      });
      expect(argon2.verify).toHaveBeenCalledWith('hashed_fluffy', 'fluffy');

      expect(result).toBe(true);
    });

    it('should return false if security answer is incorrect', async () => {
      const verifySecurityQuestionDto: VerifySecurityQuestionDto = {
        token: 'reset_token',
        answer: 'WrongAnswer',
      };

      const user = new MockUserModel({
        _id: 'user_id',
        passwordResetToken: 'reset_token',
        passwordResetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
        securityAnswer: 'hashed_fluffy',
      });

      (MockUserModel.findOne as jest.Mock).mockResolvedValue(user);

      (argon2.verify as jest.Mock).mockResolvedValue(false);

      const result = await service.verifySecurityQuestion(
        verifySecurityQuestionDto,
      );

      expect(MockUserModel.findOne).toHaveBeenCalledWith({
        passwordResetToken: 'reset_token',
      });
      expect(argon2.verify).toHaveBeenCalledWith(
        'hashed_fluffy',
        'wronganswer',
      );

      expect(result).toBe(false);
    });

    it('should throw an error if token is invalid or expired', async () => {
      const verifySecurityQuestionDto: VerifySecurityQuestionDto = {
        token: 'invalid_token',
        answer: 'Fluffy',
      };

      (MockUserModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.verifySecurityQuestion(verifySecurityQuestionDto),
      ).rejects.toThrow(
        new HttpException('Invalid or expired token', HttpStatus.BAD_REQUEST),
      );

      expect(MockUserModel.findOne).toHaveBeenCalledWith({
        passwordResetToken: 'invalid_token',
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'reset_token',
        newPassword: 'NewPass@1234',
      };

      const user = new MockUserModel({
        _id: 'user_id',
        email: 'test@example.com',
        passwordResetToken: 'reset_token',
        passwordResetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
      });

      (MockUserModel.findOne as jest.Mock).mockResolvedValue(user);
      jest.spyOn(user, 'save').mockResolvedValue(user);

      // Mock the private method 'sendConfirmationEmail'
      const sendConfirmationEmailSpy = jest
        .spyOn<any, any>(service, 'sendConfirmationEmail')
        .mockResolvedValue(undefined);

      await service.resetPassword(resetPasswordDto);

      expect(MockUserModel.findOne).toHaveBeenCalledWith({
        passwordResetToken: 'reset_token',
      });
      expect(user.save).toHaveBeenCalled();

      expect(sendConfirmationEmailSpy).toHaveBeenCalledWith('test@example.com');

      expect(user.password).toBe('hashed_NewPass@1234');
      expect(user.passwordResetToken).toBeNull();
      expect(user.passwordResetTokenExpiry).toBeNull();
    });

    it('should throw an error if token is invalid or expired', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'invalid_token',
        newPassword: 'NewPass@1234',
      };

      (MockUserModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        new HttpException('Invalid or expired token', HttpStatus.BAD_REQUEST),
      );

      expect(MockUserModel.findOne).toHaveBeenCalledWith({
        passwordResetToken: 'invalid_token',
      });
    });
  });
});
