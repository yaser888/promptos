"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ClerkProvider, useUser, useClerk } from "@clerk/nextjs";

const ClerkDisabledContext = createContext(false);

export type NormalizedUser = {
  id: string;
  clerkId?: string;
  name: string;
  email: string;
  role: string;
} | null;

export type NormalizedAuth = {
  isSignedIn: boolean;
  user: NormalizedUser;
  isLoaded: boolean;
  signOut: () => Promise<void>;
};

function normalizeClerkUser(clerkUser: any): NonNullable<NormalizedUser> {
  return {
    id: clerkUser?.id,
    clerkId: clerkUser?.id,
    name:
      clerkUser?.fullName ||
      clerkUser?.username ||
      clerkUser?.primaryEmailAddress?.emailAddress ||
      "User",
    email: clerkUser?.primaryEmailAddress?.emailAddress || "",
    role: (clerkUser?.publicMetadata?.role as string) || "USER",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const clerkDisabled = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <ClerkDisabledContext.Provider value={clerkDisabled}>
      {clerkDisabled ? (
        <LocalAuthProvider>{children}</LocalAuthProvider>
      ) : (
        <ClerkProvider>{children}</ClerkProvider>
      )}
    </ClerkDisabledContext.Provider>
  );
}

function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<NormalizedUser>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user || null);
        setIsLoaded(true);
      })
      .catch(() => {
        setUser(null);
        setIsLoaded(true);
      });
  }, []);

  const value: NormalizedAuth = {
    isSignedIn: !!user,
    user,
    isLoaded,
    signOut: async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        setUser(null);
      }
    },
  };

  return <LocalContext.Provider value={value}>{children}</LocalContext.Provider>;
}

const LocalContext = createContext<NormalizedAuth>({
  isSignedIn: false,
  user: null,
  isLoaded: false,
  signOut: async () => {},
});

export function useAuthUser(): NormalizedAuth {
  const disabled = useContext(ClerkDisabledContext);
  if (!disabled) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { isSignedIn, user, isLoaded } = useUser();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { signOut } = useClerk();
    return {
      isSignedIn: !!isSignedIn,
      user: user ? normalizeClerkUser(user) : null,
      isLoaded,
      signOut: async () => {
        await signOut();
      },
    };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useContext(LocalContext);
}