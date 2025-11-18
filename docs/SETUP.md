# Enterprise Performance Engine - Setup Guide

## Prerequisites

### Required Software
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- **PostgreSQL** v14 or higher
- **Redis** v6 or higher
- **Git** (for version control)

### Required API Keys
1. **Anthropic API Key** - For Claude AI content generation
   - Sign up at: https://console.anthropic.com/
   - Create an API key
   - Model used: `claude-3-5-sonnet-20241022`

2. **OpenAI API Key** - For embeddings
   - Sign up at: https://platform.openai.com/
   - Create an API key
   - Model used: `text-embedding-ada-002`

3. **Pinecone API Key** - For vector search
   - Sign up at: https://www.pinecone.io/
   - Create a project and get API key
   - Create an index named `epe-lessons` with:
     - Dimensions: 1536 (for OpenAI ada-002)
     - Metric: cosine

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd enterprise-performance-engine
```

### 2. Install Root Dependencies

```bash
npm install
```

### 3. Setup Backend API

```bash
cd apps/api
npm install
```

### 4. Configure Environment Variables

```bash
cd apps/api
cp .env.example .env
```

Edit `.env` file with your values:

```env
# Database
DATABASE_URL="postgresql://epe_user:epe_password@localhost:5432/epe_dev?schema=public"

# Server
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006

# JWT - CHANGE THESE IN PRODUCTION!
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-minimum-32-characters-long
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# AI Services
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here
PINECONE_API_KEY=your-pinecone-key-here
PINECONE_ENVIRONMENT=gcp-starter
PINECONE_INDEX=epe-lessons

# Video (Mux) - Optional for now
# MUX_TOKEN_ID=
# MUX_TOKEN_SECRET=
# MUX_WEBHOOK_SECRET=

# AWS S3 - Optional for now
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_S3_BUCKET=
```

### 5. Setup Database with Docker (Recommended)

```bash
# From project root
docker-compose -f infrastructure/docker/docker-compose.yml up -d postgres redis

# Wait for services to be healthy
docker-compose -f infrastructure/docker/docker-compose.yml ps
```

### 6. Alternative: Manual Database Setup

If not using Docker:

**PostgreSQL:**
```bash
# Create user and database
createuser -P epe_user
createdb -O epe_user epe_dev
```

**Redis:**
```bash
# Start Redis server
redis-server
```

### 7. Run Prisma Migrations

```bash
cd apps/api
npm run prisma:generate
npm run prisma:migrate
```

### 8. Create Initial Test Data

Use Prisma Studio to create a test organization:

```bash
cd apps/api
npm run prisma:studio
```

Navigate to `organizations` and create:
- **name**: "ACME Corporation"
- **slug**: "acme-corp"
- **status**: "ACTIVE"

### 9. Start the Development Server

```bash
cd apps/api
npm run dev
```

The API should now be running at:
- **API**: http://localhost:3001
- **Swagger Docs**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/api/v1/health

## Testing the AI Generation

### 1. Register a User

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@acme.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "organizationSlug": "acme-corp",
    "role": "INSTRUCTOR"
  }'
```

Save the `accessToken` from the response.

### 2. Create a Test Course

Use Prisma Studio to create a course in the database, or use SQL:

```sql
INSERT INTO courses (id, title, description, type, status, organization_id, created_by_id)
VALUES (
  gen_random_uuid(),
  'Safety Training',
  'Workplace safety procedures',
  'MICROLEARNING',
  'DRAFT',
  '<your-org-id>',
  '<your-user-id>'
);
```

### 3. Prepare a Test Document

Create a sample training document (e.g., `safety-training.txt`):

```
Safety Training Manual

Introduction to Workplace Safety
Workplace safety is essential for protecting employees from injuries and accidents.

Key Safety Principles:
1. Always wear appropriate PPE
2. Report hazards immediately
3. Follow emergency procedures
4. Keep work areas clean and organized

Emergency Procedures:
In case of fire, evacuate immediately using the nearest exit.
Do not use elevators during emergencies.

Equipment Safety:
- Inspect tools before use
- Report damaged equipment
- Use tools only for their intended purpose
```

### 4. Generate Lessons from Document

```bash
curl -X POST http://localhost:3001/api/v1/ai-generation/generate-lessons \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@safety-training.txt" \
  -F "courseId=YOUR_COURSE_ID" \
  -F "targetLessonCount=5"
```

### 5. Monitor Job Progress

```bash
curl -X GET http://localhost:3001/api/v1/ai-generation/jobs/JOB_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 6. View Generated Lessons

Check Prisma Studio or query the database:

```sql
SELECT id, title, description, duration
FROM lessons
WHERE course_id = 'YOUR_COURSE_ID'
ORDER BY "order";
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check database exists
psql -U epe_user -d epe_dev -c "SELECT version();"
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping

# Should return "PONG"
```

### Prisma Issues

```bash
# Reset database (WARNING: Deletes all data)
cd apps/api
npm run prisma:migrate:reset

# Regenerate Prisma client
npm run prisma:generate
```

### AI Generation Fails

Common issues:
1. **Invalid API keys** - Check your `.env` file
2. **Pinecone index not created** - Create index with correct dimensions (1536)
3. **Document too short** - Needs at least 100 characters
4. **Document too large** - Maximum 10MB

Check logs:
```bash
# The API logs will show detailed error messages
npm run dev
```

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

## Development Workflow

### Running Tests

```bash
cd apps/api
npm run test
```

### Code Formatting

```bash
cd apps/api
npm run format
```

### Database Migrations

```bash
# Create a new migration
cd apps/api
npm run prisma:migrate:dev --name descriptive_migration_name

# Apply migrations in production
npm run prisma:migrate:deploy
```

### Viewing Logs

Development mode shows detailed logs. For production:

```bash
# Use pm2 or similar for log management
pm2 logs epe-api
```

## Next Steps

1. **Build the Admin Dashboard** - Next.js frontend for content management
2. **Setup Mux Integration** - For video lesson support
3. **Build Mobile App** - React Native Expo app
4. **Deploy to Production** - Use Docker or cloud platform

## Support

For issues and questions:
- Check the logs first
- Review API documentation at `/api/docs`
- Check Prisma Studio for data issues
- Verify environment variables are set correctly

---

**Happy Learning! 🚀**
