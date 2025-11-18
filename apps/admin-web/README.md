# Enterprise Performance Engine - Admin Dashboard

Modern, AI-powered admin dashboard built with Next.js 14, React, and TypeScript.

## Features

### Authentication
- JWT-based authentication with access and refresh tokens
- Secure login with token management
- Auto-redirect based on auth status
- Session persistence with Zustand

### Dashboard Overview
- Real-time statistics (users, courses, enrollments, completion rates)
- Quick action cards for common tasks
- Activity feed (coming soon)
- Role-based access control

### AI Content Studio 🌟
The killer feature that sets EPE apart:
- Upload training documents (PDF, TXT, MD up to 10MB)
- AI-powered document analysis with Claude 3.5 Sonnet
- Generate 5-20 microlearning lessons automatically
- Real-time job progress tracking
- Generation history with status monitoring
- Adjustable lesson count with slider

### Course Management
- View all courses with status filtering
- Search functionality
- Create, edit, and delete courses
- Course cards with key metrics:
  - Lesson count
  - Enrollment count
  - Status badges (Published, Draft, Archived)
  - Difficulty levels
  - Course types
- Beautiful grid layout

### Analytics Dashboard
- Overview statistics with key metrics
- Learning activity chart (30-day trends)
  - Enrollments over time
  - Progress updates
  - Completions
- Top performing courses (bar chart)
- Competency distribution (pie chart)
- User engagement metrics:
  - Average enrollments per user
  - Average completions per user
  - Overall engagement rate

### Navigation
- Responsive sidebar with icons
- Active route highlighting
- Quick access to all sections:
  - Overview
  - AI Content Studio
  - Courses
  - Lessons
  - Users
  - Teams
  - Skills
  - Analytics
  - Settings

### UI Components
- Built with shadcn/ui components
- Tailwind CSS for styling
- Lucide React icons
- Responsive design
- Dark mode support (theme configured)
- Toast notifications with Sonner
- Loading states and error handling

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **API Client**: Axios
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Notifications**: Sonner

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Backend API running on `http://localhost:3001`

### Installation

```bash
# From the root directory
npm install

# Or from admin-web directory
cd apps/admin-web
npm install
```

### Environment Variables

Create a `.env.local` file in `apps/admin-web`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# App Configuration
NEXT_PUBLIC_APP_NAME=Enterprise Performance Engine
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_GENERATION=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### Run Development Server

```bash
# From root directory
npm run dev:admin

# Or from admin-web directory
npm run dev
```

The dashboard will be available at `http://localhost:3000`

### Build for Production

```bash
# From root directory
npm run build:admin

# Or from admin-web directory
npm run build
npm start
```

## Project Structure

```
apps/admin-web/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── dashboard/         # Protected dashboard routes
│   │   │   ├── page.tsx       # Overview page
│   │   │   ├── layout.tsx     # Dashboard layout
│   │   │   ├── ai-studio/     # AI Content Studio
│   │   │   ├── courses/       # Course management
│   │   │   ├── analytics/     # Analytics dashboard
│   │   │   └── ...
│   │   ├── login/             # Login page
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page (redirects)
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   └── providers.tsx      # React Query provider
│   ├── lib/                   # Utilities and libraries
│   │   ├── api-client.ts      # API client with interceptors
│   │   ├── auth-store.ts      # Zustand auth store
│   │   └── utils.ts           # Utility functions
│   └── types/                 # TypeScript types
│       └── index.ts           # Shared type definitions
├── public/                    # Static assets
├── .env.example               # Environment variables template
├── next.config.js             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

## Key Features Explained

### API Client

The API client (`src/lib/api-client.ts`) provides:
- Automatic token refresh on 401 errors
- Request/response interceptors
- Token storage in localStorage
- Type-safe methods for all endpoints
- Error handling with proper error messages

### Auth Store

Zustand-based auth store (`src/lib/auth-store.ts`) manages:
- User authentication state
- Login/logout functionality
- User data persistence
- Loading states
- Token management

### React Query Integration

TanStack Query provides:
- Automatic caching
- Background refetching
- Optimistic updates
- Loading and error states
- Query invalidation

## Available Pages

| Route | Description |
|-------|-------------|
| `/` | Home page (redirects to dashboard or login) |
| `/login` | Authentication page |
| `/dashboard` | Overview dashboard with stats |
| `/dashboard/ai-studio` | AI Content Studio for lesson generation |
| `/dashboard/courses` | Course management |
| `/dashboard/lessons` | Lesson management (coming soon) |
| `/dashboard/users` | User management (coming soon) |
| `/dashboard/teams` | Team management (coming soon) |
| `/dashboard/skills` | Skills management (coming soon) |
| `/dashboard/analytics` | Analytics dashboard |
| `/dashboard/settings` | Settings (coming soon) |

## Development

### Adding New Pages

1. Create a new directory in `src/app/dashboard/[page-name]`
2. Add `page.tsx` for the route component
3. Update navigation in `src/components/dashboard/sidebar.tsx`
4. Add API methods in `src/lib/api-client.ts` if needed

### Adding New Components

1. Create component in `src/components/[category]/`
2. Use shadcn/ui components from `src/components/ui/`
3. Follow the existing patterns for consistency

### Styling Guidelines

- Use Tailwind CSS utility classes
- Follow the design system in `tailwind.config.ts`
- Use shadcn/ui components for consistency
- Maintain responsive design (mobile-first)

## Performance Optimizations

- Server-side rendering with Next.js 14
- Automatic code splitting
- Image optimization
- React Query caching
- Lazy loading for charts
- Optimistic UI updates

## Security

- JWT token management with refresh
- Secure token storage
- Auto-logout on token expiration
- Protected routes with auth checks
- HTTPS recommended for production
- Environment variable protection

## Future Enhancements

- [ ] User management UI
- [ ] Team management UI
- [ ] Skills taxonomy UI
- [ ] Lesson editor with rich text
- [ ] Settings page
- [ ] Notifications system
- [ ] Dark mode toggle
- [ ] Export functionality
- [ ] Advanced filtering
- [ ] Bulk operations
- [ ] Role management UI
- [ ] Organization settings

## Troubleshooting

### API Connection Issues

If you can't connect to the API:
1. Ensure backend is running on `http://localhost:3001`
2. Check `NEXT_PUBLIC_API_URL` in `.env.local`
3. Verify CORS settings in backend

### Authentication Issues

If auth doesn't work:
1. Clear localStorage: `localStorage.clear()`
2. Check token expiration in backend
3. Verify JWT secrets match between frontend and backend

### Build Errors

If build fails:
1. Delete `.next` folder: `rm -rf .next`
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Check TypeScript errors: `npm run type-check`

## Contributing

1. Follow the existing code style
2. Write TypeScript for type safety
3. Use React Query for data fetching
4. Add loading and error states
5. Test on mobile devices
6. Update this README for new features

## License

[Your License Here]

---

**Built with ❤️ for enterprise learning**
