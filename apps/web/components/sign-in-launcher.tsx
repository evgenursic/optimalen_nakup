"use client";

import { lazy, Suspense, useState } from "react";

const ClerkSignInPanel = lazy(() =>
  import("./clerk-sign-in-panel").then((module) => ({
    default: module.ClerkSignInPanel,
  })),
);

function LoadingPanel({ label }: Readonly<{ label: string }>) {
  return (
    <div aria-busy="true" className="card max-w-xl p-7" role="status">
      {label}
    </div>
  );
}

export function SignInLauncher({
  label,
  loadingLabel,
}: Readonly<{ label: string; loadingLabel: string }>) {
  const [opened, setOpened] = useState(false);

  if (opened) {
    return (
      <Suspense fallback={<LoadingPanel label={loadingLabel} />}>
        <ClerkSignInPanel />
      </Suspense>
    );
  }

  return (
    <div className="card max-w-xl p-7">
      <button
        className="button button-primary w-full"
        onClick={() => setOpened(true)}
        type="button"
      >
        {label}
      </button>
    </div>
  );
}
