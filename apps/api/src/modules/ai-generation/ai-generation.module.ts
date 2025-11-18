import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AiGenerationController } from './ai-generation.controller';
import { AiGenerationService } from './ai-generation.service';
import { ClaudeService } from './services/claude.service';
import { EmbeddingsService } from './services/embeddings.service';
import { DocumentProcessorService } from './services/document-processor.service';
import { LessonGeneratorProcessor } from './processors/lesson-generator.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'lesson-generation',
    }),
  ],
  controllers: [AiGenerationController],
  providers: [
    AiGenerationService,
    ClaudeService,
    EmbeddingsService,
    DocumentProcessorService,
    LessonGeneratorProcessor,
  ],
  exports: [AiGenerationService, ClaudeService, EmbeddingsService],
})
export class AiGenerationModule {}
