# Firebase Auth Quick Start

## 1️⃣ Create Firebase Project (5 min)

Visit https://console.firebase.google.com/
- Click "Create project"
- Enter project name: "Loredrop" (or your choice)
- Click "Create project"

## 2️⃣ Enable Google Sign-In (2 min)

1. In Firebase Console, go to **Authentication** (left menu)
2. Click **Sign-in method** tab
3. Click **Google** → Enable it → Save

## 3️⃣ Get Your Credentials (1 min)

1. Click **Project Settings** (gear icon, top right)
2. Go to **Your apps** section
3. Look for Web app (or create one if needed)
4. Copy the config object

Your config will look like:
```javascript
{
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-12345",
  storageBucket: "your-project-12345.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
}
```

## 4️⃣ Set Environment Variables (1 min)

Create `.env.local` in project root:

```bash
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-12345
VITE_FIREBASE_STORAGE_BUCKET=your-project-12345.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc...
VITE_CONVEX_URL=http://localhost:3000
```

## 5️⃣ Start Development (1 min)

```bash
pnpm dev
```

## ✅ Test It

1. Open http://localhost:5173 in your browser
2. Click **"Sign In"** button
3. Choose your Google account
4. You should be logged in!

---

## 🔗 Useful Links

- **Firebase Console**: https://console.firebase.google.com
- **Firebase Auth Docs**: https://firebase.google.com/docs/auth
- **Setup Docs**: See `FIREBASE_MIGRATION.md` in project root

## ❓ Issues?

Check the full migration guide: `FIREBASE_MIGRATION.md`

Common issues:
- ❌ **"Firebase config not found"** → Check `.env.local` has all variables
- ❌ **"Google Sign-In not showing"** → Enable it in Firebase Console
- ❌ **"Can't sign in"** → Check project domain is authorized in Firebase
