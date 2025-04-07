import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class VerifySecurityQuestionDto {
  @ApiProperty({
    description:
      "Token received in the email, that is appended to the URL (after '?token=' segment)",
    example: 'c02d1e8a-7861-4f0c-93f3-ff63b40eb6e8',
  })
  @IsNotEmpty()
  token: string;
  @ApiProperty({
    description: 'Answer to the security question',
    example: 'Rex',
  })
  @IsNotEmpty()
  answer: string;
}
