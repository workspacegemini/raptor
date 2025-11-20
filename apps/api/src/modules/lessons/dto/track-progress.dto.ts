import { IsOptional, IsInt, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TrackProgressDto {
  @ApiPropertyOptional({
    description: 'Progress percentage (0-100)',
    example: 75,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional({
    description: 'Last video position in seconds',
    example: 150,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  lastPosition?: number;

  @ApiPropertyOptional({
    description: 'Quiz score (0-100)',
    example: 85,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  quizScore?: number;
}
