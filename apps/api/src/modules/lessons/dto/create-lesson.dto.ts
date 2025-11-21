import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsArray, IsObject, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonType } from '../../../common/types/prisma-types';

export class CreateLessonDto {
  @ApiProperty({
    description: 'Lesson title',
    example: 'Introduction to Safety Protocols',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Lesson description',
    example: 'Learn the fundamental safety procedures for working on the manufacturing floor',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @ApiProperty({
    description: 'Lesson content in markdown format',
    example: '# Safety First\n\nAlways wear protective equipment...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Course ID this lesson belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiPropertyOptional({
    description: 'Lesson type',
    enum: LessonType,
    default: LessonType.TEXT,
  })
  @IsOptional()
  @IsEnum(LessonType)
  type?: LessonType;

  @ApiPropertyOptional({
    description: 'Lesson order in the course',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    description: 'Estimated duration in seconds',
    example: 300,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Video ID for video lessons',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  videoId?: string;

  @ApiPropertyOptional({
    description: 'Thumbnail URL',
    example: 'https://example.com/thumbnails/lesson-1.jpg',
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Additional resources (links, documents)',
    example: [{ title: 'Safety Manual', url: 'https://example.com/manual.pdf' }],
  })
  @IsOptional()
  @IsArray()
  resources?: any[];
}
