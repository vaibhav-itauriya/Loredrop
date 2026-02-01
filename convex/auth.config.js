// Firebase authentication is now handled on the client side
// The Firebase ID token is passed to Convex via convex.setAuth()
// See src/components/providers/convex.tsx for implementation

export default {
  // Auth is configured through Firebase on the client
  // Convex functions receive the authenticated user context via the ID token
  providers: [],
};
