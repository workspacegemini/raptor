import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsArray, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseType, CourseDifficulty } from '../../../common/types/prisma-types';

export class CreateCourseDto {
  @ApiProperty({
    description: 'Course title',
    example: 'Safety Fundamentals for Manufacturing',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Course description',
    example: 'Comprehensive safety training for manufacturing floor workers',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({
    description: 'Course thumbnail URL',
    example: 'https://example.com/thumbnails/safety-101.jpg',
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Course type',
    enum: CourseType,
    default: CourseType.STANDARD,
  })
  @IsOptional()
  @IsEnum(CourseType)
  type?: CourseType;

  @ApiPropertyOptional({
    description: 'Estimated duration in seconds',
    example: 3600,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDuration?: number;

  @ApiPropertyOptional({
    description: 'Course difficulty level',
    enum: CourseDifficulty,
  })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({
    description: 'Course tags for categorization',
    example: ['safety', 'manufacturing', 'compliance'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
