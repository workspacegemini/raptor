# Database Migrations

This directory contains Prisma migrations for the Enterprise Performance Engine database.

## Initial Setup

The initial migration (`20251120000000_initial_schema`) was created manually to establish database version control.

## Applying Migrations

### Development Environment

```bash
# Apply all pending migrations
npm run prisma:migrate

# Or with explicit name for new migrations
npx prisma migrate dev --name descriptive_name
```

### Production Environment

```bash
# Apply migrations without prompts (CI/CD)
npx prisma migrate deploy
```

### Rollback

To rollback migrations, you need to:
1. Manually drop the affected tables/columns
2. Delete the migration folder
3. Reapply from a clean state

**Note**: Prisma doesn't have automatic rollback. Always backup your database before applying migrations in production.

## Creating New Migrations

When you modify `schema.prisma`:

```bash
# Create a new migration
npm run prisma:migrate -- --name descriptive_change_name
```

## Migration History

### 20251120000000_initial_schema
- **Date**: November 20, 2025
- **Description**: Initial database schema with 15 core entities
- **Tables Created**:
  - organizations
  - users
  - refresh_tokens
  - teams
  - team_members
  - skills
  - user_competencies
  - courses
  - course_skills
  - lessons
  - lesson_skills
  - videos
  - quizzes
  - quiz_questions
  - enrollments
  - lesson_progress
  - ai_generation_jobs
  - analytics_events
- **Enums**: 15 enums for type safety
- **Indexes**: 40+ indexes for optimal query performance
- **Foreign Keys**: Full referential integrity with CASCADE deletes

## Best Practices

1. **Always Review Migrations**: Check the generated SQL before applying
2. **Backup First**: Always backup production databases before migrations
3. **Test Locally**: Test migrations in development first
4. **Version Control**: Commit all migration files to Git
5. **Sequential Apply**: Apply migrations in order, never skip
6. **Monitor Performance**: Watch for long-running migrations in production
