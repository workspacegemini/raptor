import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly openai: OpenAI;
  private readonly pinecone: Pinecone;
  private readonly indexName: string;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: config.get<string>('OPENAI_API_KEY') || '',
    });

    this.pinecone = new Pinecone({
      apiKey: config.get<string>('PINECONE_API_KEY') || '',
      environment: config.get<string>('PINECONE_ENVIRONMENT') || 'gcp-starter',
    });

    this.indexName = config.get<string>('PINECONE_INDEX') || 'epe-lessons';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    this.logger.log('Generating embedding for text');

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding', error);
      throw error;
    }
  }

  async storeLessonEmbedding(
    lessonId: string,
    embedding: number[],
    metadata: {
      courseId: string;
      organizationId: string;
      title: string;
      description: string;
      contentType: string;
    },
  ): Promise<void> {
    this.logger.log(`Storing embedding for lesson ${lessonId}`);

    try {
      const index = this.pinecone.Index(this.indexName);

      await index.upsert([
        {
          id: lessonId,
          values: embedding,
          metadata: {
            ...metadata,
            createdAt: new Date().toISOString(),
          },
        },
      ]);

      this.logger.log(`Successfully stored embedding for lesson ${lessonId}`);
    } catch (error) {
      this.logger.error('Failed to store embedding in Pinecone', error);
      // Don't throw - embedding storage is not critical for lesson creation
      // The embedding is already stored in the database
    }
  }

  async searchSimilarLessons(
    queryText: string,
    organizationId: string,
    limit: number = 10,
  ): Promise<
    Array<{
      lessonId: string;
      score: number;
      metadata: any;
    }>
  > {
    this.logger.log('Searching for similar lessons');

    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(queryText);

      const index = this.pinecone.Index(this.indexName);

      const queryResponse = await index.query({
        vector: queryEmbedding,
        topK: limit,
        filter: {
          organizationId: { $eq: organizationId },
        },
        includeMetadata: true,
      });

      return queryResponse.matches.map((match) => ({
        lessonId: match.id,
        score: match.score || 0,
        metadata: match.metadata,
      }));
    } catch (error) {
      this.logger.error('Failed to search similar lessons', error);
      return [];
    }
  }

  async deleteLessonEmbedding(lessonId: string): Promise<void> {
    this.logger.log(`Deleting embedding for lesson ${lessonId}`);

    try {
      const index = this.pinecone.Index(this.indexName);
      await index.deleteOne(lessonId);
    } catch (error) {
      this.logger.error('Failed to delete embedding from Pinecone', error);
      // Don't throw - this is a cleanup operation
    }
  }

  async deleteOrganizationEmbeddings(organizationId: string): Promise<void> {
    this.logger.log(`Deleting all embeddings for organization ${organizationId}`);

    try {
      const index = this.pinecone.Index(this.indexName);
      await index.deleteMany({
        organizationId: { $eq: organizationId },
      });
    } catch (error) {
      this.logger.error('Failed to delete organization embeddings from Pinecone', error);
      // Don't throw - this is a cleanup operation
    }
  }
}
