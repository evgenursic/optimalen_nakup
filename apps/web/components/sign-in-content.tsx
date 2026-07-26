"use client";

import { SignIn } from "@clerk/nextjs";

export function SignInContent({ notConfigured }: Readonly<{ notConfigured: string }>) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="card max-w-xl p-7" role="status">
        <p className="leading-7 text-slate-700">{notConfigured}</p>
      </div>
    );
  }

  return <SignIn />;
}
