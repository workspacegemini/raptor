# Enterprise Performance Engine (EPE)

> AI-native corporate learning platform focused on competency-based credentials, team-oriented goals, and mobile-first microlearning for deskless workers.

## 🎯 Vision

80% of corporate gamification fails because it creates toxic competition and focuses on superficial points rather than real competency development. EPE solves this by:

- **Competency-based credentials** over vanity points
- **Team-oriented goals** over individual competition
- **Mobile-first microlearning** (3-5 min lessons) for deskless workers
- **AI-powered content generation** from training documents
- **Just-in-time learning** via QR codes on equipment

## 🏗️ Architecture

```
enterprise-performance-engine/
├── apps/
│   ├── api/              # NestJS backend (✅ IMPLEMENTED)
│   ├── admin-web/        # Next.js admin dashboard (✅ IMPLEMENTED)
│   └── mobile/           # React Native Expo app (🔜 TODO)
├── libs/
│   ├── shared/           # Shared types and utilities
│   └── api-client/       # API client library
├── infrastructure/
│   ├── docker/           # Docker configurations
│   └── terraform/        # Infrastructure as code
└── docs/                 # Additional documentation
```

## ✨ Key Features Implemented

### 🔐 Authentication & Authorization
- JWT-based authentication with access + refresh tokens
- Role-based access control (RBAC) - 5 roles (SUPER_ADMIN, ORG_ADMIN, MANAGER, INSTRUCTOR, LEARNER)
- Multi-tenant organization support with complete isolation
- Secure password hashing (bcrypt, 12 rounds)
- Session management with refresh token rotation
- Password reset and profile management

### 🤖 AI Content Generation (THE KILLER FEATURE)
- **Upload any training document** (PDF, TXT, MD) up to 10MB
- **AI analyzes and generates** 5-20 microlearning lessons automatically
- Each lesson includes:
  - Action-oriented title
  - Clear description
  - 3-5 minute markdown content
  - 2-3 assessment questions with explanations
- **Powered by Claude 3.5 Sonnet** for intelligent content breakdown
- **Async job processing** with real-time progress tracking
- Job status monitoring and cancellation

### 🔍 Vector Search & Embeddings
- **OpenAI text-embedding-ada-002** for semantic understanding
- **Pinecone vector database** for similarity search
- Find relevant lessons across your entire content library
- Automatic embedding generation for all lessons

### 🏢 Organizations Module
- Full CRUD operations for organizations
- Organization settings management (branding, features, limits)
- Organization statistics (users, courses, enrollments, completion rates)
- Suspension and activation controls
- Multi-tenant data isolation

### 👥 Users Module
- Complete user lifecycle management (12 endpoints)
- User profiles with avatars
- Progress tracking per user (enrollments, lessons, competencies)
- Competency-based skill tracking (AWARE → EXPERT)
- Secure password management with session invalidation
- Last login tracking
- User statistics and analytics

### 📚 Courses Module
- Full CRUD operations for courses
- Publishing workflow (DRAFT → PUBLISHED → ARCHIVED)
- Course types (MICROLEARNING, STANDARD, CERTIFICATION)
- Difficulty levels (BEGINNER, INTERMEDIATE, ADVANCED, EXPERT)
- Skill associations for competency tracking
- Course statistics (enrollments, completion rates)

### 🏷️ Skills Module
- Hierarchical skill taxonomy with parent-child relationships
- Full CRUD operations (7 endpoints)
- Category-based organization
- Circular reference prevention
- Usage tracking (courses using skill, users with competency)
- Skill tree visualization support

### 📖 Lessons Module
- Full CRUD operations for lessons
- Lesson types (TEXT, VIDEO, INTERACTIVE, QUIZ, ASSESSMENT)
- Progress tracking per user per lesson
- Quiz management with multiple question types
- Lesson reordering within courses
- Video integration support
- Comprehensive statistics (views, completions, average progress)

### 🎓 Enrollments Module
- Enroll/unenroll functionality
- Bulk enrollment support
- Automatic progress calculation
- Team-based enrollments
- Leaderboard functionality
- Enrollment statistics (completion rates, drop rates)
- Status tracking (ACTIVE, COMPLETED, DROPPED)

### 👨‍👩‍👧‍👦 Teams Module
- Hierarchical team structure with unlimited depth
- Member management (add, remove, update roles)
- Team roles (LEAD, MEMBER)
- Circular reference prevention
- Team hierarchy visualization
- Team statistics (members, enrollments, completion rates)
- Parent-child team relationships

### 📊 Analytics Module
- Organization overview statistics (cached for performance)
- Learning activity trends (enrollments, progress, completions over time)
- Top courses by enrollment and completion
- User engagement metrics
- Competency matrix (skill distribution across users)
- Team performance comparison
- AI generation statistics
- Data export functionality (users, enrollments, progress, competencies)

