import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
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
} from './dto';
import * as jwt from 'jsonwebtoken';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid'; // For generating unique tokens
import * as nodemailer from 'nodemailer'; // For sending emails
import { google } from 'googleapis';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { UserDocument } from './schemas/user.schema';
import { TrackErrors } from '../metrics/function-error.decorator';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly securityQuestions: string[] = [
    'What was your childhood nickname?',
    'What is the name of your favorite childhood friend?',
    'What was the name of your first pet?',
    'What is your favorite movie?',
    "What is your neighbour's last name?",
  ];

  private defaultImagePath = path.join(
    __dirname,
    '..',
    '..',
    'public',
    'images',
    'default-profile-image.png',
  );

  // OAuth2 client setup
  private oauth2Client = new google.auth.OAuth2(
    process.env.OAUTH_CLIENT_ID, // ClientID
    process.env.OAUTH_CLIENT_SECRET, // Client Secret
    'https://developers.google.com/oauthplayground', // Redirect URL
  );

  // Encryption key and algorithm (Store the encryption key securely in environment variables)
  private readonly algorithm = 'aes-256-ctr';
  private readonly encryptionKey = scryptSync(
    process.env.ENCRYPTION_PASSWORD || 'default_secret_password',
    'salt',
    32,
  ); // Generate a 32-byte key using scryptSync

  // Utility method to encrypt the key
  private encrypt(text: string): string {
    const iv = randomBytes(16); // Generate a new IV for each encryption
    const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);
    const encryptedText = Buffer.concat([cipher.update(text), cipher.final()]);
    // Store IV with the encrypted text to use for decryption
    return `${iv.toString('hex')}:${encryptedText.toString('hex')}`;
  }

  // Utility method to decrypt the key
  private decrypt(encryptedText: string): string {
    if (!encryptedText || !encryptedText.includes(':')) {
      throw new Error(`Invalid encrypted key format ${encryptedText}`);
    }
    const [ivHex, encryptedData] = encryptedText.split(':');
    const ivBuffer = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      ivBuffer,
    );
    const decryptedText = Buffer.concat([
      decipher.update(Buffer.from(encryptedData, 'hex')),
      decipher.final(),
    ]);
    return decryptedText.toString();
  }

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {
    // Set OAuth2 credentials
    this.oauth2Client.setCredentials({
      refresh_token: process.env.OAUTH_REFRESH_TOKEN,
    });
  }

  // Create new user
  @TrackErrors
  async create(
    createUserDto: CreateUserDto,
  ): Promise<{ user: UserResponseDto; token: string }> {
    const { username, email, image } = createUserDto;

    // Check if username exists
    const existingUsername = await this.userModel.findOne({ username });
    if (existingUsername) {
      throw new HttpException(
        'Username already exists',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if email exists
    const existingEmail = await this.userModel.findOne({ email });
    if (existingEmail) {
      throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);
    }

    // Set the image or load default
    let imageBuffer: Buffer;
    if (image) {
      imageBuffer = Buffer.from(image.buffer); // Convert uploaded file buffer to MongoDB buffer
    } else {
      // If no image is uploaded, set default image
      imageBuffer = fs.readFileSync(this.defaultImagePath); // Load default image from the file system
    }

    // Create the new user with the provided data
    const user = new this.userModel({
      ...createUserDto,
      image: imageBuffer, // Save either uploaded or default image
    });

    // Save the user and generate a JWT token
    const savedUser = await user.save();

    const token = this.generateJWT(user);
    return {
      user: this.buildUserResponse(savedUser), // Return only the user response DTO
      token, // Return the token for setting the cookie
    };
  }

  // Update user details
  @TrackErrors
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    Object.assign(user, updateUserDto);

    // Handle image update (if not provided, treat it as user removing the image)
    if (updateUserDto.image) {
      // Convert uploaded image to buffer
      user.image = Buffer.from(updateUserDto.image.buffer);
    }

    // Save updated user
    await user.save();

    // Return updated user
    return this.buildUserResponse(user);
  }

  // Find user by ID
  @TrackErrors
  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return this.buildUserResponse(user);
  }

  // Retrieves raw entity by ID, required for authentication middleware
  @TrackErrors
  async findEntityById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  // Update API tokens
  @TrackErrors
  async updateApiToken(
    id: string,
    updateApiTokenDto: UpdateApiTokenDto,
  ): Promise<void> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    this.logger.log('updateApiTokenDto:', updateApiTokenDto);

    // Encrypt the API keys before saving them
    user.apiToken = {
      ...user.apiToken,
      ...updateApiTokenDto,
    };

    if (updateApiTokenDto.geminiKey) {
      user.apiToken.geminiKey = this.encrypt(updateApiTokenDto.geminiKey);
    }
    if (updateApiTokenDto.openaiKey) {
      user.apiToken.openaiKey = this.encrypt(updateApiTokenDto.openaiKey);
    }
    await user.save();
  }

  // Retrieve API tokens
  @TrackErrors
  async getApiToken(id: string): Promise<ApiTokenResponseDto> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return {
      defaultModel: user.apiToken?.defaultModel || 'UNSET',
      geminiKey: user.apiToken?.geminiKey ? 'SET' : 'UNSET',
      openaiKey: user.apiToken?.openaiKey ? 'SET' : 'UNSET',
    };
  }

  // Retrieve and decrypt the API key when needed
  @TrackErrors
  getDecryptedApiKey(
    user: UserDocument,
    model: string,
  ): { geminiKey: string; openaiKey: string } {
    const isKeySet =
      model === 'GEMINI' ? user.apiToken?.geminiKey : user.apiToken?.openaiKey;

    if (!isKeySet) {
      throw new HttpException(
        `API key for default model ${model} is not set`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      geminiKey: user.apiToken?.geminiKey
        ? this.decrypt(user.apiToken.geminiKey)
        : 'UNSET',
      openaiKey: user.apiToken?.openaiKey
        ? this.decrypt(user.apiToken.openaiKey)
        : 'UNSET',
    };
  }

  // Authenticate user during login
  @TrackErrors
  async login(
    loginRequestDto: LoginRequestDto,
  ): Promise<{ user: UserResponseDto; token: string }> {
    const { username, password } = loginRequestDto;
    const user = await this.userModel.findOne({ username });

    if (!user || !(await argon2.verify(user.password, password))) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    const token = this.generateJWT(user);
    return {
      user: this.buildUserResponse(user), // Return only the user response DTO
      token, // Return the token for setting the cookie
    };
  }

  // Generate JWT token
  generateJWT(user: UserDocument): string {
    console.log('generateJWT user._id:', user._id);
    return jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        tier: user.tier, // Add tier to JWT payload
      },
      this.configService.get('JWT_SECRET'),
      { expiresIn: '1h' },
    );
  }

  private buildUserResponse(user: UserDocument): UserResponseDto {
    // Convert the Mongoose model to a plain object
    const userObject = user.toObject({ versionKey: false });

    // Return only the required fields mapped to UserResponseDto
    return {
      id: userObject._id,
      username: userObject.username,
      email: userObject.email,
      firstName: userObject.firstName,
      lastName: userObject.lastName,
      image: userObject.image ? userObject.image.toString('base64') : '',
      securityQuestion: userObject.securityQuestion,
    };
  }

  // Get list of security questions
  getSecurityQuestions(): string[] {
    return this.securityQuestions;
  }

  // Fetch security question using the reset token
  @TrackErrors
  async getSecurityQuestion(token: string): Promise<string> {
    const user = await this.userModel.findOne({ passwordResetToken: token });
    if (!user || user.passwordResetTokenExpiry < new Date()) {
      throw new HttpException(
        'Invalid or expired token',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Return the user's security question
    return user.securityQuestion;
  }

  // Initiate password reset
  @TrackErrors
  async requestPasswordReset(
    requestPasswordResetDto: RequestPasswordResetDto,
  ): Promise<void> {
    const { email } = requestPasswordResetDto;
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Generate a reset token and set expiry duration
    const token = uuidv4();
    user.passwordResetToken = token;
    user.passwordResetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    await user.save();

    // Send email with reset link
    await this.sendResetEmail(user.email, token);
  }

  // Send reset email
  private async sendResetEmail(email: string, token: string): Promise<void> {
    // Obtain the access token from OAuth2 client (access token is short-lived, thus not defined in .env file)
    const accessToken = await this.oauth2Client.getAccessToken();
    // Configure email transport using OAuth2
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    // Send email
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'SpendAI - Password Reset Request',
      text: `Click the link to reset your password: ${resetLink}`,
    });
  }

  // Verify security question
  @TrackErrors
  async verifySecurityQuestion(
    verifySecurityQuestionDto: VerifySecurityQuestionDto,
  ): Promise<boolean> {
    const { token, answer } = verifySecurityQuestionDto;
    const user = await this.userModel.findOne({ passwordResetToken: token });
    if (!user || user.passwordResetTokenExpiry < new Date()) {
      throw new HttpException(
        'Invalid or expired token',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verify the answer
    return await argon2.verify(user.securityAnswer, answer.toLowerCase());
  }

  // Reset the password
  @TrackErrors
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, newPassword } = resetPasswordDto;
    const user = await this.userModel.findOne({ passwordResetToken: token });
    if (!user || user.passwordResetTokenExpiry < new Date()) {
      throw new HttpException(
        'Invalid or expired token',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Update the password
    user.password = await argon2.hash(newPassword);
    user.passwordResetToken = null;
    user.passwordResetTokenExpiry = null;

    await user.save();

    // Send a confirmation email
    await this.sendConfirmationEmail(user.email);
  }

  // Send confirmation email
  private async sendConfirmationEmail(email: string): Promise<void> {
    // Obtain the access token from OAuth2 client
    const accessToken = await this.oauth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'SpendAI - Password Changed',
      text: 'Your password has been successfully changed.',
    });
  }
}
