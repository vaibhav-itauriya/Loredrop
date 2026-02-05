# Firebase Auth Migration Guide

## Overview

Convex auth has been completely replaced with **Firebase Authentication**. This guide explains the changes and how to set up Firebase for your project.

## What Changed

### Removed
- `@usehercules/auth` and related OIDC authentication packages
- `@usehercules/eslint-plugin` and `@usehercules/vite` dev dependencies
- `oidc-client-ts` and `react-oidc-context` packages
- Hercules OIDC configuration in `convex/auth.config.js`

### Added
- `firebase` package (v12.8.0+)
- Firebase-based authentication in `src/components/providers/auth.tsx`
- Firebase ID token integration with Convex

## Setup Instructions

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Google Sign-In in **Authentication > Sign-in method**

### 2. Get Firebase Credentials

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Copy your Web app configuration
3. Create a `.env.local` file in the project root:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Convex Configuration
VITE_CONVEX_URL=http://localhost:3000
```

### 3. Update Convex Backend

Ensure your Convex functions can authenticate users via Firebase ID tokens. The `convex/auth.config.js` now delegates auth to Firebase:

```javascript
// Firebase authentication is now handled on the client side
// The Firebase ID token is passed to Convex via convex.setAuth()
export default {
  providers: [],
};
```

## Key Changes in Application Code

### Authentication Context

**Before (Hercules OIDC):**
```tsx
import { HerculesAuthProvider } from "@usehercules/auth/react";
```

**After (Firebase):**
```tsx
import { AuthProvider, useFirebaseAuth } from "@/components/providers/auth";
```

### Using Auth State

**Before:**
```tsx
const { user } = useAuth(); // From Hercules
// user.profile.name, user.profile.email
```

**After:**
```tsx
const { user, isAuthenticated } = useAuth(); // From Firebase
// user.displayName, user.email
```

### Sign In/Out

**Before:**
```tsx
const { signinRedirect, removeUser } = useAuth();
await signinRedirect(); // Redirect to OIDC provider
await removeUser();     // Logout
```

**After:**
```tsx
const { signinRedirect, removeUser } = useAuth();
await signinRedirect(); // Opens Google Sign-In popup
await removeUser();     // Logout
```

### Conditionally Rendering UI

**Before (Convex components):**
```tsx
import { Authenticated, Unauthenticated } from "convex/react";

<Authenticated>
  {/* Show when authenticated */}
</Authenticated>
<Unauthenticated>
  {/* Show when not authenticated */}
</Unauthenticated>
```

**After (Firebase-based):**
```tsx
import { useAuth } from "@/hooks/use-auth";

const { isAuthenticated } = useAuth();

{isAuthenticated ? (
  <>{/* Show when authenticated */}</>
) : (
  <>{/* Show when not authenticated */}</>
)}
```

## Convex Integration

The Firebase ID token is automatically sent to Convex via `convex.setAuth()`:

```tsx
// src/components/providers/convex.tsx
useEffect(() => {
  if (user) {
    const token = await user.getIdToken();
    convex.setAuth(token); // Pass token to Convex
  } else {
    convex.clearAuth();    // Clear auth on logout
  }
}, [user]);
```

To access the authenticated user in your Convex functions, use `ctx.auth`:

```typescript
export const getUser = query(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }
  return identity;
});
```

## Environment Variables Reference

See `.env.example` for the complete list of required environment variables.

## Testing

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Click the "Sign In" button
3. You should see the Google Sign-In popup
4. After authentication, the app should redirect to the feed page
5. Your user info should display in the header

## Migration Checklist

- [x] Firebase credentials configured in `.env.local`
- [x] Auth provider replaced with Firebase
- [x] `useAuth()` hook returns Firebase user data
- [x] Sign in/out flows work with Google provider
- [x] Convex integration with Firebase ID tokens
- [x] UI components use Firebase auth state
- [x] Old Hercules packages removed from dependencies

## Support

For Firebase-specific issues:
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firebase Console](https://console.firebase.google.com/)

For Convex integration questions:
- [Convex Documentation](https://docs.convex.dev/)
