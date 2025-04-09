import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  UsePipes,
  HttpCode,
  UploadedFile,
  UseInterceptors,
  Logger,
  Res,
  Req,
  Query,
  Patch,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  CreateUserDto,
  UpdateUserDto,
  LoginRequestDto,
  UserResponseDto,
  RequestPasswordResetDto,
  VerifySecurityQuestionDto,
  ResetPasswordDto,
  UpdateApiTokenDto,
  ApiTokenResponseDto,
  UpdateUserTierDto,
} from './dto';
import { ValidationPipe } from '../shared/pipes/validation.pipe';
import { User } from './user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response, Request } from 'express';
import { EncryptInterceptor } from '../shared/interceptors/encrypt.interceptor';

@ApiTags('users')
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(private readonly userService: UserService) {}

  @UsePipes(new ValidationPipe())
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiConsumes('multipart/form-data') // To handle file uploads
  @ApiResponse({
    status: 201,
    description: 'User successfully registered and logged in.',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Username or email already exists.',
  })
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('image')) // Handle file upload for image
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() image: Express.Multer.File, // multipart/form-data file is handled separately from other fields in the body, thus not automatically mapped to the DTO
    @Res({ passthrough: true }) res: Response, // Inject Response to modify cookies
  ): Promise<UserResponseDto> {
    createUserDto.image = image || null;

    // Get the user and token from the service
    const { user, token } = await this.userService.create(createUserDto);

    // Set the JWT token as an HttpOnly cookie
    res.cookie('jwt', token, {
      httpOnly: true, // Secure from JavaScript access
      // secure: true,
      sameSite: 'strict', // Helps mitigate CSRF
      maxAge: 60 * 60 * 1000, // Cookie expiration (1 hour)
    });

    return user; // Return user details only (no token)
  }

  @UsePipes(new ValidationPipe())
  @Put()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current logged in user profile' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Current logged in user profile successfully updated.',
    type: UserResponseDto,
  })
  @UseInterceptors(FileInterceptor('image'))
  async updateUser(
    @User('_id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() image: Express.Multer.File, // multipart/form-data file is handled separately from other fields in the body, thus not automatically mapped to the DTO
  ): Promise<UserResponseDto> {
    updateUserDto.image = image || null;
    return this.userService.update(userId, updateUserDto);
  }

  @UsePipes(new ValidationPipe())
  @Patch('tier')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current logged in user subscription tier' })
  @ApiResponse({
    status: 200,
    description: 'User tier successfully updated.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid tier value provided.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateUserTier(
    @User('_id') userId: string,
    @Body() updateUserTierDto: UpdateUserTierDto,
  ): Promise<UserResponseDto> {
    this.logger.log('Extracted user ID from decorator:', userId);
    return this.userService.updateTier(userId, updateUserTierDto.tier);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current logged in user details' })
  @ApiResponse({
    status: 200,
    description: 'Current logged in user details retrieved successfully.',
    type: UserResponseDto,
  })
  @HttpCode(200)
  async getCurrentUser(@User('_id') userId: string): Promise<UserResponseDto> {
    this.logger.log('Extracted user ID from decorator:', userId);
    return await this.userService.findById(userId);
  }

  @UsePipes(new ValidationPipe())
  @Put('api-token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update API tokens for the user' })
  @ApiResponse({
    status: 200,
    description: 'API tokens updated successfully.',
  })
  @HttpCode(200)
  async updateApiToken(
    @User('_id') userId: string,
    @Body() updateApiTokenDto: UpdateApiTokenDto,
  ): Promise<{ message: string }> {
    this.logger.log('Extracted user ID from decorator:', userId);
    await this.userService.updateApiToken(userId, updateApiTokenDto);
    return { message: 'API tokens updated successfully.' };
  }

  @Get('api-token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve API tokens for the user' })
  @ApiResponse({
    status: 200,
    description: 'API tokens retrieved successfully.',
    type: ApiTokenResponseDto,
  })
  async getApiToken(@User('_id') userId: string): Promise<ApiTokenResponseDto> {
    this.logger.log('Extracted user ID from decorator:', userId);
    return await this.userService.getApiToken(userId);
  }

  @Get('/v2/api-token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve API tokens for the user' })
  @ApiResponse({
    status: 200,
    description: 'API tokens retrieved successfully.',
    type: ApiTokenResponseDto,
  })
  @UseInterceptors(EncryptInterceptor) // Apply interceptor to encrypt outgoing response payload to frontend -> apiKey(s) are sensitive data
  async getApiTokenV2(
    @User('_id') userId: string,
  ): Promise<ApiTokenResponseDto> {
    this.logger.log('Extracted user ID from decorator:', userId);
    return await this.userService.getApiToken(userId);
  }

  @UsePipes(new ValidationPipe())
  @Post('login')
  @ApiOperation({ summary: 'Log in a user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in.',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials.',
  })
  @HttpCode(200)
  async login(
    @Body() loginUserDto: LoginRequestDto,
    @Res({ passthrough: true }) res: Response, // Inject Response to modify cookies
  ): Promise<UserResponseDto> {
    const { user, token } = await this.userService.login(loginUserDto);

    // Set the JWT token as an HttpOnly cookie
    res.cookie('jwt', token, {
      httpOnly: true, // Secure from JavaScript access
      // secure: true,
      sameSite: 'strict', // Helps mitigate CSRF
      maxAge: 60 * 60 * 1000, // Cookie expiration (1 hour)
    });

    return user;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Log out the current user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out.',
  })
  @ApiResponse({
    status: 401,
    description: 'User not logged in.',
  })
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response, @Req() req: Request): void {
    // Check if JWT cookie exists
    const jwtToken = req.cookies?.jwt;

    if (!jwtToken) {
      // If no JWT token is found, return 401
      res.status(401).json({ message: 'User not logged in.' });
      return;
    }

    // Clear the JWT cookie
    res.cookie('jwt', '', {
      httpOnly: true, // Secure from JavaScript access
      sameSite: 'strict', // Helps mitigate CSRF
      expires: new Date(0), // Set the cookie expiration to the past to delete it
    });
  }

  @Get('security-questions')
  @ApiOperation({ summary: 'Get list of security questions' })
  @ApiResponse({ status: 200, description: 'List of security questions' })
  @HttpCode(200)
  getSecurityQuestions(): { questions: string[] } {
    return { questions: this.userService.getSecurityQuestions() };
  }

  @Get('get-security-question')
  @ApiOperation({
    summary: 'Get user-specific security question for password reset',
  })
  @ApiQuery({
    name: 'token',
    type: String,
    description: 'The token sent to the user for password reset',
    required: true,
    example: 'c02d1e8a-7861-4f0c-93f3-ff63b40eb6e8',
  })
  @ApiResponse({
    status: 200,
    description: 'Security question retrieved successfully',
    schema: {
      example: {
        question: 'What is the name of your favorite childhood friend?',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
  })
  @HttpCode(200)
  async getSecurityQuestion(
    @Query('token') token: string,
  ): Promise<{ question: string }> {
    const securityQuestion = await this.userService.getSecurityQuestion(token);
    return { question: securityQuestion };
  }

  @UsePipes(new ValidationPipe())
  @Post('request-password-reset')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'Password reset link sent to email',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(200)
  async requestPasswordReset(
    @Body() requestPasswordResetDto: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    await this.userService.requestPasswordReset(requestPasswordResetDto);
    return { message: 'Password reset link sent to email' };
  }

  @UsePipes(new ValidationPipe())
  @Post('verify-security-question')
  @ApiOperation({ summary: 'Verify security question' })
  @ApiResponse({
    status: 200,
    description: 'Security question verification result',
    schema: {
      example: {
        verified: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
  })
  @HttpCode(200)
  async verifySecurityQuestion(
    @Body() verifySecurityQuestionDto: VerifySecurityQuestionDto,
  ): Promise<{ verified: boolean }> {
    const isVerified = await this.userService.verifySecurityQuestion(
      verifySecurityQuestionDto,
    );

    return { verified: isVerified };
  }

  @UsePipes(new ValidationPipe())
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({
    status: 200,
    description: 'Password successfully reset',
    schema: {
      example: { message: 'Password successfully reset' },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @HttpCode(200)
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.userService.resetPassword(resetPasswordDto);

    return { message: 'Password successfully reset' };
  }
}
