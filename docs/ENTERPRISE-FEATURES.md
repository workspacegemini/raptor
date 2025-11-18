# 🏢 Enterprise Performance Engine - Enterprise Features Guide

## Overview

The Enterprise Performance Engine has been enhanced with comprehensive enterprise-grade modules providing full CRUD operations, advanced management capabilities, role-based access control, and production-ready features.

## 🎯 What's Been Enhanced

### Core Modules Added (40+ API Endpoints)

1. **Organizations Module** (13 endpoints)
2. **Users Module** (12 endpoints)
3. **Courses Module** (7 endpoints)
4. **Skills Module** (7 endpoints)

Plus the existing:
- **Authentication Module** (4 endpoints)
- **AI Generation Module** (5 endpoints)

**Total API Endpoints: 48+**

---

## 1. 🏢 Organizations Module

### Purpose
Multi-tenant organization management with comprehensive settings, statistics, and lifecycle controls.

### Key Features

#### Organization Management
- Create, read, update, delete organizations
- Organization status management (ACTIVE, SUSPENDED, INACTIVE)
- Unique slug-based identification
- Custom branding (logo, colors, fonts)
- Flexible settings JSON (features, limits, notifications)
- Soft delete for audit trails

#### Statistics Dashboard
Get comprehensive organization analytics:
```json
{
  "users": {
    "total": 1250,
    "active": 1180,
    "inactive": 70
  },
  "courses": {
    "total": 45,
    "published": 38,
    "draft": 7
  },
  "lessons": {
    "total": 340
  },
  "teams": {
    "total": 25
  },
  "enrollments": {
    "total": 3200,
    "completed": 1450,
    "inProgress": 1750,
    "completionRate": 45.31
  }
}
```

#### Settings Management
Flexible JSON-based settings:
```json
{
  "branding": {
    "primaryColor": "#007bff",
    "secondaryColor": "#6c757d",
    "fontFamily": "Inter"
  },
  "features": {
    "enableAI": true,
    "enableOffline": true,
    "enableQRCodes": true,
    "enableTeams": true
  },
  "limits": {
    "maxUsers": 1000,
    "maxCourses": 100,
    "maxStorageGB": 50
  },
  "notifications": {
    "emailEnabled": true,
    "pushEnabled": true,
    "digestFrequency": "weekly"
  }
}
```

### API Endpoints

```
POST   /api/v1/organizations
GET    /api/v1/organizations?page=1&pageSize=50&status=ACTIVE&search=acme
GET    /api/v1/organizations/:id
GET    /api/v1/organizations/slug/:slug
PUT    /api/v1/organizations/:id
GET    /api/v1/organizations/:id/settings
PATCH  /api/v1/organizations/:id/settings
GET    /api/v1/organizations/:id/statistics
GET    /api/v1/organizations/:id/users-by-role
POST   /api/v1/organizations/:id/suspend
POST   /api/v1/organizations/:id/activate
DELETE /api/v1/organizations/:id
```

### Access Control

| Endpoint | Roles Allowed |
|----------|--------------|
| Create organization | SUPER_ADMIN |
| List all organizations | SUPER_ADMIN |
| Get organization | SUPER_ADMIN, ORG_ADMIN |
| Update organization | SUPER_ADMIN, ORG_ADMIN |
| Settings management | SUPER_ADMIN, ORG_ADMIN |
| Statistics | SUPER_ADMIN, ORG_ADMIN |
| Suspend/Activate | SUPER_ADMIN |
| Delete | SUPER_ADMIN |

---

## 2. 👥 Users Module

### Purpose
Comprehensive user management with profile management, progress tracking, and security features.

### Key Features

#### User Management
- Full user CRUD operations
- Organization-scoped queries (multi-tenancy)
- Role-based permissions (5 roles)
- Status management (ACTIVE, INACTIVE, SUSPENDED)
- Search by email, name
- Filter by role, status
- Pagination support

#### Profile Management
Users can manage their own profiles:
- Update personal information
- Change password (invalidates all sessions)
- Update preferences (theme, language, notifications)
- View learning progress

