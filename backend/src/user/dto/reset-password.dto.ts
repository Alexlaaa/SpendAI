import { IsNotEmpty, IsStrongPassword } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token received in the email',
    example: 'c02d1e8a-7861-4f0c-93f3-ff63b40eb6e8',
  })
  @IsNotEmpty()
  token: string;
  @ApiProperty({
    description: 'New password',
    example: 'NewP@ssword123',
  })
  @IsNotEmpty()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minNumbers: 1,
    minSymbols: 1,
    minUppercase: 1,
  })
  newPassword: string;
}
