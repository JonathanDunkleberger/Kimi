import { Request } from 'express';

export type AppAuth = {
  userId: string;
  email?: string | null;
  isGuest: boolean;
};

/** Prefer Clerk user on the request; otherwise guest mode for local/demo. */
export function resolveAuth(req: Request): AppAuth {
  const auth = (req as Request & { auth?: { userId?: string | null } }).auth;
  if (auth?.userId) {
    return { userId: auth.userId, email: null, isGuest: false };
  }
  return { userId: 'guest_user_123', email: 'guest@esportsprops.com', isGuest: true };
}
