import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginRequestDto {
  @ApiProperty({ description: 'Unique username of the user', example: 'user' })
  @IsNotEmpty()
  readonly username: string;

  @ApiProperty({ description: 'Password of the user', example: 'P@ssword123' })
  @IsNotEmpty()
  readonly password: string;
}
