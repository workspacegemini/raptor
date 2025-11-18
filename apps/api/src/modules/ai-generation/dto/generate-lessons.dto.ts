import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional, IsUUID } from 'class-validator';

export class GenerateLessonsDto {
  @ApiProperty({ example: 'course-uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Document file (PDF, TXT, MD)' })
  file: any; // Handled by multer

  @ApiProperty({ example: 10, minimum: 5, maximum: 20, required: false })
  @IsNumber()
  @Min(5)
  @Max(20)
  @IsOptional()
  targetLessonCount?: number;
}

export class JobStatusResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] })
  status: string;

  @ApiProperty({ example: 75.5 })
  progress: number;

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty({ required: false })
  generatedLessons?: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  startedAt?: Date;

  @ApiProperty({ required: false })
  completedAt?: Date;
}

export class AnalyzeDocumentDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Document file (PDF, TXT, MD)' })
  file: any; // Handled by multer
}

export class DocumentAnalysisResponseDto {
  @ApiProperty()
  analysis: string;

  @ApiProperty()
  estimatedLessonCount: number;

  @ApiProperty()
  documentLength: number;
}
