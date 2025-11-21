import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import pdfParse from 'pdf-parse';

@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);

  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly SUPPORTED_TYPES = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/md',
  ];

  async processDocument(file: Express.Multer.File): Promise<string> {
    this.logger.log(`Processing document: ${file.originalname}`);

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    // Validate file type
    if (!this.isValidFileType(file)) {
      throw new BadRequestException(
        'Unsupported file type. Please upload PDF, TXT, or MD files.',
      );
    }

    let text: string;

    if (file.mimetype === 'application/pdf') {
      text = await this.extractPdfText(file.buffer);
    } else {
      // Text or Markdown files
      text = file.buffer.toString('utf-8');
    }

    // Sanitize and validate
    text = this.sanitizeText(text);

    if (text.length < 100) {
      throw new BadRequestException('Document contains insufficient text (minimum 100 characters)');
    }

    if (text.length > 100000) {
      this.logger.warn('Document is very large, truncating to 100,000 characters');
      text = text.substring(0, 100000);
    }

    this.logger.log(`Extracted ${text.length} characters from document`);
    return text;
  }

  private async extractPdfText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      this.logger.error('Failed to extract PDF text', error);
      throw new BadRequestException('Failed to read PDF file. Ensure it contains extractable text.');
    }
  }

  private isValidFileType(file: Express.Multer.File): boolean {
    // Check mimetype
    if (this.SUPPORTED_TYPES.includes(file.mimetype)) {
      return true;
    }

    // Check file extension as fallback
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    return ['pdf', 'txt', 'md', 'markdown'].includes(extension || '');
  }

  private sanitizeText(text: string): string {
    // Remove null characters and control characters (except newlines and tabs)
    text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

    // Normalize whitespace
    text = text.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space
    text = text.replace(/\n{3,}/g, '\n\n'); // Multiple newlines to double newline

    // Trim
    text = text.trim();

    return text;
  }

  estimateLessonCount(text: string): number {
    // Average lesson should be 500-800 words
    // Average word length is ~5 characters + 1 space = 6 chars
    const wordCount = text.split(/\s+/).length;
    const estimatedLessons = Math.ceil(wordCount / 600);

    // Cap between 5 and 20 lessons
    return Math.min(Math.max(estimatedLessons, 5), 20);
  }
}
