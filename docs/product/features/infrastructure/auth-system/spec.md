# Feature: Authentication System

## Overview

**Feature ID**: `auth-system`
**Category**: Infrastructure
**Priority**: P0 (Required before all user-facing features)
**Complexity**: M
**Estimated Effort**: 2-3 days

### Summary
Implement passwordless magic link authentication using Supabase Auth. Users enter their email, receive a magic link, click to authenticate, and are automatically redirected to their dashboard. First-time users get a project auto-created on sign-up.

### Dependencies
- `database-setup` - Database must be configured with `projects` table

### Success Criteria
- [ ] Users can sign up/login with email (magic link)
- [ ] Magic link emails are delivered within 30 seconds
- [ ] First-time users get a project auto-created
- [ ] Returning users land on their existing project
- [ ] Sessions persist across browser sessions
- [ ] Rate limiting prevents abuse (5 requests/email/hour)
- [ ] Protected routes redirect unauthenticated users to login

---

## User Stories

### Primary User Story
> As a business owner, I want to sign up without creating a password so that I can get started in seconds.

### Additional Stories
1. As a returning user, I want to click a magic link and land directly on my dashboard so that I don't waste time.
2. As a user, I want my session to persist so that I don't have to re-authenticate every visit.
3. As a user, I want to logout securely so that I can protect my account on shared devices.

---

## Functional Requirements

### Authentication Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| AUTH-001 | User can enter email on signup/login page | Must Have | Single page for both |
| AUTH-002 | System sends magic link email via Supabase | Must Have | Uses Supabase SMTP |
| AUTH-003 | Clicking magic link authenticates user | Must Have | Redirects to callback |
| AUTH-004 | First-time users get project auto-created | Must Have | Name: "My Chatbot" |
| AUTH-005 | Returning users land on existing project | Must Have | Dashboard redirect |
| AUTH-006 | Session persists across browser sessions | Must Have | Refresh token handling |
| AUTH-007 | User can logout from dashboard | Must Have | Clears session |
| AUTH-008 | Magic link expires after 1 hour | Must Have | Security requirement |
| AUTH-009 | Rate limit magic link requests | Should Have | 5 per email per hour |
| AUTH-010 | Protected routes redirect to login | Must Have | Middleware handling |
| AUTH-011 | Show loading state during auth | Should Have | Better UX |
| AUTH-012 | Handle invalid/expired magic links | Must Have | Error messaging |

---

## User Interface

### Login/Signup Page (`/login`)

**Route**: `/login`
**Purpose**: Single page for both login and signup (magic links make this identical)

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                                                                 │
│                     ┌─────────────────────┐                     │
│                     │       [Logo]        │                     │
│                     │                     │                     │
│                     │    Welcome back     │                     │
│                     │                     │                     │
│                     │  Enter your email   │                     │
│                     │  to get started     │                     │
│                     │                     │                     │
│                     │  ┌───────────────┐  │                     │
│                     │  │ Email address │  │                     │
│                     │  └───────────────┘  │                     │
│                     │                     │                     │
│                     │  ┌───────────────┐  │                     │
│                     │  │ Continue →    │  │                     │
│                     │  └───────────────┘  │                     │
│                     │                     │                     │
│                     │  By continuing, you │                     │
│                     │  agree to our Terms │                     │
│                     │  and Privacy Policy │                     │
│                     │                     │                     │
│                     └─────────────────────┘                     │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Components**:
| Component | Type | Props/State | Behavior |
|-----------|------|-------------|----------|
| Logo | Image | - | Brand logo |
| Email Input | Input | value, onChange, error | Validates email format |
| Continue Button | Button | loading, disabled | Submits form, shows loading |
| Terms Link | Link | - | Opens terms page |
| Privacy Link | Link | - | Opens privacy page |

**States**:
- **Default**: Form ready for input
- **Loading**: Button shows spinner, input disabled
- **Error**: Shows inline error message under input
- **Success**: Redirects to check-email page

