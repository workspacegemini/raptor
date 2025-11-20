import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { StorageService } from './storage.service';
import { validateFileKey } from '../common/validators/file-key.validator';

@ApiTags('Storage')
@Controller('storage')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'Optional folder path',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
    @Query('isPublic') isPublic?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.storageService.uploadFile(file, {
      folder,
      isPublic: isPublic === 'true',
    });
  }

  @Post('upload/multiple')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return this.storageService.uploadFiles(files, { folder });
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Avatar uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate image file
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    // Limit size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    return this.storageService.uploadAvatar(file, user.id);
  }

  @Post('course/:courseId/thumbnail')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Upload course thumbnail' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Thumbnail uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCourseThumbnail(
    @Param('courseId') courseId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    return this.storageService.uploadCourseThumbnail(file, courseId);
  }

  @Post('course/:courseId/material')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Upload course material' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Material uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCourseMaterial(
    @Param('courseId') courseId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Limit size to 100MB
    if (file.size > 100 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 100MB');
    }

    return this.storageService.uploadCourseMaterial(file, courseId);
  }

  @Post('lesson/:lessonId/video')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Upload lesson video' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Video uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadLessonVideo(
    @Param('lessonId') lessonId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.mimetype.startsWith('video/')) {
      throw new BadRequestException('Only video files are allowed');
    }

    // Limit size to 500MB
    if (file.size > 500 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 500MB');
    }

    return this.storageService.uploadLessonVideo(file, lessonId);
  }

  @Post('organization/:orgId/logo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Upload organization logo' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Logo uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadOrganizationLogo(
    @Param('orgId') orgId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    return this.storageService.uploadOrganizationLogo(file, orgId);
  }

  @Get('signed-url/download/:key(*)')
  @ApiOperation({ summary: 'Get signed download URL' })
  @ApiResponse({ status: 200, description: 'Signed URL generated successfully' })
  async getSignedDownloadUrl(@Param('key') key: string) {
    validateFileKey(key);
    const url = await this.storageService.getSignedDownloadUrl(key);
    return { url };
  }

  @Get('signed-url/upload')
  @ApiOperation({ summary: 'Get signed upload URL for direct client upload' })
  @ApiResponse({ status: 200, description: 'Signed URL generated successfully' })
  async getSignedUploadUrl(
    @Query('key') key: string,
    @Query('contentType') contentType: string,
  ) {
    if (!key || !contentType) {
      throw new BadRequestException('Key and contentType are required');
    }

    validateFileKey(key);
    const url = await this.storageService.getSignedUploadUrl(key, contentType);
    return { url };
  }

  @Delete(':key(*)')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Delete file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async deleteFile(@Param('key') key: string) {
    validateFileKey(key);
    await this.storageService.deleteFile(key);
    return { message: 'File deleted successfully' };
  }

  @Get('exists/:key(*)')
  @ApiOperation({ summary: 'Check if file exists' })
  @ApiResponse({ status: 200, description: 'File existence checked' })
  async fileExists(@Param('key') key: string) {
    validateFileKey(key);
    const exists = await this.storageService.fileExists(key);
    return { exists };
  }

  @Get('metadata/:key(*)')
  @ApiOperation({ summary: 'Get file metadata' })
  @ApiResponse({ status: 200, description: 'File metadata retrieved' })
  async getFileMetadata(@Param('key') key: string) {
    validateFileKey(key);
    const metadata = await this.storageService.getFileMetadata(key);
    return metadata;
  }
}
