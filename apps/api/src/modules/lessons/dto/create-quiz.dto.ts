import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsArray, IsEnum, Min, Max, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { QuestionType } from '../../../common/types/prisma-types';

export class QuizQuestionDto {
  @ApiProperty({
    description: 'Question text',
    example: 'What is the first step in the safety protocol?',
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiPropertyOptional({
    description: 'Explanation for the correct answer',
    example: 'Always start by putting on protective equipment to ensure safety.',
  })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiProperty({
    description: 'Question type',
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiPropertyOptional({
    description: 'Question order in quiz',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiProperty({
    description: 'Array of answer options',
    example: ['Put on protective equipment', 'Start working', 'Read the manual', 'Ask supervisor'],
  })
  @IsArray()
  @IsString({ each: true })
  options: string[];

  @ApiProperty({
    description: 'Array of correct answer indices (0-based)',
    example: [0],
  })
  @IsArray()
  @IsInt({ each: true })
  correctAnswers: number[];

  @ApiPropertyOptional({
    description: 'Points awarded for correct answer',
    example: 10,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;
}

export class CreateQuizDto {
  @ApiProperty({
    description: 'Quiz title',
    example: 'Safety Fundamentals Assessment',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Quiz description',
    example: 'Test your knowledge of fundamental safety procedures',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Passing score percentage',
    example: 70,
    default: 70,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passingScore?: number;

  @ApiPropertyOptional({
    description: 'Randomize question order',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  randomize?: boolean;

  @ApiProperty({
    description: 'Quiz questions',
    type: [QuizQuestionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions: QuizQuestionDto[];
}