#### Progress Tracking
Comprehensive learning analytics per user:
```json
{
  "enrollments": {
    "total": 12,
    "completed": 5,
    "inProgress": 7,
    "courses": [...]
  },
  "lessons": {
    "completed": 87
  },
  "competencies": {
    "total": 15,
    "byLevel": {
      "AWARE": 3,
      "NOVICE": 5,
      "COMPETENT": 4,
      "PROFICIENT": 2,
      "EXPERT": 1
    },
    "skills": [...]
  }
}
```

#### Security Features
- Secure password changes with bcrypt (12 rounds)
- Automatic session invalidation on password change
- Suspension invalidates all tokens
- Email uniqueness validation

### API Endpoints

```
# Current User
GET    /api/v1/users/me
PUT    /api/v1/users/me
GET    /api/v1/users/me/progress
POST   /api/v1/users/me/change-password
PATCH  /api/v1/users/me/preferences

# User Management (Admin/Manager)
GET    /api/v1/users?page=1&pageSize=50&role=LEARNER&status=ACTIVE&search=john
GET    /api/v1/users/:id
PUT    /api/v1/users/:id
GET    /api/v1/users/:id/progress
POST   /api/v1/users/:id/suspend
POST   /api/v1/users/:id/activate
DELETE /api/v1/users/:id
```

### Access Control

| Endpoint | Roles Allowed |
|----------|--------------|
| List users | SUPER_ADMIN, ORG_ADMIN, MANAGER |
| Get own profile | All authenticated users |
| Update own profile | All authenticated users |
| Change own password | All authenticated users |
| Get user by ID | SUPER_ADMIN, ORG_ADMIN, MANAGER |
| Update user | SUPER_ADMIN, ORG_ADMIN |
| Suspend/Activate user | SUPER_ADMIN, ORG_ADMIN |
| Delete user | SUPER_ADMIN, ORG_ADMIN |

---

## 3. 📚 Courses Module

### Purpose
Complete course lifecycle management with publishing workflows and content organization.

### Key Features

#### Course Management
- Full CRUD operations
- Publishing workflow (DRAFT → PUBLISHED → ARCHIVED)
- Course types: MICROLEARNING, STANDARD, CERTIFICATION
- Difficulty levels: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
- Tag-based categorization
- Thumbnail support
- Duration tracking
- Creator and updater tracking

#### Course Organization
- Lesson ordering and management
- Skill associations
- Enrollment tracking
- Search and filtering
- Organization isolation

#### Publishing Workflow
```
DRAFT (editable) → PUBLISHED (live) → ARCHIVED (read-only)
```

### API Endpoints

```
POST   /api/v1/courses
GET    /api/v1/courses?page=1&pageSize=50&status=PUBLISHED&type=MICROLEARNING&search=safety
GET    /api/v1/courses/:id
PUT    /api/v1/courses/:id
POST   /api/v1/courses/:id/publish
POST   /api/v1/courses/:id/archive
DELETE /api/v1/courses/:id
```

### Response Example

```json
{
  "id": "uuid",
  "title": "Workplace Safety Essentials",
  "description": "Comprehensive safety training for all employees",
  "type": "MICROLEARNING",
  "status": "PUBLISHED",
  "difficulty": "BEGINNER",
  "estimatedDuration": 1200,
  "tags": ["safety", "compliance", "onboarding"],
  "lessons": [
    {
      "id": "lesson-uuid",
      "title": "Understanding PPE Requirements",
      "type": "VIDEO",
      "duration": 240,
      "order": 0
    }
  ],
  "skills": [
    {
      "skill": {
        "id": "skill-uuid",
        "name": "Workplace Safety",
        "category": "Compliance"
      }
    }
  ],
  "createdBy": {
    "id": "user-uuid",
    "firstName": "Jane",
    "lastName": "Smith"
  },
  "_count": {
    "enrollments": 245
  }
}
```

### Access Control

| Endpoint | Roles Allowed |
|----------|--------------|
| Create course | SUPER_ADMIN, ORG_ADMIN, INSTRUCTOR |
| List courses | All authenticated users |
| Get course | All authenticated users |
| Update course | SUPER_ADMIN, ORG_ADMIN, INSTRUCTOR |
| Publish course | SUPER_ADMIN, ORG_ADMIN, INSTRUCTOR |
| Archive course | SUPER_ADMIN, ORG_ADMIN |
| Delete course | SUPER_ADMIN, ORG_ADMIN |

