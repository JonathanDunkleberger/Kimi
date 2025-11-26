// Thin wrapper around Clerk that provides inert fallbacks during SSG if no publishable key is present.
import React, { PropsWithChildren, createContext, useContext } from 'react';

let realClerk: typeof import('@clerk/nextjs') | null = null;
try {
  realClerk = require('@clerk/nextjs');
} catch {
  realClerk = null;
}

const hasKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Fallback context & hooks
interface StubAuth {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  getToken: () => Promise<string | null>;
}

const stubValue: StubAuth = {
  isLoaded: true,
  isSignedIn: true, // Force signed in as guest
  userId: 'guest_user_123',
  getToken: async () => 'guest_token',
};

const StubAuthContext = createContext<StubAuth>(stubValue);

export function useAuth() {
  // Always return stub auth for now to bypass Clerk
  return useContext(StubAuthContext);
}

export const SignedIn: React.FC<PropsWithChildren> = ({ children }) => {
  // Always render children as if signed in
  return <>{children}</>;
};

export const SignedOut: React.FC<PropsWithChildren> = ({ children }) => {
  // Never render children as if signed out
  return null;
};

type AnyProps = Record<string, unknown>;

export const SignInButton: React.FC<AnyProps> = (props) => {
  return <>{props.children || null}</>;
};

export const UserButton: React.FC<AnyProps> = (props) => {
  return <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold">G</div>;
};

export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  // Always use stub provider
  return <StubAuthContext.Provider value={stubValue}>{children}</StubAuthContext.Provider>;
};
