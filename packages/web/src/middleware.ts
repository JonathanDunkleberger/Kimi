import { clerkMiddleware } from '@clerk/nextjs/server';

// All routes are public — individual pages handle their own auth state
// (showing sign-in prompts when needed instead of hard redirects)
export default clerkMiddleware();

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
