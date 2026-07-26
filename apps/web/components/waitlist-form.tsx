"use client";

import { useState } from "react";

export function WaitlistForm({
  locale,
  labels,
}: Readonly<{
  locale: "sl" | "en";
  labels: {
    title: string;
    email: string;
    submit: string;
    privacy: string;
    success: string;
    duplicate: string;
    error: string;
  };
}>) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "duplicate" | "error">(
    "idle",
  );

  return (
    <form
      id="waitlist"
      className="card mx-auto mt-14 max-w-2xl p-7 sm:p-9"
      onSubmit={async (event) => {
        event.preventDefault();
        const formElement = event.currentTarget;
        setStatus("submitting");
        const form = new FormData(formElement);
        try {
          const response = await fetch("/api/waitlist", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              email: form.get("email"),
              website: form.get("website"),
              locale,
              categories: [],
            }),
          });
          if (!response.ok) {
            throw new Error("Waitlist request failed");
          }
          const result = (await response.json()) as { created: boolean };
          setStatus(result.created ? "success" : "duplicate");
          if (result.created) {
            formElement.reset();
          }
        } catch {
          setStatus("error");
        }
      }}
    >
      <h2 className="text-2xl font-extrabold text-[#0b1f33]">{labels.title}</h2>
      <label className="mt-6 block font-semibold text-slate-800" htmlFor="waitlist-email">
        {labels.email}
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="waitlist-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#0f766e]/15"
        />
        <button className="button button-primary" disabled={status === "submitting"} type="submit">
          {labels.submit}
        </button>
      </div>
      <input
        aria-hidden="true"
        className="absolute -left-[10000px]"
        name="website"
        tabIndex={-1}
        type="text"
        autoComplete="off"
      />
      <p className="mt-3 text-sm leading-6 text-slate-500">{labels.privacy}</p>
      <p className="mt-4 min-h-6 text-sm font-semibold" role="status" aria-live="polite">
        {status === "success"
          ? labels.success
          : status === "duplicate"
            ? labels.duplicate
            : status === "error"
              ? labels.error
              : ""}
      </p>
    </form>
  );
}
