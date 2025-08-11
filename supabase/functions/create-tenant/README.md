# Supabase Edge Function: Create Tenant

This Edge Function securely creates new school tenants with admin users.

## Purpose
- Server-side tenant creation with validation
- Atomic operations with cleanup on failure
- Security through service role privileges
- Auto-confirmation of admin emails

## API Endpoint
```
POST /functions/v1/create-tenant
```

## Request Body
```json
{
  "email": "admin@school.edu",
  "password": "SecurePassword123",
  "schoolName": "Lincoln Elementary",
  "schoolAddress": "123 Main St, City, State",
  "schoolPhone": "+1-555-0123",
  "schoolEmail": "contact@school.edu",
  "adminFirstName": "John",
  "adminLastName": "Doe",
  "subscriptionTier": "free"
}
```

## Response
```json
{
  "success": true,
  "tenantId": "uuid",
  "userId": "uuid"
}
```

## Error Handling
- Validates all input data
- Checks for duplicate emails and school names
- Performs atomic operations with cleanup
- Returns descriptive error messages

## Security Features
- Uses service role key for admin operations
- Auto-confirms admin email (bypasses verification)
- Creates default academic term
- Implements proper CORS headers

## Deployment
Deploy using Supabase CLI:
```bash
supabase functions deploy create-tenant
```

## Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
