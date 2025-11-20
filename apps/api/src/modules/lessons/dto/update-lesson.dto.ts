import { PartialType } from '@nestjs/swagger';
import { CreateLessonDto } from './create-lesson.dto';
import { OmitType } from '@nestjs/swagger';

// Omit courseId from updates as it shouldn't change
export class UpdateLessonDto extends PartialType(
  OmitType(CreateLessonDto, ['courseId'] as const)
) {}
