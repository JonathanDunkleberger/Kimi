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
  isSignedIn: false,
  userId: null,
  getToken: async () => null,
};

const StubAuthContext = createContext<StubAuth>(stubValue);

export function useAuth() {
  if (hasKey && realClerk?.useAuth) return realClerk.useAuth();
  return useContext(StubAuthContext);
}

export const SignedIn: React.FC<PropsWithChildren> = ({ children }) => {
  if (hasKey && realClerk?.SignedIn) return React.createElement(realClerk.SignedIn, null, children);
  return null;
};

export const SignedOut: React.FC<PropsWithChildren> = ({ children }) => {
  if (hasKey && realClerk?.SignedOut) return React.createElement(realClerk.SignedOut, null, children);
  return <>{children}</>; // treat as signed out
};

type AnyProps = Record<string, unknown>;

export const SignInButton: React.FC<AnyProps> = (props) => {
  if (hasKey && realClerk?.SignInButton) return React.createElement(realClerk.SignInButton, props);
  return <>{props.children || null}</>;
};

export const UserButton: React.FC<AnyProps> = (props) => {
  if (hasKey && realClerk?.UserButton) return React.createElement(realClerk.UserButton, props);
  return null;
};

export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  if (hasKey && realClerk?.ClerkProvider) {
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!;
  return <realClerk.ClerkProvider publishableKey={publishableKey}>{children}</realClerk.ClerkProvider> as any;
  }
  if (!hasKey && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn('[Auth] Running without Clerk key; using stub auth context.');
  }
  return <StubAuthContext.Provider value={stubValue}>{children}</StubAuthContext.Provider>;
};