### Check Email Page (`/login/check-email`)

**Route**: `/login/check-email?email={email}`
**Purpose**: Confirmation that magic link was sent

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                                                                 │
│                     ┌─────────────────────┐                     │
│                     │       [Logo]        │                     │
│                     │                     │                     │
│                     │   Check your email  │                     │
│                     │                     │                     │
│                     │  We sent a magic    │                     │
│                     │  link to:           │                     │
│                     │                     │                     │
│                     │  sam@mystore.com    │                     │
│                     │                     │                     │
│                     │  Click the link to  │                     │
│                     │  sign in.           │                     │
│                     │                     │                     │
│                     │  ───────────────    │                     │
│                     │                     │                     │
│                     │  Didn't receive it? │                     │
│                     │  [Resend email]     │                     │
│                     │                     │                     │
│                     │  [← Back to login]  │                     │
│                     │                     │                     │
│                     └─────────────────────┘                     │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Components**:
| Component | Type | Props/State | Behavior |
|-----------|------|-------------|----------|
| Email Display | Text | email (from URL) | Shows where link was sent |
| Resend Button | Button | disabled (60s cooldown) | Resends magic link |
| Back Link | Link | - | Returns to login form |

**States**:
- **Default**: Shows confirmation message
- **Resend Cooldown**: Button disabled with countdown
- **Resend Loading**: Button shows spinner
- **Resend Success**: Shows "Email sent!" toast

### Auth Callback Route (`/auth/callback`)

**Route**: `/auth/callback`
**Purpose**: Handles magic link token verification

**Flow**:
```
1. User clicks magic link
   ↓
2. Supabase redirects to /auth/callback?code=xxx
   ↓
3. Route handler exchanges code for session
   ↓
4. Check if user has a project
   ├── No → Create default project
   └── Yes → Continue
   ↓
5. Redirect to /dashboard
```

---

## User Flow

### Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. User visits /login                                         │
│      │                                                          │
│      ▼                                                          │
│   2. User enters email, clicks "Continue"                       │
│      │                                                          │
│      ├── [Invalid email] → Show validation error                │
│      │                                                          │
│      ├── [Rate limited] → Show "Too many attempts" error        │
│      │                                                          │
│      └── [Valid] → Continue                                     │
│           │                                                     │
│           ▼                                                     │
│   3. System sends magic link email                              │
│      │                                                          │
│      ▼                                                          │
│   4. Redirect to /login/check-email?email=xxx                   │
│      │                                                          │
│      ▼                                                          │
│   5. User checks email, clicks magic link                       │
│      │                                                          │
│      ├── [Link expired] → Show error, option to resend          │
│      │                                                          │
│      └── [Valid] → Continue                                     │
│           │                                                     │
│           ▼                                                     │
│   6. Redirect to /auth/callback?code=xxx                        │
│      │                                                          │
│      ▼                                                          │
│   7. Exchange code for session                                  │
│      │                                                          │
│      ├── [New user] → Create project "My Chatbot"               │
│      │                                                          │
│      └── [Existing user] → Load existing project                │
│           │                                                     │
│           ▼                                                     │
│   8. Redirect to /dashboard                                     │
│                                                                 │
│   ════════════════════════════════════════════════════════════  │
│                                                                 │
│   LOGOUT FLOW:                                                  │
│                                                                 │
│   1. User clicks "Logout" in dashboard                          │
│      │                                                          │
│      ▼                                                          │
│   2. Call supabase.auth.signOut()                               │
│      │                                                          │
│      ▼                                                          │
│   3. Redirect to /login                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Specification

### Endpoints

#### POST /auth/magic-link

**Purpose**: Send magic link to email address

**Authentication**: None (public endpoint)

**Request**:
```typescript
// Body
{
  "email": "user@example.com"
}
```

