import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiGenerationService } from './ai-generation.service';
import {
  GenerateLessonsDto,
  JobStatusResponseDto,
  AnalyzeDocumentDto,
  DocumentAnalysisResponseDto,
} from './dto/generate-lessons.dto';

@ApiTags('ai-generation')
@Controller('ai-generation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiGenerationController {
  constructor(private readonly aiGenerationService: AiGenerationService) {}

  @Post('analyze-document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Analyze document and get AI recommendations' })
  @ApiResponse({ status: 200, type: DocumentAnalysisResponseDto })
  async analyzeDocument(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<DocumentAnalysisResponseDto> {
    return this.aiGenerationService.analyzeDocument(file);
  }

  @Post('generate-lessons')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Generate lessons from uploaded document' })
  @ApiResponse({ status: 201, description: 'Lesson generation job created' })
  async generateLessons(
    @UploadedFile() file: Express.Multer.File,
    @Body('courseId') courseId: string,
    @Body('targetLessonCount') targetLessonCount: number,
    @CurrentUser() user: any,
  ) {
    return this.aiGenerationService.generateLessonsFromDocument(
      file,
      courseId,
      user.organizationId,
      user.id,
      targetLessonCount ? parseInt(targetLessonCount as any) : undefined,
    );
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List all generation jobs for organization' })
  @ApiResponse({ status: 200, description: 'List of jobs' })
  async listJobs(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.aiGenerationService.listJobs(
      user.organizationId,
      user.id,
      limit ? parseInt(limit as any) : 50,
    );
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get job status and results' })
  @ApiResponse({ status: 200, type: JobStatusResponseDto })
  async getJobStatus(
    @Param('jobId') jobId: string,
    @CurrentUser() user: any,
  ): Promise<JobStatusResponseDto> {
    return this.aiGenerationService.getJobStatus(jobId, user.organizationId);
  }

  @Delete('jobs/:jobId')
  @ApiOperation({ summary: 'Cancel a pending or running job' })
  @ApiResponse({ status: 200, description: 'Job cancelled successfully' })
  async cancelJob(
    @Param('jobId') jobId: string,
    @CurrentUser() user: any,
  ) {
    return this.aiGenerationService.cancelJob(jobId, user.organizationId);
  }
}
