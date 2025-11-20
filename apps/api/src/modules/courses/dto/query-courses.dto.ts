import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CourseType, CourseStatus, CourseDifficulty } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryCoursesDto {
  @ApiPropertyOptional({
    description: 'Filter by course status',
    enum: CourseStatus,
  })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({
    description: 'Filter by course type',
    enum: CourseType,
  })
  @IsOptional()
  @IsEnum(CourseType)
  type?: CourseType;

  @ApiPropertyOptional({
    description: 'Filter by difficulty level',
    enum: CourseDifficulty,
  })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

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
