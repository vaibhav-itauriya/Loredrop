# Firebase Auth Replacement Summary

## Files Modified

### 1. **src/components/providers/auth.tsx**
- **Before**: Used `HerculesAuthProvider` from `@usehercules/auth/react`
- **After**: 
  - Initializes Firebase app with config from environment variables
  - Provides `FirebaseAuthContext` with `useFirebaseAuth()` hook
  - Listens to `onAuthStateChanged` to track user state

### 2. **src/hooks/use-auth.ts**
- **Before**: Re-exported `useUser` and `useAuth` from Hercules
- **After**: 
  - Custom `useAuth()` hook using Firebase auth
  - Implements `signinRedirect()` using Google popup auth
  - Implements `removeUser()` for sign-out
  - Returns: `user`, `isAuthenticated`, `isLoading`, `error`, and auth methods

### 3. **src/components/providers/convex.tsx**
- **Before**: Used `ConvexProviderWithHerculesAuth` which auto-managed tokens
- **After**:
  - Wraps `ConvexReactProvider` with manual token management
  - Inner `ConvexAuthSetter` component handles Firebase token passing to Convex
  - Uses `convex.setAuth(token)` when user exists, `convex.clearAuth()` on logout

### 4. **src/components/ui/signin.tsx**
- **Before**: Error handling for Hercules auth
- **After**: 
  - Works with Firebase auth methods (`signinRedirect`, `removeUser`)
  - Updated error messaging for Firebase errors
  - Maintains same UI/UX with loading states and icons

### 5. **src/pages/auth/Callback.tsx**
- **Before**: Used `useAuthCallback` from Hercules to handle OIDC callback
- **After**:
  - Simplified to check Firebase `user` state and Convex authentication
  - Syncs user with backend via mutation
  - No external callback URL needed (Firebase handles it)

### 6. **src/pages/feed/_components/FeedHeader.tsx**
- **Before**: Used `<Authenticated>` and `<Unauthenticated>` Convex components
- **After**: 
  - Uses conditional rendering with `isAuthenticated` from `useAuth()`
  - Updated user properties: `displayName` and `email` (from Firebase User object)

## Files Removed/Updated

### 1. **convex/auth.config.js**
- Updated to remove Hercules OIDC configuration
- Now delegates auth to Firebase (handled via client-side token passing)

### 2. **package.json**
- **Removed packages**:
  - `@usehercules/auth` (was v1.0.40)
  - `@usehercules/eslint-plugin` (dev)
  - `@usehercules/vite` (dev)
  - `oidc-client-ts`
  - `react-oidc-context`

- **Added packages**:
  - `firebase` (v12.8.0)

## Environment Variables Changes

### Removed
- `VITE_HERCULES_OIDC_AUTHORITY`
- `VITE_HERCULES_OIDC_CLIENT_ID`
- `VITE_HERCULES_OIDC_PROMPT`
- `VITE_HERCULES_OIDC_RESPONSE_TYPE`
- `VITE_HERCULES_OIDC_SCOPE`
- `VITE_HERCULES_OIDC_REDIRECT_URI`

### Added
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## User Object Changes

### Hercules User Structure
```typescript
user.profile.name
user.profile.email
```

### Firebase User Structure
```typescript
user.displayName
user.email
user.uid
user.photoURL
// ...other Firebase User properties
```

## Authentication Flow

### Before (Hercules OIDC)
1. User clicks Sign In → Redirected to OIDC authority
2. After login, redirected to `/auth/callback`
3. `useAuthCallback` handled the redirect and synced with Convex
4. Auto-managed token refresh

### After (Firebase)
1. User clicks Sign In → Google Sign-In popup appears
2. After login, user state updates immediately
3. Firebase ID token automatically sent to Convex via `convex.setAuth()`
4. User redirected to `/feed`
5. Firebase auto-handles token refresh

## Key Advantages of Firebase

✅ **Simpler Setup**: Google Sign-In out of the box
✅ **No Redirect**: Popup-based authentication
✅ **Better UX**: No page redirects needed
✅ **Managed**: Firebase handles token lifecycle
✅ **Scalable**: Easy to add more providers (GitHub, Facebook, etc.)
✅ **Secure**: Industry-standard authentication service

## Next Steps

1. ✅ Replace auth provider with Firebase
2. ✅ Update all auth hooks and components
3. ✅ Configure Convex token handling
4. ✅ Remove Hercules dependencies
5. **TODO**: Configure Firebase project with Google Sign-In
6. **TODO**: Set environment variables in `.env.local`
7. **TODO**: Test authentication flows
8. **TODO**: (Optional) Add more auth providers in Firebase Console
