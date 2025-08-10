# School Management Mobile App - Development Context for AI Copilot

## Project Overview
You are helping develop a **multi-tenant SaaS school management mobile application** with strict data isolation, connecting teachers, parents, and administrators through a mobile-first experience focused on grades, communication, and administration.

**Foundation**: Built on flemingvincent/expo-supabase-starter boilerplate for modern architecture and development speed.

## Core Architecture Requirements

### Multi-Tenancy & Security
- **Database**: Multi-tenant pooled Postgres in Supabase with `tenant_id` field
- **Security**: Row-Level Security (RLS) policies MUST be implemented on every table
- **Authentication**: Supabase Auth with `tenant_id` stored in JWT claims for automatic query filtering
- **Data Isolation**: All queries must automatically filter by tenant - never allow cross-tenant data access

### Technology Stack (STRICTLY FOLLOW)
- **Backend**: Supabase (Postgres + RLS + Auth + Storage + Realtime + Edge Functions)
- **Mobile**: React Native + Expo (managed workflow only)
- **Navigation**: Expo Router (file-based routing) - NOT React Navigation
- **Styling**: Tailwind CSS for React Native (NativeWind)
- **Forms**: React Hook Form + Zod validation
- **TypeScript**: Strict mode enabled for type safety
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Media Storage**: Supabase Storage (primary) or Cloudinary free tier
- **Serverless Functions**: Supabase Edge Functions only (no always-on servers)

### Cost Optimization Constraints
- **START FREE**: Use only free tiers initially (Supabase free, Cloudinary free, FCM free)
- **AVOID**: Separate databases per tenant, paid build systems, always-on VMs, premium services
- **Monitor**: Per-tenant quotas for storage, messaging, API usage
- **Scale gradually**: Only upgrade when hitting actual limits

## User Roles & Core Features

### Teachers
- Enter/manage grades for their classes
- Create and manage class rosters
- Send announcements and direct messages to parents
- View student assignment submissions

### Parents
- View children's grades and assignments
- Receive teacher messages and school announcements
- Access school calendar and events
- Multi-child support within same account

### School Admins
- Manage teacher accounts and permissions
- Oversee all grade entries and class management
- Handle school-wide communications
- Configure school branding and settings

## Development Phases (CURRENT FOCUS)

### Phase 1: Starter Customization & Single-Tenant MVP
- **Foundation**: flemingvincent/expo-supabase-starter provides TypeScript + Expo Router + Supabase + Tailwind setup
- **Customization**: Adapt existing auth flow for school roles (teacher/parent/admin)
- **Route Structure**: Build role-specific route groups using file-based routing patterns
- **Forms**: Implement grade entry/viewing using existing React Hook Form + Zod patterns
- **UI**: Leverage existing Tailwind CSS setup for consistent school-themed design

### Phase 2: Multi-Tenancy Implementation
- Add `tenant_id` to all tables and TypeScript interfaces from the starter
- Implement RLS policies building on existing Supabase client setup
- Update all queries using starter's database patterns for tenant filtering
- Create tenant-aware routing and data fetching hooks following starter conventions

### Phase 3: Enhanced Communication
- Real-time messaging using existing Supabase Realtime setup from starter
- Push notifications building on starter's notification patterns
- File uploads extending starter's media handling capabilities

### Phase 4: White-Label & School Creation
- Dynamic tenant creation using starter's form validation patterns
- School-specific branding extending starter's Tailwind theming system
- Self-service onboarding using starter's multi-step form patterns

## Critical Development Guidelines

### Working with the Starter Boilerplate
- **Kickstart Foundation**: flemingvincent/expo-supabase-starter provides initial setup and patterns to accelerate development
- **Pragmatic Approach**: Use starter patterns when helpful, deviate when necessary for school management functionality
- **Functionality First**: Prioritize working features over adherence to starter conventions
- **Smart Adaptation**: Leverage starter's TypeScript + Zod + React Hook Form + Tailwind setup, but modify as needed
- **School-Specific Needs**: Don't hesitate to refactor or replace starter components if they don't fit school management requirements

### Security (NON-NEGOTIABLE)
- Every database table MUST have RLS policies
- All queries must filter by `tenant_id` automatically
- Test multi-tenancy with multiple test schools
- Never store sensitive data in JWT tokens
- Implement proper input validation and sanitization

### Performance & Scalability
- Use Supabase realtime for live updates
- Implement proper indexing on `tenant_id` + frequently queried fields
- Use Edge Functions for heavy operations
- Optimize for mobile network conditions

### Mobile-First Design
- React Native + Expo managed workflow with Expo Router
- File-based routing with route groups for user roles
- Offline-capable where possible using Expo SQLite
- Fast startup times with optimized bundle sizes
- Responsive design using Tailwind CSS breakpoints
- Native feel with appropriate animations and gestures

### Code Organization (Flexible Architecture)
- **Start with Starter Structure**: Use flemingvincent/expo-supabase-starter folder structure as initial foundation
- **Adapt as Needed**: Modify, reorganize, or restructure when it improves school management functionality
- **File-based routing** with Expo Router - keep if it works, modify structure if needed for complex school features
- **Route groups** for user roles: `app/(teacher)/`, `app/(parent)/`, `app/(admin)/` - organize however makes most sense
- **Component flexibility**: Use `components/ui/` patterns but create school-specific components as needed
- **Custom hooks**: Build upon existing patterns or create new ones for school-specific data handling
- **Utility functions**: Extend `lib/` directory or create new organization that fits your needs
- **Type definitions**: Use starter TypeScript patterns as foundation but expand/modify for school requirements
- **Form handling**: Leverage React Hook Form + Zod where helpful, but use simpler approaches if more appropriate
- **Styling**: Start with Tailwind setup but customize or add other styling approaches as needed

## Database Schema Principles
- Every table needs `tenant_id UUID` column
- Use proper foreign key relationships
- Include `created_at` and `updated_at` timestamps
- Follow consistent naming conventions
- Plan for soft deletes where appropriate

## Business Logic Requirements
- Support multiple children per parent account
- Handle grade scales and weighting systems
- Time-based access controls (school hours, academic terms)
- Audit trails for grade changes
- Backup and data export capabilities

## Testing Strategy
- Test with multiple tenant scenarios
- Verify RLS policies prevent data leakage
- Load testing with realistic school usage patterns
- Mobile device testing across iOS/Android
- Edge case handling for parent-child relationships

## Deployment & Monitoring
- Use Supabase's built-in monitoring
- Set up usage alerts before hitting free tier limits
- Implement custom usage dashboard for tenant management
- Plan for gradual rollout to pilot schools

## Key Success Metrics to Track
- User engagement (daily/monthly active users per school)
- Feature adoption rates
- Performance metrics (load times, error rates)
- Cost per tenant/student
- Support ticket volume

When implementing any feature, always consider:
1. **Does this work well for school management?** (Primary consideration)
2. How does this work across multiple tenants?
3. Are we maintaining data isolation with proper security?
4. Will this scale cost-effectively?
5. Is this mobile-optimized for teachers, parents, and admins?
6. How do we test this functionality thoroughly?
7. Can we leverage existing patterns, or do we need custom solutions?
8. Is the user experience intuitive for school stakeholders?
9. Does this maintain good code quality and maintainability?
10. Are we building the right features for our target users?

Always prioritize: **functional requirements**, security, user experience, cost efficiency, and code maintainability in that order.