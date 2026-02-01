# IITK Email Verification Flow

## Overview

The application now implements a comprehensive three-step email verification flow for IITK-only sign-in:

```
Step 1: Email Verification
    ↓
Step 2: Google Sign-In
    ↓
Step 3: Code Verification
    ↓
Access Granted to /feed
```

## How It Works

### Step 1: Email Entry & Validation
**Page:** `/auth/verify-email`

Users enter their IITK email address on the verification page:
- Input field validates for `@iitk.ac.in` domain
- Real-time validation feedback
- Clear error messages if format is incorrect
- Button remains disabled until valid email is entered

**Frontend validation:**
```typescript
const validateIITEmail = (email: string) => {
  return email.endsWith('@iitk.ac.in');
};
```

### Step 2: Google Sign-In
After email validation, users are prompted to sign in with their Google account:
- Instructions display the IITK email entered in Step 1
- Users must use a Google account associated with that IITK email
- SignIn button triggers Google OAuth popup
- Currently redirects to `/auth/verify-email` after successful authentication

**Key Update:**
- `useAuth.signinRedirect()` now redirects to `/auth/verify-email` instead of `/feed`
- This allows email verification before granting access

### Step 3: Verification Code Entry
After Google sign-in, users receive a 6-digit verification code via email:
- Code sent to the IITK email address
- Input field with auto-formatting (numbers only, max 6 digits)
- Large, centered font for easy reading
- Real-time validation and error handling

**Features:**
- Code input validates at exactly 6 digits before allowing submission
- "Resend Code" button with 60-second cooldown
- In development mode, verification code is logged to console
- Visual feedback with Loader2 animation during verification

### Verification Backend

**POST `/api/auth/send-verification-code`**
```json
Request:
{
  "email": "user@iitk.ac.in"
}

Response:
{
  "message": "Verification code sent",
  "code": "123456" // Only in development
}
```

**POST `/api/auth/verify-code`**
```json
Request:
{
  "email": "user@iitk.ac.in",
  "code": "123456",
  "firebaseUid": "...",
  "displayName": "User Name"
}

Response:
{
  "message": "Email verified successfully",
  "user": { ... }
}
```

## User Flow

### New User (First Sign-In)
1. Navigate to home page or click "Sign In"
2. Redirected to `/auth/verify-email`
3. Enter IITK email (e.g., `john.doe@iitk.ac.in`)
4. Click "Continue with Email"
5. Instructed to sign in with Google
6. Google popup appears → Sign in with associated Google account
7. Redirected back to verification page
8. Check email for 6-digit verification code
9. Enter code on verification page
10. Code verified ✓
11. Redirected to `/feed` (feed page)

### Returning User (Already Verified)
1. System detects existing user via Firebase UID
2. Skips email verification if already verified in this session
3. Accesses feed immediately

## Error Handling

**Email Validation Errors:**
- "Please enter your IITK email"
- "Please use a valid IITK email address (ending with @iitk.ac.in)"

**Sign-In Errors:**
- "Google email doesn't match IITK email"
- "User not authenticated. Please sign in again."

**Code Verification Errors:**
- "Please enter the verification code"
- "Invalid verification code" (from backend)
- "Code has expired" (if older than 15 minutes)

## Component Structure

**`src/pages/auth/EmailVerification.tsx`**
- Main verification page component
- Manages three-step flow state
- Handles API calls to backend
- Error and success message display
- Resend code cooldown timer

**`src/hooks/use-auth.ts`** (Updated)
- `signinRedirect()` now redirects to `/auth/verify-email`
- Still validates IITK email immediately after Google sign-in
- Auto-signs out if email doesn't end with `@iitk.ac.in`

**`src/App.tsx`** (Updated)
- Added route: `POST /auth/verify-email` → `<EmailVerification />`

## Environment Variables

Ensure these are set in `.env.local`:

```
VITE_API_URL=http://localhost:3001/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
# ... other Firebase config
```

## Security Features

1. **Email Domain Validation**
   - Frontend: Real-time @iitk.ac.in check
   - Backend: Server-side validation on code submission

2. **Verification Code Security**
   - 6-digit codes (1 million combinations)
   - 15-minute expiration (TTL index in MongoDB)
   - Single-use codes (marked as verified after use)
   - Dev mode: Shows code in console only (not visible to users in production)

3. **Firebase Integration**
   - Google Sign-In via Firebase
   - Bearer token authentication for API calls
   - No plain passwords stored

4. **Email Matching**
   - Google email must match IITK email entered in Step 1
   - Prevents unauthorized account takeovers

## Testing

### Manual Testing Steps

1. **Valid Email Entry:**
   - Go to `/auth/verify-email`
   - Enter valid IITK email: `test@iitk.ac.in`
   - Click "Continue with Email" ✓

2. **Invalid Email Entry:**
   - Go to `/auth/verify-email`
   - Enter invalid email: `test@gmail.com`
   - Should show error message ✓

3. **Complete Sign-In Flow:**
   - Enter IITK email
   - Click continue
   - Follow Google sign-in prompt
   - Return to verification page
   - Check backend console for code (or email if configured)
   - Enter code
   - Should redirect to `/feed` ✓

4. **Resend Code:**
   - After entering email, wait for code to be sent
   - Click "Resend Code" button
   - Button should show "Resend in 60s..."
   - After 60 seconds, button should be clickable again ✓

5. **Email Mismatch Error:**
   - Sign in with Google account for `john@iitk.ac.in`
   - But enter different email `jane@iitk.ac.in` in Step 1
   - Should show error: "Google email doesn't match IITK email" ✓

## Development Notes

- In **development mode**, verification codes are logged to console
- In **production**, codes are sent only via email
- All code generation is server-side for security
- No codes are ever stored in frontend localStorage or cookies

## Future Enhancements

- [ ] SMS verification as alternative to email
- [ ] Remember device for future sign-ins
- [ ] Email verification with Gmail/Outlook verification links
- [ ] Admin panel to view unverified emails
- [ ] Rate limiting on code generation (prevent spam)
- [ ] Automatic email resend after 5 minutes if code not entered
