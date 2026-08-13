"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export function InvitationAcceptPage({
  locale,
  token,
}: Readonly<{ locale: "sl" | "en"; token: string }>) {
  const { isLoaded, isSignedIn } = useAuth();
  const accept = useMutation(api.organizations.acceptInvitation);
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "accepting" | "error">("idle");

  async function acceptInvitation() {
    setStatus("accepting");
    try {
      await accept({ tokenHash: await sha256(token) });
      router.replace("/app");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main id="main-content" className="container py-16 lg:py-24">
      <section className="card mx-auto max-w-2xl p-8 text-center">
        <ShieldCheck aria-hidden="true" className="mx-auto text-teal-700" size={38} />
        <p className="eyebrow mt-6">{locale === "sl" ? "Varno vabilo" : "Secure invitation"}</p>
        <h1 className="mt-5 text-3xl font-extrabold text-[#0b1f33]">
          {locale === "sl" ? "Pridružite se delovnemu prostoru" : "Join the workspace"}
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          {locale === "sl"
            ? "Vabilo je enkratno, časovno omejeno in vezano na preverjeni e-poštni naslov vašega Clerk računa."
            : "This invitation is single-use, time-limited, and bound to your Clerk account's verified email address."}
        </p>
        {!isLoaded ? (
          <p className="mt-7 font-semibold text-slate-600" aria-busy="true">
            {locale === "sl" ? "Preverjam sejo …" : "Checking session …"}
          </p>
        ) : !isSignedIn ? (
          <SignInButton mode="modal">
            <button className="button button-primary mt-8" type="button">
              {locale === "sl" ? "Prijava za sprejem" : "Sign in to accept"}
            </button>
          </SignInButton>
        ) : (
          <button
            className="button button-primary mt-8"
            disabled={status === "accepting"}
            onClick={() => void acceptInvitation()}
            type="button"
          >
            <CheckCircle2 aria-hidden="true" size={18} />
            {status === "accepting"
              ? locale === "sl"
                ? "Sprejemam …"
                : "Accepting …"
              : locale === "sl"
                ? "Sprejmi vabilo"
                : "Accept invitation"}
          </button>
        )}
        {status === "error" ? (
          <p className="mt-6 rounded-lg bg-red-50 p-4 font-semibold text-red-800" role="alert">
            {locale === "sl"
              ? "Vabilo je neveljavno, poteklo, že uporabljeno ali pripada drugemu e-poštnemu naslovu."
              : "The invitation is invalid, expired, already used, or belongs to another email address."}
          </p>
        ) : null}
      </section>
    </main>
  );
}
