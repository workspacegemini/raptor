import { IsString, IsNotEmpty, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderLessonsDto {
  @ApiProperty({
    description: 'Course ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  courseId: string;

  @ApiProperty({
    description: 'Ordered array of lesson IDs',
    example: [
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
      '123e4567-e89b-12d3-a456-426614174003',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  lessonIds: string[];
}
