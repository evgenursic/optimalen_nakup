"use client";

import { AuthProvider } from "./auth-provider";
import { SignInContent } from "./sign-in-content";

export function ClerkSignInPanel() {
  return (
    <AuthProvider>
      <SignInContent />
    </AuthProvider>
  );
}
