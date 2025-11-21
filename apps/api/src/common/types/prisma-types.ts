/**
 * Temporary Prisma types export
 * This file provides enum exports that should normally come from @prisma/client
 * Created as a workaround for Prisma client generation issues
 */

export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  MANAGER = 'MANAGER',
  INSTRUCTOR = 'INSTRUCTOR',
  LEARNER = 'LEARNER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum TeamMemberRole {
  LEAD = 'LEAD',
  MEMBER = 'MEMBER',
}

export enum CompetencyLevel {
  AWARE = 'AWARE',
  NOVICE = 'NOVICE',
  COMPETENT = 'COMPETENT',
  PROFICIENT = 'PROFICIENT',
  EXPERT = 'EXPERT',
}

export enum CourseType {
  MICROLEARNING = 'MICROLEARNING',
  STANDARD = 'STANDARD',
  CERTIFICATION = 'CERTIFICATION',
}

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum CourseDifficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export enum LessonType {
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  INTERACTIVE = 'INTERACTIVE',
  QUIZ = 'QUIZ',
}

export enum VideoStatus {
  PREPARING = 'PREPARING',
  READY = 'READY',
  ERROR = 'ERROR',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  MULTIPLE_SELECT = 'MULTIPLE_SELECT',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
}

export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DROPPED = 'DROPPED',
}

export enum ProgressStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
