// User & Auth Types
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

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  organizationId: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  firstName: string;
  lastName: string;
  organizationSlug: string;
  role?: UserRole;
}

// Organization Types
export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Course Types
export enum CourseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum CourseType {
  MICROLEARNING = 'MICROLEARNING',
  STANDARD = 'STANDARD',
  CERTIFICATION = 'CERTIFICATION',
}

export enum CourseDifficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  status: CourseStatus;
  type: CourseType;
  difficulty: CourseDifficulty;
  estimatedDuration: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    lessons: number;
    enrollments: number;
  };
}

// Lesson Types
export enum LessonType {
  TEXT = 'TEXT',
  VIDEO = 'VIDEO',
  INTERACTIVE = 'INTERACTIVE',
  QUIZ = 'QUIZ',
  ASSESSMENT = 'ASSESSMENT',
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  type: LessonType;
  order: number;
  duration?: number;
  courseId: string;
  videoId?: string;
  createdAt: string;
  updatedAt: string;
}

// Skill Types
export enum CompetencyLevel {
  AWARE = 'AWARE',
  NOVICE = 'NOVICE',
  COMPETENT = 'COMPETENT',
  PROFICIENT = 'PROFICIENT',
  EXPERT = 'EXPERT',
}

export interface Skill {
  id: string;
  name: string;
  description?: string;
  category?: string;
  parentSkillId?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

// Enrollment Types
export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DROPPED = 'DROPPED',
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  progress: number;
  enrolledAt: string;
  completedAt?: string;
  user?: User;
  course?: Course;
}

// Team Types
export enum TeamMemberRole {
  LEAD = 'LEAD',
  MEMBER = 'MEMBER',
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  parentTeamId?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    members: number;
  };
}

// AI Generation Types
export enum AiJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface AiGenerationJob {
  id: string;
  status: AiJobStatus;
  progress: number;
  targetLessonCount: number;
  generatedLessonsCount: number;
  courseId: string;
  userId: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// Analytics Types
export interface OverviewStats {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  courses: {
    total: number;
    published: number;
    draft: number;
  };
  enrollments: {
    total: number;
    active: number;
    completed: number;
    completionRate: number;
  };
}

export interface LearningActivity {
  date: string;
  enrollments: number;
  progress: number;
  completions: number;
}

export interface TopCourse {
  id: string;
  title: string;
  enrollments: number;
  completions: number;
  completionRate: number;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
