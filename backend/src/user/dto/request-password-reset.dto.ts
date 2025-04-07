import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'Email of the user',
    example: 'user@gmail.com',
  })
  @IsEmail()
  email: string;
}