### 🏗️ Infrastructure & Production Ready
- **Winston logging** with daily rotation (combined, error, access logs)
- **Redis caching** with cache-aside pattern for performance
- **Health checks** for K8s (liveness, readiness probes)
- **Global exception handling** with Prisma error mapping
- **Request/response logging** with performance tracking
- **Structured logging** for production monitoring
- **Rate limiting** (100 req/min per IP)
- **Security headers** with Helmet
- **Soft deletes** for audit trails

### 📊 Comprehensive Data Model
- **Multi-tenant**: Full organization isolation
- **Users & Teams**: Hierarchical team structure
- **Courses & Lessons**: Flexible content organization
- **Skills Taxonomy**: Hierarchical competency tracking
- **Progress Tracking**: Detailed learner analytics
- **Quizzes**: Multiple question types with scoring
- **Video Integration**: Ready for Mux streaming
- **Analytics Events**: Comprehensive event tracking

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+
- Redis 6+
- API Keys:
  - Anthropic (Claude)
  - OpenAI
  - Pinecone

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd enterprise-performance-engine
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd apps/api && npm install
   ```

3. **Configure environment variables**
   ```bash
   cd apps/api
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Setup database**
   ```bash
   cd apps/api
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. **Start services**
   ```bash
   # Terminal 1: Redis
   redis-server

   # Terminal 2: PostgreSQL (or use managed service)

   # Terminal 3: API Server
   cd apps/api
   npm run dev
   ```

6. **Access the API**
   - API: http://localhost:3001
   - Swagger Docs: http://localhost:3001/api/docs
   - Health Check: http://localhost:3001/api/v1/health

## 📖 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "john.doe@acme.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "organizationSlug": "acme-corp",
  "role": "LEARNER"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john.doe@acme.com",
  "password": "SecurePass123!"
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### AI Content Generation Endpoints

#### Analyze Document
```http
POST /api/v1/ai-generation/analyze-document
Authorization: Bearer <access-token>
Content-Type: multipart/form-data

file: <PDF/TXT/MD file>
```

Response:
```json
{
  "analysis": "This document covers safety procedures for...",
  "estimatedLessonCount": 8,
  "documentLength": 15420
}
```

#### Generate Lessons from Document
```http
POST /api/v1/ai-generation/generate-lessons
Authorization: Bearer <access-token>
Content-Type: multipart/form-data

