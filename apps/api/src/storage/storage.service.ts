import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import * as path from 'path';

export interface UploadOptions {
  folder?: string;
  filename?: string;
  contentType?: string;
  isPublic?: boolean;
}

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
  size: number;
  contentType: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client;
  private bucket: string;
  private region: string;
  private useLocalStorage: boolean;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get('S3_BUCKET', 'epe-storage');
    this.region = this.configService.get('S3_REGION', 'us-east-1');
    this.useLocalStorage = this.configService.get('USE_LOCAL_STORAGE', 'false') === 'true';

    const endpoint = this.configService.get('S3_ENDPOINT');
    const accessKeyId = this.configService.get('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('S3_SECRET_ACCESS_KEY');

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'S3 credentials not configured. File uploads will use local storage fallback.',
      );
      this.useLocalStorage = true;
    } else {
      this.s3Client = new S3Client({
        region: this.region,
        endpoint: endpoint || undefined,
        forcePathStyle: !!endpoint, // Required for MinIO
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      this.logger.log(
        `Storage service initialized: ${endpoint ? 'MinIO' : 'AWS S3'} (${this.bucket})`,
      );
    }
  }

  /**
   * Upload file to S3/MinIO
   */
  async uploadFile(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    try {
      const {
        folder = 'uploads',
        filename,
        contentType = file.mimetype,
        isPublic = false,
      } = options;

      // Generate unique filename
      const ext = path.extname(file.originalname);
      const uniqueName = filename || `${crypto.randomUUID()}${ext}`;
      const key = `${folder}/${uniqueName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: contentType,
        ContentLength: file.size,
        ACL: isPublic ? 'public-read' : 'private',
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      const url = isPublic
        ? this.getPublicUrl(key)
        : await this.getSignedDownloadUrl(key);

      this.logger.log(`File uploaded successfully: ${key}`);

      return {
        key,
        url,
        bucket: this.bucket,
        size: file.size,
        contentType,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: Express.Multer.File[],
    options: UploadOptions = {},
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) =>
      this.uploadFile(file, options),
    );
    return Promise.all(uploadPromises);
  }

  /**
   * Get signed download URL (valid for 1 hour)
   */
  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${error.message}`);
      throw new Error(`Failed to generate download URL: ${error.message}`);
    }
  }

  /**
   * Get signed upload URL (for direct client uploads)
   */
  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate signed upload URL: ${error.message}`);
      throw new Error(`Failed to generate upload URL: ${error.message}`);
    }
  }

  /**
   * Get public URL for public files
   */
  getPublicUrl(key: string): string {
    const endpoint = this.configService.get('S3_ENDPOINT');

    if (endpoint) {
      // MinIO or custom endpoint
      return `${endpoint}/${this.bucket}/${key}`;
    } else {
      // AWS S3
      return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(keys: string[]): Promise<void> {
    const deletePromises = keys.map((key) => this.deleteFile(key));
    await Promise.all(deletePromises);
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<any> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to get file metadata: ${error.message}`);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: Express.Multer.File, userId: string): Promise<UploadResult> {
    return this.uploadFile(file, {
      folder: 'avatars',
      filename: `${userId}${path.extname(file.originalname)}`,
      isPublic: true,
    });
  }

  /**
   * Upload course thumbnail
   */
  async uploadCourseThumbnail(file: Express.Multer.File, courseId: string): Promise<UploadResult> {
    return this.uploadFile(file, {
      folder: 'courses/thumbnails',
      filename: `${courseId}${path.extname(file.originalname)}`,
      isPublic: true,
    });
  }

  /**
   * Upload course material (private)
   */
  async uploadCourseMaterial(file: Express.Multer.File, courseId: string): Promise<UploadResult> {
    return this.uploadFile(file, {
      folder: `courses/${courseId}/materials`,
      isPublic: false,
    });
  }

  /**
   * Upload lesson video
   */
  async uploadLessonVideo(file: Express.Multer.File, lessonId: string): Promise<UploadResult> {
    return this.uploadFile(file, {
      folder: `lessons/${lessonId}/videos`,
      isPublic: false,
    });
  }

  /**
   * Upload certificate
   */
  async uploadCertificate(file: Express.Multer.File, userId: string, courseId: string): Promise<UploadResult> {
    return this.uploadFile(file, {
      folder: `certificates/${userId}`,
      filename: `${courseId}-${Date.now()}.pdf`,
      isPublic: false,
    });
  }

  /**
   * Upload organization logo
   */
  async uploadOrganizationLogo(file: Express.Multer.File, orgId: string): Promise<UploadResult> {
    return this.uploadFile(file, {
      folder: 'organizations/logos',
      filename: `${orgId}${path.extname(file.originalname)}`,
      isPublic: true,
    });
  }
}
