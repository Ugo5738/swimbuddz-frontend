# SwimBuddz Frontend

Next.js 14 application for the SwimBuddz swimming community platform.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Mantine UI
- **Authentication:** Supabase (@supabase/ssr)
- **API Client:** Typed client generated from backend OpenAPI spec
- **Calendar:** FullCalendar
- **Rich Text:** BlockNote editor
- **Forms:** React Hook Form + Zod validation

## Project Structure

```
swimbuddz-frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (public)/          # Public routes
│   │   ├── (auth)/            # Authentication routes
│   │   ├── (member)/          # Member dashboard routes
│   │   ├── (admin)/           # Admin routes
│   │   ├── (coach)/           # Coach routes
│   │   └── (sessions)/        # Sessions routes
│   ├── components/            # React components
│   │   ├── forms/            # Form components
│   │   ├── layout/           # Layout components
│   │   ├── sections/         # Page sections
│   │   └── ui/               # UI primitives
│   └── lib/                   # Utilities and helpers
│       ├── api-client.ts     # Typed API client
│       ├── api-types.ts      # Generated TypeScript types
│       └── supabase/         # Supabase client setup
├── public/                    # Static assets
└── docs/                      # Documentation
    ├── ARCHITECTURE.md        # Frontend architecture
    ├── CONVENTIONS.md         # Coding standards
    ├── ROUTES_AND_PAGES.md   # Complete route reference
    └── UI_FLOWS.md           # User journey documentation
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend services running (see [swimbuddz-backend/README.md](../swimbuddz-backend/README.md))
- Supabase project configured (see [SUPABASE_SETUP.md](../SUPABASE_SETUP.md))

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Copy `.env.example` to `.env.local` and fill in your values:
   ```bash
   cp .env.example .env.local
   ```

   Required environment variables:
   ```env
   # API Gateway
   NEXT_PUBLIC_API_URL=http://localhost:8000

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

   # Optional: Payment Gateway
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your-paystack-key
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

   Application available at `http://localhost:3000`

## Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

### Type Generation
```bash
npm run generate:types    # Generate TypeScript types from backend OpenAPI spec
```

This script:
1. Fetches `openapi.json` from the backend
2. Generates TypeScript types in `src/lib/api-types.ts`
3. Ensures type safety between frontend and backend

**Run this after any backend schema changes.**

### Testing
```bash
npm test                  # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Generate coverage report
```

## Application Routes

**Total Pages:** 103

| Route Group | Count | Description |
|-------------|-------|-------------|
| Public | 19 | Landing, info pages, store browsing |
| Auth | 7 | Login, registration, email confirmation |
| Member | 26 | Dashboards, sessions, academy, billing |
| Coach | 2 | Coach application and onboarding |
| Sessions | 1 | Public sessions list |
| Admin | 48 | Full platform management |

**Complete Route Reference:** See [ROUTES_AND_PAGES.md](./ROUTES_AND_PAGES.md)

## Authentication Flow

SwimBuddz uses Supabase Auth with server-side session management:

1. **Login/Register:** Supabase Auth UI or custom forms
2. **Session Storage:** HTTP-only cookies via `@supabase/ssr`
3. **Route Protection:** Middleware and layout-level checks
4. **Role-Based Access:** Admin routes require admin role from member record

**Implementation:** See [ARCHITECTURE.md](./ARCHITECTURE.md) for details

## API Integration

### Type-Safe API Client

The frontend uses a typed API client that mirrors the backend OpenAPI spec:

```typescript
import { api } from '@/lib/api-client'

// All methods are fully typed
const sessions = await api.sessions.list({ limit: 10 })
const member = await api.members.getMe()
```

### Regenerating Types

After backend changes:
```bash
# In backend directory
python scripts/generate_openapi.py > openapi.json

# In frontend directory
npm run generate:types
```

Or use the workflow shortcut (if configured):
```bash
/generate-types
```

## Component Library

### UI Components (Mantine)