courseId: uuid-of-target-course
file: <PDF/TXT/MD file>
targetLessonCount: 10 (optional, 5-20)
```

Response:
```json
{
  "jobId": "job-uuid",
  "status": "PENDING",
  "targetLessonCount": 10
}
```

#### Check Job Status
```http
GET /api/v1/ai-generation/jobs/{jobId}
Authorization: Bearer <access-token>
```

Response:
```json
{
  "id": "job-uuid",
  "status": "COMPLETED",
  "progress": 100,
  "generatedLessons": [
    {
      "id": "lesson-uuid-1",
      "title": "Understanding Safety Protocols",
      "description": "Learn the core safety procedures"
    }
  ],
  "createdAt": "2024-01-15T10:00:00Z",
  "completedAt": "2024-01-15T10:05:30Z"
}
```

#### List Jobs
```http
GET /api/v1/ai-generation/jobs?limit=50
Authorization: Bearer <access-token>
```

#### Cancel Job
```http
DELETE /api/v1/ai-generation/jobs/{jobId}
Authorization: Bearer <access-token>
```

## 🗄️ Database Schema

### Core Entities

- **Organization**: Multi-tenant container with settings
- **User**: Learners, instructors, admins with RBAC
- **Team**: Hierarchical team structure for collaborative learning
- **Skill**: Competency taxonomy (hierarchical)
- **UserCompetency**: Skill levels (AWARE → EXPERT)
- **Course**: Learning programs (MICROLEARNING, STANDARD, CERTIFICATION)
- **Lesson**: Individual learning units with vector embeddings
- **Quiz & QuizQuestion**: Assessments with multiple question types
- **Video**: Mux integration for streaming video
- **Enrollment**: User ↔ Course with progress tracking
- **LessonProgress**: Detailed progress per lesson
- **AiGenerationJob**: Async job tracking for AI content creation
- **AnalyticsEvent**: Comprehensive event tracking

### Competency Levels

1. **AWARE**: Just introduced to the concept
2. **NOVICE**: Basic understanding
3. **COMPETENT**: Can perform with supervision
4. **PROFICIENT**: Can perform independently
5. **EXPERT**: Can teach others and innovate

## 🧪 Testing

### Create Test Organization

Use Prisma Studio or SQL:
```sql
INSERT INTO organizations (id, name, slug, status)
VALUES (
  gen_random_uuid(),
  'ACME Corporation',
  'acme-corp',
  'ACTIVE'
);
```

### Test AI Generation Flow

1. **Create organization and user** (via register endpoint)
2. **Create a course** (via database or future API)
3. **Upload a training document** to generate lessons
4. **Monitor job progress** via job status endpoint
5. **View generated lessons** in the database

## 🔧 Technology Stack

### Backend
- **NestJS**: Enterprise Node.js framework
- **Prisma**: Type-safe ORM for PostgreSQL
- **PostgreSQL**: Robust relational database
- **Redis**: Caching and queue management
- **Bull**: Reliable job queue
- **Passport + JWT**: Authentication
- **Swagger**: API documentation

### AI & ML
- **Anthropic Claude 3.5 Sonnet**: Content generation
- **OpenAI Embeddings**: Semantic search
- **Pinecone**: Vector database

### Admin (Planned)
- Next.js 14 with App Router
- Tailwind CSS + shadcn/ui
- React Query (TanStack Query)
- Recharts for analytics

### Mobile (Planned)
- React Native with Expo
- Expo AV for video playback
- AsyncStorage for offline support
- Expo Camera for QR scanning

## 📋 Development Roadmap

### Phase 1: Backend API ✅ COMPLETED
- [x] Project structure and monorepo setup
- [x] Database schema with Prisma (15 entities)
- [x] JWT authentication with refresh tokens
- [x] AI content generation with Claude
- [x] Vector embeddings with OpenAI + Pinecone
- [x] Bull queue for async processing
- [x] **Organizations Module** - Full CRUD with statistics
- [x] **Users Module** - User management with progress tracking
- [x] **Courses Module** - Course lifecycle with publishing workflow
- [x] **Skills Module** - Hierarchical competency taxonomy
- [x] **Lessons Module** - Lesson management with progress tracking
- [x] **Enrollments Module** - Learning path management
- [x] **Teams Module** - Hierarchical team structure
- [x] **Analytics Module** - Comprehensive reporting
- [x] **Infrastructure** - Logging, caching, health checks, monitoring
- [x] Comprehensive API documentation (Swagger)

### Phase 2: Admin Dashboard ✅ COMPLETED
- [x] Next.js 14 setup with App Router and authentication
- [x] AI Content Studio (document upload UI with real-time job tracking)
- [x] Dashboard layout with responsive sidebar navigation
- [x] **Course management UI** with filtering, search, and CRUD operations
- [x] **User management UI** with role filtering and user statistics
- [x] **Team management UI** with hierarchical visualization
- [x] **Skills management UI** with taxonomy tree and categories
- [x] **Lesson management UI** with type filtering and course integration
- [x] Analytics dashboard with interactive charts (Recharts)
- [x] JWT authentication with Zustand state management
- [x] API client with automatic token refresh (40+ methods)
- [x] shadcn/ui components with Tailwind CSS
- [x] React Query for data fetching and caching
- [x] Toast notifications and loading states
- [x] **Production-ready with 9 complete pages**

### Phase 3: Mobile App 🔜 FUTURE
- [ ] React Native Expo setup
- [ ] Home screen with personalized content
- [ ] Lesson player with video support
- [ ] Offline mode with downloads
- [ ] QR code scanner
- [ ] Progress tracking UI

### Phase 4: Advanced Features 🔜 FUTURE
- [ ] Mux video integration
- [ ] Real-time notifications
- [ ] Advanced analytics
- [ ] Gamification (team-based)
- [ ] Social learning features
- [ ] Integration APIs

## 🐳 Docker Deployment

### Quick Start with Docker Compose

The entire platform can be deployed with a single command:

```bash
# Copy environment template
cp .env.docker.example .env

# Edit with your API keys and secrets
nano .env

# Start all services (PostgreSQL, Redis, API, Admin Dashboard)
docker-compose up -d

# View logs
docker-compose logs -f

# Access applications
# Admin Dashboard: http://localhost:3000
# API: http://localhost:3001
# API Docs: http://localhost:3001/api/docs
```

### What's Included

- **PostgreSQL 14**: Persistent database with health checks
- **Redis 7**: Caching and job queue
- **API Server**: NestJS with auto-migration on startup
- **Admin Dashboard**: Next.js with standalone build
- **Volumes**: Automatic data persistence
- **Health Checks**: Kubernetes-ready probes
- **Networks**: Isolated bridge network

### Production Deployment

See comprehensive [DEPLOYMENT.md](./docs/DEPLOYMENT.md) guide for:
- SSL/TLS configuration
- Kubernetes manifests
- Monitoring & logging setup
- Backup & recovery procedures
- Scaling strategies
- Troubleshooting guide

## 🔐 Security

- **Password Hashing**: bcrypt with 12 rounds
- **JWT Tokens**: 15-minute access, 7-day refresh
- **Input Validation**: class-validator on all DTOs
- **Rate Limiting**: 100 requests/minute per IP
- **CORS**: Configurable allowed origins
- **Helmet**: Security headers
- **Multi-tenant Isolation**: Organization-scoped queries

## 🚦 Environment Variables

See `apps/api/.env.example` for all configuration options.

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST/PORT`: Redis configuration
- `JWT_SECRET/JWT_REFRESH_SECRET`: Token signing keys
- `ANTHROPIC_API_KEY`: Claude API key
- `OPENAI_API_KEY`: OpenAI embeddings key
- `PINECONE_API_KEY/INDEX`: Vector database config

## 📝 License

[Your License Here]

## 🤝 Contributing

[Contributing guidelines here]

## 📧 Contact

[Contact information here]

---

**Built with ❤️ for deskless workers who deserve better learning experiences**
