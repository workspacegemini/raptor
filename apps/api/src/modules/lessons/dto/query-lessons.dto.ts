import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LessonType } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryLessonsDto {
  @ApiPropertyOptional({
    description: 'Filter by lesson type',
    enum: LessonType,
  })
  @IsOptional()
  @IsEnum(LessonType)
  type?: LessonType;

  @ApiPropertyOptional({
    description: 'Filter by course ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({
    description: 'Search by title or description',
    example: 'safety',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