Pre-built components from Mantine UI:
- Buttons, Inputs, Modals
- Tables, Cards, Badges
- Forms with validation
- Notifications

### Custom Components

Project-specific components in `src/components/`:
- `Layout/` - Page layouts and navigation
- `forms/` - Domain-specific forms (registration, enrollment)
- `sections/` - Page sections (hero, features)
- `ui/` - Custom UI primitives

**Component Documentation:** See READMEs in `src/components/*/`

## Styling

### Tailwind CSS

Utility-first CSS framework:
```tsx
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow">
  Content
</div>
```

### Mantine Theme

Global theme configuration in `src/app/layout.tsx`:
- Colors, spacing, typography
- Component defaults
- Dark mode support

### Best Practices

1. Use Tailwind utilities for layout and spacing
2. Use Mantine components for interactive elements
3. Extract repeated patterns into components
4. Follow mobile-first responsive design

## Key Features

### Cohort-Based Academy

37 pages across member and admin interfaces:
- Program browsing and enrollment
- Curriculum builder for admins
- Student progress tracking
- Payment integration

### Session Management

- Three-step sign-in flow
- Ride-share coordination
- Attendance tracking
- Pool list export

### E-Commerce Store

- Product browsing and cart
- Checkout with Paystack
- Order management
- Inventory tracking (admin)

### Community Features

- Events and RSVPs
- Photo/video galleries
- Swimming tips library
- Coach directory

## Deployment

The application is configured for Vercel deployment.

**Deployment Guide:** See [DEPLOYMENT.md](./DEPLOYMENT.md)

### Build Optimization

- Server Components by default (reduced JavaScript bundle)
- Image optimization via `next/image`
- Font optimization via `next/font`
- Automatic code splitting

### Environment Variables

Production environment variables must be configured in Vercel dashboard:
- `NEXT_PUBLIC_API_URL` - Production API gateway URL
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## Documentation

### For Developers

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Application structure and patterns
- [CONVENTIONS.md](./CONVENTIONS.md) - Coding standards and best practices
- [ROUTES_AND_PAGES.md](./ROUTES_AND_PAGES.md) - Complete route reference
- [UI_FLOWS.md](./UI_FLOWS.md) - User journey documentation

### For AI Agents

- [AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md) - AI assistant guidance

## Performance

### Mobile-First

Primary market: Lagos, Nigeria with varying network conditions
- Optimized images and lazy loading
- Minimal JavaScript for public pages
- Progressive enhancement approach

### Metrics

Target performance metrics:
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- Cumulative Layout Shift (CLS): < 0.1

## Contributing

### Adding a New Page

1. Create page file in appropriate route group
2. Update [ROUTES_AND_PAGES.md](./ROUTES_AND_PAGES.md)
3. Add to navigation if needed
4. Update [UI_FLOWS.md](./UI_FLOWS.md) if it affects user journeys

### Making Backend Changes

1. Update backend models/schemas
2. Generate OpenAPI spec: `python scripts/generate_openapi.py > openapi.json`
3. Regenerate frontend types: `npm run generate:types`
4. Update API client calls if needed
5. Test TypeScript compilation: `npm run type-check`

## Troubleshooting

### Types Out of Sync

If you see TypeScript errors after backend changes:
```bash
npm run generate:types
npm run type-check
```

### Supabase Auth Issues

Check:
1. Environment variables are set correctly
2. Supabase project is configured (see [SUPABASE_SETUP.md](../SUPABASE_SETUP.md))
3. JWT secret matches between Supabase and backend

### API Connection Issues

Verify:
1. Backend services are running (`docker compose up` in backend directory)
2. `NEXT_PUBLIC_API_URL` points to correct gateway
3. CORS is configured on backend

## Support

- Backend: See [swimbuddz-backend/README.md](../swimbuddz-backend/README.md)
- Architecture Questions: Check [ARCHITECTURE.md](./ARCHITECTURE.md)
- Conventions: See [CONVENTIONS.md](./CONVENTIONS.md)

---

*Last updated: January 2026*
