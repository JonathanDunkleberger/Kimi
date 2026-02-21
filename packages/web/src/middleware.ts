import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// These routes require sign-in
const isProtectedRoute = createRouteMatcher([
  '/entries(.*)',  // My Lineups requires auth
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
