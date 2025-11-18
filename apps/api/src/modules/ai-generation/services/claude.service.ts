import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface GeneratedLesson {
  title: string;
  description: string;
  content: string;
  duration: number;
  quiz: {
    question: string;
    options: string[];
    correctAnswers: number[];
    explanation: string;
  }[];
}

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly anthropic: Anthropic;

  constructor(private readonly config: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async generateLessonsFromDocument(
    documentText: string,
    targetLessonCount: number,
  ): Promise<GeneratedLesson[]> {
    this.logger.log(`Generating ${targetLessonCount} lessons from document`);

    const prompt = this.buildLessonGenerationPrompt(documentText, targetLessonCount);

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

      // Parse the JSON response
      const lessons = this.parseLessonsFromResponse(responseText);

      this.logger.log(`Successfully generated ${lessons.length} lessons`);
      return lessons;
    } catch (error) {
      this.logger.error('Failed to generate lessons', error);
      throw error;
    }
  }

  private buildLessonGenerationPrompt(documentText: string, targetCount: number): string {
    return `You are an expert instructional designer creating microlearning content for corporate training.

Your task is to analyze the following training document and break it down into ${targetCount} bite-sized microlearning lessons. Each lesson should be consumable in 3-5 minutes.

**DOCUMENT:**
${documentText}

**REQUIREMENTS:**

1. **Microlearning Focus**: Each lesson should cover ONE focused concept or skill
2. **Duration**: Target 180-300 seconds (3-5 minutes) of content per lesson
3. **Actionable**: Titles should be action-oriented (e.g., "How to...", "Understanding...", "Mastering...")
4. **Practical**: Content should be immediately applicable to real work scenarios
5. **Competency-based**: Focus on building real skills, not just knowledge transfer

**OUTPUT FORMAT:**

Return a JSON array of lessons with this exact structure:

\`\`\`json
[
  {
    "title": "Action-oriented title (<60 chars)",
    "description": "One sentence summary (<150 chars)",
    "content": "Markdown-formatted lesson content (3-5 min read). Include:\n- Clear introduction\n- Key concepts with examples\n- Practical application\n- Best practices\n- Common pitfalls to avoid",
    "duration": 240,
    "quiz": [
      {
        "question": "Question text that tests understanding",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswers": [0],
        "explanation": "Why this answer is correct and what learners should understand"
      },
      {
        "question": "Another question",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswers": [1, 2],
        "explanation": "Explanation for multiple correct answers"
      }
    ]
  }
]
\`\`\`

**GUIDELINES:**

- Create exactly ${targetCount} lessons
- Each lesson should have 2-3 quiz questions
- Use markdown for content (headings, lists, code blocks, emphasis)
- Duration should be realistic based on content length (avg reading speed: 200-250 words/min)
- Quiz questions should test application, not just recall
- Include scenario-based questions where appropriate
- Explanations should reinforce learning, not just state correctness

Return ONLY the JSON array, no additional text.`;
  }

  private parseLessonsFromResponse(responseText: string): GeneratedLesson[] {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/```\n([\s\S]*?)\n```/);

      const jsonText = jsonMatch ? jsonMatch[1] : responseText;

      const lessons = JSON.parse(jsonText);

      // Validate the structure
      if (!Array.isArray(lessons)) {
        throw new Error('Response is not an array');
      }

      // Validate each lesson
      lessons.forEach((lesson, index) => {
        if (!lesson.title || !lesson.description || !lesson.content) {
          throw new Error(`Lesson ${index} is missing required fields`);
        }

        if (!Array.isArray(lesson.quiz) || lesson.quiz.length === 0) {
          throw new Error(`Lesson ${index} has invalid quiz structure`);
        }

        // Ensure duration is set (default to 240 if not provided)
        lesson.duration = lesson.duration || 240;
      });

      return lessons;
    } catch (error) {
      this.logger.error('Failed to parse lessons from response', error);
      this.logger.debug('Response text:', responseText);
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  }

  async analyzeDocumentStructure(documentText: string): Promise<string> {
    this.logger.log('Analyzing document structure');

    const prompt = `Analyze this training document and provide a brief summary (2-3 sentences) of:
1. Main topics covered
2. Suggested number of microlearning lessons (3-5 minutes each)
3. Target audience/skill level

**DOCUMENT:**
${documentText.substring(0, 5000)}... ${documentText.length > 5000 ? '(truncated)' : ''}

Return a concise analysis.`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        temperature: 0.5,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      return message.content[0].type === 'text' ? message.content[0].text : '';
    } catch (error) {
      this.logger.error('Failed to analyze document', error);
      throw error;
    }
  }
}
