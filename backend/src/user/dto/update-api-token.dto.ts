import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateApiTokenDto {
  @ApiProperty({
    description: 'Default model (GEMINI or OPENAI)',
    example: 'GEMINI',
  })
  @IsOptional()
  @IsString()
  readonly defaultModel?: string;

  @ApiProperty({
    description: 'Gemini API key',
    example: 'gemini_api_key',
  })
  @IsOptional()
  @IsString()
  readonly geminiKey?: string;

  @ApiProperty({
    description: 'OpenAI API key',
    example: 'openai_api_key',
  })
  @IsOptional()
  @IsString()
  readonly openaiKey?: string;
}