**Response**:
```typescript
// 200 OK
{
  "success": true,
  "message": "Magic link sent"
}

// 400 Bad Request - Invalid email
{
  "error": {
    "code": "INVALID_EMAIL",
    "message": "Please enter a valid email address"
  }
}

// 429 Too Many Requests - Rate limited
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many attempts. Please try again in {minutes} minutes.",
    "retryAfter": 3600 // seconds
  }
}
```

---

## Technical Implementation

### Supabase Auth Configuration

```typescript
// apps/web/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// apps/web/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component - cookies are read-only
          }
        },
      },
    }
  );
}
```

### Login Page Component

```typescript
// apps/web/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@chatbot/ui';
import { Input } from '@chatbot/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          setError('Too many attempts. Please try again later.');
        } else {
          setError(error.message);
        }
        return;
      }

      // Redirect to check-email page
      router.push(`/login/check-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-muted-foreground mt-2">
            Enter your email to get started
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              aria-label="Email address"
            />
            {error && (
              <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !email}
          >
            {loading ? 'Sending...' : 'Continue'}
          </Button>
        </form>

        {/* Terms */}
        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline">Terms</a> and{' '}
          <a href="/privacy" className="underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
```

### Check Email Page

```typescript
// apps/web/app/(auth)/login/check-email/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@chatbot/ui';

export default function CheckEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const supabase = createClient();

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    setResending(true);

    try {
      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      setResendCooldown(60); // 60 second cooldown
    } catch (err) {
      // Handle error silently or show toast
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6 text-center">
        {/* Email icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <svg className="h-8 w-8" /* email icon */ />
        </div>

        <div>
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="text-muted-foreground mt-2">
            We sent a magic link to:
          </p>
          <p className="font-medium mt-1">{email}</p>
          <p className="text-muted-foreground mt-2">
            Click the link to sign in.
          </p>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Didn't receive it?
          </p>
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
          >
            {resending
              ? 'Sending...'
              : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend email'
            }
          </Button>
        </div>

        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to login
        </Link>
      </div>
    </div>
  );
}
```

### Auth Callback Route

```typescript
// apps/web/app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth error:', error);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    if (data.user) {
      // Check if user has a project
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', data.user.id)
        .single();

      // Create default project for new users
      if (!project) {
        const { error: createError } = await supabase
          .from('projects')
          .insert({
            user_id: data.user.id,
            name: 'My Chatbot',
          });

        if (createError) {
          console.error('Failed to create project:', createError);
        }
      }
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // No code provided
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
```

### Auth Middleware

```typescript
// apps/web/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes
  const protectedPaths = ['/dashboard', '/settings'];
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Redirect unauthenticated users to login
  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from auth pages
  const authPaths = ['/login', '/signup'];
  const isAuthPath = authPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAuthPath && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### Logout Handler

```typescript
// apps/web/app/(dashboard)/components/logout-button.tsx
'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@chatbot/ui';

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <Button variant="ghost" onClick={handleLogout}>
      Logout
    </Button>
  );
}
```

---

## Error Handling

### Error Codes

| Code | HTTP Status | Message | When It Occurs | User-Facing Message |
|------|-------------|---------|----------------|---------------------|
| INVALID_EMAIL | 400 | Email format invalid | User enters invalid email | "Please enter a valid email address" |
| RATE_LIMITED | 429 | Too many requests | >5 requests/email/hour | "Too many attempts. Please try again later." |
| AUTH_FAILED | 401 | Auth exchange failed | Token exchange fails | "Sign in failed. Please try again." |
| LINK_EXPIRED | 401 | Magic link expired | Link older than 1 hour | "This link has expired. Please request a new one." |
| NO_CODE | 400 | No auth code | Callback without code | Redirect to login |

### Error Flows

**Expired Magic Link**:
```
Trigger: User clicks link after 1 hour
Detection: Supabase returns auth_error
Handling: Show error page with resend option
User Impact: User sees "Link expired" message
Recovery: Click "Resend email" button
```

**Rate Limited**:
```
Trigger: >5 magic link requests per email per hour
Detection: Supabase returns rate_limit_error
Handling: Show error with retry time
User Impact: User must wait before requesting new link
Recovery: Wait for cooldown period
```

---

## Edge Cases

| # | Scenario | Expected Behavior | Test Case |
|---|----------|-------------------|-----------|
| 1 | User enters invalid email format | Show inline validation error | Enter "notanemail" |
| 2 | User requests link >5 times in 1 hour | Show rate limit error | Request 6 times rapidly |
| 3 | User clicks expired magic link | Show error with resend option | Wait 1 hour, click link |
| 4 | User already logged in visits /login | Redirect to /dashboard | Navigate to /login while logged in |
| 5 | User opens magic link in different browser | Should still work | Click link in different browser |
| 6 | User clicks magic link twice | First click works, second fails gracefully | Click link, then click again |
| 7 | Network error during magic link request | Show error, allow retry | Disable network, submit form |
| 8 | User closes tab before clicking link | Link still works when opened | Close tab, open link later |

---

## Security Considerations

### Authentication
- Magic links use cryptographically secure tokens
- Links expire after 1 hour (configurable in Supabase)
- One-time use - links are invalidated after use

### Authorization
- No authorization needed for login pages
- Dashboard requires authenticated session
- Middleware enforces route protection

### Data Validation
- Email format validated client-side and server-side
- Rate limiting prevents brute force attacks

### Sensitive Data
- No passwords stored (passwordless)
- Session tokens stored in httpOnly cookies
- Refresh tokens handled by Supabase

---

## Performance Considerations

### Expected Load
- Login page: Low traffic
- Magic link sending: ~1 req/sec per user

### Optimization Strategies
- Supabase handles email delivery (no custom SMTP)
- Client-side email validation reduces server calls
- Redirect URLs are pre-validated

### Benchmarks
- Magic link email delivery: <30 seconds
- Auth callback processing: <1 second
- Session validation: <100ms

---

## Testing Requirements

### Unit Tests
- [ ] Email validation accepts valid emails
- [ ] Email validation rejects invalid emails
- [ ] Rate limiting tracks requests correctly

### Integration Tests
- [ ] Magic link flow completes successfully
- [ ] New user gets project created
- [ ] Existing user sees existing project
- [ ] Expired link shows error
- [ ] Logout clears session

### E2E Tests
- [ ] Complete signup flow for new user
- [ ] Complete login flow for existing user
- [ ] Protected route redirects to login
- [ ] Logout redirects to login

---

## Implementation Notes

### Recommended Approach

1. **Start with**: Configure Supabase Auth settings
   - Enable email provider
   - Set redirect URLs
   - Configure email templates

2. **Then**: Implement login page
   - Form with email input
   - Submit handler with Supabase signInWithOtp

3. **Then**: Implement callback route
   - Exchange code for session
   - Create project for new users
   - Redirect to dashboard

4. **Then**: Implement middleware
   - Protect dashboard routes
   - Redirect authenticated users from auth pages

5. **Finally**: Implement logout
   - Sign out handler
   - Redirect to login

### Gotchas & Warnings

- Supabase SSR requires specific cookie handling
- Middleware must refresh session on every request
- Magic link emails may land in spam - check Supabase email settings
- Development uses different auth URLs than production

---

## Acceptance Criteria

### Definition of Done
- [ ] Login page renders and accepts email input
- [ ] Magic link emails are sent within 30 seconds
- [ ] Auth callback creates session successfully
- [ ] New users get project auto-created
- [ ] Protected routes redirect unauthenticated users
- [ ] Logout clears session completely
- [ ] Rate limiting prevents abuse
- [ ] Error states are handled gracefully

### Demo Checklist
- [ ] Show complete signup flow
- [ ] Show complete login flow
- [ ] Show protected route redirect
- [ ] Show logout functionality
- [ ] Show rate limiting in action

---

## Open Questions

None - This spec is complete and ready for implementation.

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Morgan (PM) | Initial spec |