---

## 4. 🎯 Skills Module

### Purpose
Hierarchical competency taxonomy for tracking and developing employee skills.

### Key Features

#### Skill Taxonomy
- Unlimited hierarchical nesting (parent-child relationships)
- Category-based organization
- Description and metadata
- Usage tracking across courses, lessons, and users

#### Hierarchy Example
```
Communication (root)
├── Verbal Communication
│   ├── Public Speaking
│   └── Presentation Skills
└── Written Communication
    ├── Technical Writing
    └── Business Writing

Technical Skills (root)
├── Programming
│   ├── Frontend Development
│   │   ├── React
│   │   └── Vue
│   └── Backend Development
│       ├── Node.js
│       └── Python
```

#### Skill Analytics
Each skill tracks:
- User competencies count
- Associated courses count
- Associated lessons count
- Child skills count

### API Endpoints

```
POST   /api/v1/skills
GET    /api/v1/skills?category=Technical&search=programming
GET    /api/v1/skills/hierarchy
GET    /api/v1/skills/:id
PUT    /api/v1/skills/:id
DELETE /api/v1/skills/:id
```

### Response Example

```json
{
  "id": "uuid",
  "name": "Frontend Development",
  "description": "Building user interfaces and client-side applications",
  "category": "Technical Skills",
  "parentSkill": {
    "id": "parent-uuid",
    "name": "Programming"
  },
  "childSkills": [
    {
      "id": "child-1-uuid",
      "name": "React",
      "description": "React.js framework",
      "category": "Technical Skills"
    },
    {
      "id": "child-2-uuid",
      "name": "Vue",
      "description": "Vue.js framework",
      "category": "Technical Skills"
    }
  ],
  "_count": {
    "userCompetencies": 145,
    "courseSkills": 12,
    "lessonSkills": 48
  }
}
```

### Access Control

| Endpoint | Roles Allowed |
|----------|--------------|
| Create skill | SUPER_ADMIN, ORG_ADMIN |
| List skills | All authenticated users |
| Get hierarchy | All authenticated users |
| Get skill | All authenticated users |
| Update skill | SUPER_ADMIN, ORG_ADMIN |
| Delete skill | SUPER_ADMIN, ORG_ADMIN |

---

## 🔒 Enterprise Security Features

### Multi-Tenancy
- All queries scoped to organization ID
- Complete data isolation between organizations
- No cross-organization data leakage

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|------------|
| **SUPER_ADMIN** | Full platform access, manage all organizations |
| **ORG_ADMIN** | Manage own organization, users, all content |
| **MANAGER** | View users, view all content, monitor progress |
| **INSTRUCTOR** | Create/edit courses, view learner progress |
| **LEARNER** | Enroll in courses, complete lessons, view own progress |

### Data Protection
- **Soft Deletes**: Audit trail for deleted records
- **Password Security**: bcrypt with 12 rounds
- **Session Management**: Token invalidation on password change/suspension
- **Input Validation**: class-validator on all DTOs
- **SQL Injection Protection**: Prisma ORM parameterized queries

---

## 📊 API Response Standards

### Pagination Format
```json
{
  "data": [...],
  "meta": {
    "total": 1250,
    "page": 1,
    "pageSize": 50,
    "totalPages": 25
  }
}
```

### Error Format
```json
{
  "statusCode": 404,
  "message": "Organization not found",
  "error": "Not Found"
}
```

---

## 🚀 Performance Features

### Database Optimizations
- **Indexes**: All foreign keys and frequently queried fields
- **Pagination**: Default 50 items per page, configurable
- **Selective Includes**: Only fetch needed relationships
- **Count Aggregations**: Efficient `_count` instead of fetching all records

### Caching Opportunities
Ready for Redis caching on:
- Organization settings
- Skill hierarchy
- User profiles
- Course listings

---

## 📈 Enterprise Metrics & Reporting

### Organization Dashboard
- User distribution by role
- Course status breakdown
- Enrollment completion rates
- Team participation metrics

