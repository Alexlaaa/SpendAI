jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs'); // Import the actual 'fs' module
  return {
    ...originalFs, // Preserve all original 'fs' methods
    readFileSync: jest.fn((path: string, encoding: string) => {
      if (path === '/app/keys/backend_private.pem') {
        return 'mock_backend_private_key'; // Mocked content
      }
      if (path === '/app/keys/frontend_public.pem') {
        return 'mock_frontend_public_key'; // Mocked content
      }
      // For all other paths, use the real 'fs.readFileSync'
      return originalFs.readFileSync(path, encoding);
    }),
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import {
  CreateUserDto,
  UpdateUserDto,
  LoginRequestDto,
  RequestPasswordResetDto,
  VerifySecurityQuestionDto,
  ResetPasswordDto,
  UpdateApiTokenDto,
  ApiTokenResponseDto,
} from './dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { EncryptInterceptor } from '../shared/interceptors/encrypt.interceptor';

// Mock EncryptInterceptor that does not modify the response
@Injectable()
class MockEncryptInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle(); // Passes the response through unchanged
  }
}

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  // Mocked UserService with all necessary methods
  const mockUserService = {
    create: jest.fn(),
    login: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    updateApiToken: jest.fn(),
    getApiToken: jest.fn(),
    getSecurityQuestions: jest.fn(),
    getSecurityQuestion: jest.fn(),
    requestPasswordReset: jest.fn(),
    verifySecurityQuestion: jest.fn(),
    resetPassword: jest.fn(),
  };

  // Mocked Response object
  const mockResponse = {
    cookie: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        {
          provide: EncryptInterceptor, // Provide the interceptor
          useClass: MockEncryptInterceptor, // Use the mock implementation
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should register a new user and return user details', async () => {
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

      const mockUser = {
        id: 'user_id',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        image: 'ZGVmYXVsdF9pbWFnZQ==', // base64 of 'default_image'
        securityQuestion: 'What was your childhood nickname?',
      };

      const mockToken = 'test_token';

      // Mock the service.create method
      mockUserService.create.mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });

      // Simulate image upload as null
      const result = await controller.createUser(
        createUserDto,
        null,
        mockResponse,
      );

      expect(service.create).toHaveBeenCalledWith({
        ...createUserDto,
        image: null,
      });

      expect(mockResponse.cookie).toHaveBeenCalledWith('jwt', mockToken, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000, // 1 hour
      });

      expect(result).toEqual(mockUser);
    });

    it('should register a new user with an image and return user details', async () => {
      const createUserDto: CreateUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'Test@1234',
        securityQuestion: 'What was your childhood nickname?',
        securityAnswer: 'Fluffy',
        image: null, // Initially null, will be set by controller
      };

      const mockImage = {
        buffer: Buffer.from('image_data'),
        originalname: 'profile.png',
        mimetype: 'image/png',
        size: 1024,
      } as Express.Multer.File;

      const mockUser = {
        id: 'user_id',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        image: 'aW1hZ2VfZGF0YQ==', // base64 of 'image_data'
        securityQuestion: 'What was your childhood nickname?',
      };

      const mockToken = 'test_token';

      // Mock the service.create method
      mockUserService.create.mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });

      // Simulate image upload
      const result = await controller.createUser(
        createUserDto,
        mockImage,
        mockResponse,
      );

      expect(service.create).toHaveBeenCalledWith({
        ...createUserDto,
        image: mockImage,
      });

      expect(mockResponse.cookie).toHaveBeenCalledWith('jwt', mockToken, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000, // 1 hour
      });

      expect(result).toEqual(mockUser);
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

      // Mock the service.create method to throw an error
      mockUserService.create.mockRejectedValue(
        new HttpException('Username already exists', HttpStatus.BAD_REQUEST),
      );

      await expect(
        controller.createUser(createUserDto, null, mockResponse),
      ).rejects.toThrow(
        new HttpException('Username already exists', HttpStatus.BAD_REQUEST),
      );

      expect(service.create).toHaveBeenCalledWith({
        ...createUserDto,
        image: null,
      });

      // Ensure that cookie is not set in case of error
      expect(mockResponse.cookie).not.toHaveBeenCalled();
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

      // Mock the service.create method to throw an error
      mockUserService.create.mockRejectedValue(
        new HttpException('Email already exists', HttpStatus.BAD_REQUEST),
      );

      await expect(
        controller.createUser(createUserDto, null, mockResponse),
      ).rejects.toThrow(
        new HttpException('Email already exists', HttpStatus.BAD_REQUEST),
      );

      expect(service.create).toHaveBeenCalledWith({
        ...createUserDto,
        image: null,
      });

      // Ensure that cookie is not set in case of error
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should log in a user and return user details', async () => {
      const loginRequestDto: LoginRequestDto = {
        username: 'testuser',
        password: 'Test@1234',
      };

      const mockUser = {
        id: 'user_id',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        image: '', // No image set
      };

      const mockToken = 'test_token';

      // Mock the service.login method
      mockUserService.login.mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });

      const result = await controller.login(loginRequestDto, mockResponse);

      expect(service.login).toHaveBeenCalledWith(loginRequestDto);

      expect(mockResponse.cookie).toHaveBeenCalledWith('jwt', mockToken, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000, // 1 hour
      });

      expect(result).toEqual(mockUser);
    });

    it('should throw an error if credentials are invalid', async () => {
      const loginRequestDto: LoginRequestDto = {
        username: 'testuser',
        password: 'WrongPassword',
      };

      // Mock the service.login method to throw an error
      mockUserService.login.mockRejectedValue(
        new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED),
      );

      await expect(
        controller.login(loginRequestDto, mockResponse),
      ).rejects.toThrow(
        new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED),
      );

      expect(service.login).toHaveBeenCalledWith(loginRequestDto);

      // Ensure that cookie is not set in case of error
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it('should throw an error if user is not found', async () => {
      const loginRequestDto: LoginRequestDto = {
        username: 'nonexistentuser',
        password: 'Test@1234',
      };

      // Mock the service.login method to throw an error
      mockUserService.login.mockRejectedValue(
        new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED),
      );

      await expect(
        controller.login(loginRequestDto, mockResponse),
      ).rejects.toThrow(
        new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED),
      );

      expect(service.login).toHaveBeenCalledWith(loginRequestDto);

      // Ensure that cookie is not set in case of error
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear the JWT cookie', () => {
      const mockRequest = {
        cookies: { jwt: 'test_token' },
      } as any;

      controller.logout(mockResponse, mockRequest);

      expect(mockResponse.cookie).toHaveBeenCalledWith('jwt', '', {
        httpOnly: true,
        sameSite: 'strict',
        expires: new Date(0),
      });
    });

    it('should return 401 if user not logged in', () => {
      const mockRequest = {
        cookies: {},
      } as any;

      controller.logout(mockResponse, mockRequest);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'User not logged in.',
      });

      // Ensure that cookie is not set when user is not logged in
      expect(mockResponse.cookie).not.toHaveBeenCalledWith(
        'jwt',
        '',
        expect.any(Object),
      );
    });
  });

  describe('updateUser', () => {
    it('should update user details successfully', async () => {
      const userId = 'user_id';
      const updateUserDto: UpdateUserDto = {
        username: 'updateduser',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
      };

      const mockUser = {
        id: userId,
        username: 'updateduser',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
        image: '',
        securityQuestion: undefined,
      };

      // Mock the service.update method
      mockUserService.update.mockResolvedValue(mockUser);

      const mockImage = null; // No image upload

      const result = await controller.updateUser(
        userId,
        updateUserDto,
        mockImage,
      );

      expect(service.update).toHaveBeenCalledWith(userId, {
        ...updateUserDto,
        image: null,
      });

      expect(result).toEqual(mockUser);
    });

    it('should update user details with an image successfully', async () => {
      const userId = 'user_id';
      const updateUserDto: UpdateUserDto = {
        username: 'updateduser',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
      };

      const mockUser = {
        id: userId,
        username: 'updateduser',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
        image: 'aW1hZ2VfZGF0YQ==', // base64 of 'image_data'
        securityQuestion: undefined,
      };

      // Mock the service.update method
      mockUserService.update.mockResolvedValue(mockUser);

      const mockImage = {
        buffer: Buffer.from('image_data'),
        originalname: 'profile.png',
        mimetype: 'image/png',
        size: 2048,
      } as Express.Multer.File;

      const result = await controller.updateUser(
        userId,
        updateUserDto,
        mockImage,
      );

      expect(service.update).toHaveBeenCalledWith(userId, {
        ...updateUserDto,
        image: mockImage,
      });

      expect(result).toEqual(mockUser);
    });

    it('should throw an error if user not found', async () => {
      const userId = 'nonexistent_id';
      const updateUserDto: UpdateUserDto = {
        username: 'updateduser',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
      };

      // Mock the service.update method to throw an error
      mockUserService.update.mockRejectedValue(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      const mockImage = null;

      await expect(
        controller.updateUser(userId, updateUserDto, mockImage),
      ).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      expect(service.update).toHaveBeenCalledWith(userId, {
        ...updateUserDto,
        image: null,
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user details successfully', async () => {
      const userId = 'user_id';

      const mockUser = {
        id: 'user_id',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        image: '',
        securityQuestion: undefined,
      };

      // Mock the service.findById method
      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await controller.getCurrentUser(userId);

      expect(service.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it('should throw an error if user not found', async () => {
      const userId = 'nonexistent_id';

      // Mock the service.findById method to throw an error
      mockUserService.findById.mockRejectedValue(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      await expect(controller.getCurrentUser(userId)).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      expect(service.findById).toHaveBeenCalledWith(userId);
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

      // Mock the service.updateApiToken method
      mockUserService.updateApiToken.mockResolvedValue(undefined);

      const result = await controller.updateApiToken(userId, updateApiTokenDto);

      expect(service.updateApiToken).toHaveBeenCalledWith(
        userId,
        updateApiTokenDto,
      );

      expect(result).toEqual({ message: 'API tokens updated successfully.' });
    });

    it('should throw an error if user not found', async () => {
      const userId = 'nonexistent_id';
      const updateApiTokenDto: UpdateApiTokenDto = {
        defaultModel: 'GEMINI',
        geminiKey: 'gemini_test_key',
        openaiKey: 'openai_test_key',
      };

      // Mock the service.updateApiToken method to throw an error
      mockUserService.updateApiToken.mockRejectedValue(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      await expect(
        controller.updateApiToken(userId, updateApiTokenDto),
      ).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      expect(service.updateApiToken).toHaveBeenCalledWith(
        userId,
        updateApiTokenDto,
      );
    });
  });

  describe('getApiToken', () => {
    it('should retrieve API tokens successfully', async () => {
      const userId = 'user_id';

      const mockApiTokenResponse: ApiTokenResponseDto = {
        defaultModel: 'GEMINI',
        geminiKey: 'SET',
        openaiKey: 'SET',
      };

      // Mock the service.getApiToken method
      mockUserService.getApiToken.mockResolvedValue(mockApiTokenResponse);

      const result = await controller.getApiToken(userId);

      expect(service.getApiToken).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockApiTokenResponse);
    });

    it('should return UNSET if API keys are not set', async () => {
      const userId = 'user_id';

      const mockApiTokenResponse: ApiTokenResponseDto = {
        defaultModel: 'UNSET',
        geminiKey: 'UNSET',
        openaiKey: 'UNSET',
      };

      // Mock the service.getApiToken method
      mockUserService.getApiToken.mockResolvedValue(mockApiTokenResponse);

      const result = await controller.getApiToken(userId);

      expect(service.getApiToken).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockApiTokenResponse);
    });

    it('should throw an error if user not found', async () => {
      const userId = 'nonexistent_id';

      // Mock the service.getApiToken method to throw an error
      mockUserService.getApiToken.mockRejectedValue(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      await expect(controller.getApiToken(userId)).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      expect(service.getApiToken).toHaveBeenCalledWith(userId);
    });
  });

  describe('getSecurityQuestions', () => {
    it('should return a list of security questions', () => {
      const mockQuestions = [
        'What was your childhood nickname?',
        'In what city did you meet your spouse/significant other?',
        'What is the name of your favorite childhood friend?',
      ];

      // Mock the service.getSecurityQuestions method
      mockUserService.getSecurityQuestions.mockReturnValue(mockQuestions);

      const result = controller.getSecurityQuestions();

      expect(service.getSecurityQuestions).toHaveBeenCalled();
      expect(result).toEqual({ questions: mockQuestions });
    });
  });

  describe('getSecurityQuestion', () => {
    it('should return the user-specific security question successfully', async () => {
      const token = 'valid_token';
      const mockQuestion = 'What was your childhood nickname?';

      // Mock the service.getSecurityQuestion method
      mockUserService.getSecurityQuestion.mockResolvedValue(mockQuestion);

      const result = await controller.getSecurityQuestion(token);

      expect(service.getSecurityQuestion).toHaveBeenCalledWith(token);
      expect(result).toEqual({ question: mockQuestion });
    });

    it('should throw an error if token is invalid or expired', async () => {
      const token = 'invalid_token';

      // Mock the service.getSecurityQuestion method to throw an error
      mockUserService.getSecurityQuestion.mockRejectedValue(
        new HttpException('Invalid or expired token', HttpStatus.BAD_REQUEST),
      );

      await expect(controller.getSecurityQuestion(token)).rejects.toThrow(
        new HttpException('Invalid or expired token', HttpStatus.BAD_REQUEST),
      );

      expect(service.getSecurityQuestion).toHaveBeenCalledWith(token);
    });
  });

  describe('requestPasswordReset', () => {
    it('should initiate password reset and return success message', async () => {
      const requestPasswordResetDto: RequestPasswordResetDto = {
        email: 'test@example.com',
      };

      // Mock the service.requestPasswordReset method
      mockUserService.requestPasswordReset.mockResolvedValue(undefined);

      const result = await controller.requestPasswordReset(
        requestPasswordResetDto,
      );

      expect(service.requestPasswordReset).toHaveBeenCalledWith(
        requestPasswordResetDto,
      );

      expect(result).toEqual({
        message: 'Password reset link sent to email',
      });
    });

    it('should throw an error if user not found', async () => {
      const requestPasswordResetDto: RequestPasswordResetDto = {
        email: 'nonexistent@example.com',
      };

      // Mock the service.requestPasswordReset method to throw an error
      mockUserService.requestPasswordReset.mockRejectedValue(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      await expect(
        controller.requestPasswordReset(requestPasswordResetDto),
      ).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      expect(service.requestPasswordReset).toHaveBeenCalledWith(
        requestPasswordResetDto,
      );
    });
  });

  describe('verifySecurityQuestion', () => {
    it('should verify security question successfully', async () => {
      const verifySecurityQuestionDto: VerifySecurityQuestionDto = {
        token: 'reset_token',
        answer: 'Fluffy',
      };

      // Mock the service.verifySecurityQuestion method
      mockUserService.verifySecurityQuestion.mockResolvedValue(true);

      const result = await controller.verifySecurityQuestion(
        verifySecurityQuestionDto,
      );

      expect(service.verifySecurityQuestion).toHaveBeenCalledWith(
        verifySecurityQuestionDto,
      );

      expect(result).toEqual({ verified: true });
    });

    it('should return false if security answer is incorrect', async () => {
      const verifySecurityQuestionDto: VerifySecurityQuestionDto = {
        token: 'reset_token',
        answer: 'WrongAnswer',
      };

      // Mock the service.verifySecurityQuestion method
      mockUserService.verifySecurityQuestion.mockResolvedValue(false);

      const result = await controller.verifySecurityQuestion(
        verifySecurityQuestionDto,
      );

      expect(service.verifySecurityQuestion).toHaveBeenCalledWith(
        verifySecurityQuestionDto,
      );

      expect(result).toEqual({ verified: false });
    });

    it('should throw an error if token is invalid or expired', async () => {
      const verifySecurityQuestionDto: VerifySecurityQuestionDto = {
        token: 'invalid_token',
        answer: 'Fluffy',
      };

      // Mock the service.verifySecurityQuestion method to throw an error
      mockUserService.verifySecurityQuestion.mockRejectedValue(
        new HttpException('Invalid or expired token', HttpStatus.BAD_REQUEST),
      );

      await expect(
        controller.verifySecurityQuestion(verifySecurityQuestionDto),
      ).rejects.toThrow(
        new HttpException('Invalid or expired token', HttpStatus.BAD_REQUEST),
      );

      expect(service.verifySecurityQuestion).toHaveBeenCalledWith(
        verifySecurityQuestionDto,
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully and return success message', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'reset_token',
        newPassword: 'NewPass@1234',
      };

      // Mock the service.resetPassword method
      mockUserService.resetPassword.mockResolvedValue(undefined);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(service.resetPassword).toHaveBeenCalledWith(resetPasswordDto);

      expect(result).toEqual({ message: 'Password successfully reset' });
    });

    it('should throw an error if token is invalid or expired', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'invalid_token',
        newPassword: 'NewPass@1234',
      };

      // Mock the service.resetPassword method to throw an error
      mockUserService.resetPassword.mockRejectedValue(
        new HttpException('Invalid or expired token', HttpStatus.BAD_REQUEST),
      );

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(
        new HttpException('Invalid or expired token', HttpStatus.BAD_REQUEST),
      );

      expect(service.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
    });
  });
});