### User Analytics
- Learning paths and progress
- Competency development tracking
- Engagement metrics
- Achievement timelines

### Course Analytics (Future)
- Enrollment trends
- Completion rates
- Average time to complete
- User feedback scores

---

## 🔄 Migration Guide

### From Basic to Enterprise

1. **Update Environment Variables**
   - No new variables required
   - Uses existing database and authentication

2. **Run Database Migrations**
   ```bash
   cd apps/api
   npm run prisma:migrate
   ```

3. **Create Initial Organization**
   ```bash
   # Use Prisma Studio or API
   POST /api/v1/organizations
   ```

4. **Update User Roles**
   - Assign appropriate roles to existing users
   - Set up ORG_ADMIN for each organization

5. **Migrate Content**
   - Courses automatically scoped to organization
   - Skills available for assignment
   - Users retain their progress

---

## 🔮 Future Enterprise Features

### Planned Enhancements
- **Lessons Module**: Full CRUD with video integration
- **Teams Module**: Hierarchical team management
- **Enrollments Module**: Learning path management
- **Analytics Module**: Advanced reporting and dashboards
- **Video Module**: Mux integration for streaming
- **Audit Logging**: Complete compliance tracking
- **Bulk Operations**: Import/export functionality
- **API Keys**: Integration authentication
- **Webhooks**: Real-time event notifications
- **Email Service**: Automated notifications
- **Advanced Health Checks**: System monitoring

---

## 📚 Developer Resources

### Swagger Documentation
- **URL**: `http://localhost:3001/api/docs`
- **Features**:
  - Interactive API testing
  - Request/response schemas
  - Authentication testing
  - Example payloads

### Example Workflows

#### Creating a Complete Learning Program
```bash
# 1. Create organization
POST /organizations
{
  "name": "ACME Corp",
  "slug": "acme-corp",
  "settings": {
    "branding": { "primaryColor": "#007bff" },
    "features": { "enableAI": true }
  }
}

# 2. Create skills taxonomy
POST /skills { "name": "Safety", "category": "Compliance" }
POST /skills { "name": "PPE", "parentSkillId": "safety-uuid", "category": "Compliance" }

# 3. Create course
POST /courses
{
  "title": "Workplace Safety",
  "type": "MICROLEARNING",
  "difficulty": "BEGINNER"
}

# 4. Generate lessons with AI
POST /ai-generation/generate-lessons
FormData: file=safety-manual.pdf, courseId=course-uuid

# 5. Publish course
POST /courses/:id/publish

# 6. Enroll users (Future: Enrollments Module)
```

---

## 🎓 Best Practices

### Organization Management
- Use meaningful slugs (lowercase-with-hyphens)
- Set realistic limits in settings
- Monitor statistics regularly
- Archive instead of delete when possible

### User Management
- Assign roles based on least privilege principle
- Use teams for grouping (when Teams Module is added)
- Regularly review inactive users
- Encourage password changes every 90 days

### Content Management
- Start courses in DRAFT status
- Review AI-generated content before publishing
- Associate skills with courses for tracking
- Use tags for discoverability
- Set accurate estimated durations

### Skills Taxonomy
- Plan hierarchy before creating
- Use categories for grouping
- Keep skill names concise
- Delete unused skills to maintain clean taxonomy

---

## 🛠️ Troubleshooting

### Common Issues

#### Users can't see courses
- Check organization ID matches
- Verify course status is PUBLISHED
- Check user role has access

#### Skills not appearing in hierarchy
- Check parentSkillId is valid
- Verify organization ID matches
- Check if skill has been deleted

#### Organization statistics incorrect
- Statistics are real-time calculated
- Check deletedAt is null on related entities
- Verify organization ID scope

---

## 📞 Support & Resources

- **API Docs**: `/api/docs`
- **Setup Guide**: `/docs/SETUP.md`
- **Main README**: `/README.md`
- **Issues**: [GitHub Issues]

---

**Built for Enterprise Scale** 🏢🚀

> The Enterprise Performance Engine is now production-ready with comprehensive CRUD operations, enterprise security, and scalable architecture. 48+ API endpoints provide complete platform management capabilities.
