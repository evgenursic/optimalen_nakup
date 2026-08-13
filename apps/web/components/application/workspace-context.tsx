"use client";

import { useUser } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type Workspace = {
  id: Id<"organizations">;
  name: string;
  slug: string;
  plan: "closed_beta" | "starter" | "pro" | "business";
  role: "owner" | "admin" | "researcher" | "viewer";
};

interface WorkspaceContextValue {
  workspace: Workspace;
  workspaces: Workspace[];
  setWorkspaceId(id: Id<"organizations">): void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const storageKey = "optimalen-nakup.workspace";

function slugFor(value: string): string {
  return value
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "")
    .slice(0, 63);
}

function WorkspaceOnboarding({ locale }: Readonly<{ locale: "sl" | "en" }>) {
  const createWorkspace = useMutation(api.organizations.create);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = slugFor(name);
    if (name.trim().length < 3 || slug.length < 3) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    try {
      const id = await createWorkspace({ name: name.trim(), slug });
      localStorage.setItem(storageKey, id);
    } catch {
      setStatus("error");
    }
  }

  return (
    <main id="main-content" className="container py-16">
      <section className="card mx-auto max-w-xl p-8">
        <p className="eyebrow">{locale === "sl" ? "Prvi korak" : "First step"}</p>
        <h1 className="mt-5 text-3xl font-extrabold text-[#0b1f33]">
          {locale === "sl" ? "Ustvarite delovni prostor" : "Create your workspace"}
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          {locale === "sl"
            ? "Raziskave, člani, poraba in naročnina so varno ločeni po delovnih prostorih."
            : "Research, members, usage, and billing are securely isolated by workspace."}
        </p>
        <form className="mt-8 grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 font-semibold">
            {locale === "sl" ? "Ime delovnega prostora" : "Workspace name"}
            <input
              className="app-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={3}
              maxLength={100}
              autoComplete="organization"
              required
            />
          </label>
          <button className="button button-primary" disabled={status === "saving"} type="submit">
            {status === "saving"
              ? locale === "sl"
                ? "Ustvarjam …"
                : "Creating …"
              : locale === "sl"
                ? "Ustvari prostor"
                : "Create workspace"}
          </button>
          {status === "error" ? (
            <p role="alert" className="text-sm font-semibold text-red-700">
              {locale === "sl"
                ? "Prostora ni bilo mogoče ustvariti. Preverite ime in poskusite znova."
                : "The workspace could not be created. Check the name and try again."}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}

export function WorkspaceProvider({
  children,
  locale,
}: Readonly<{ children: React.ReactNode; locale: "sl" | "en" }>) {
  const { user } = useUser();
  const me = useQuery(api.users.me);
  const syncUser = useMutation(api.users.syncCurrentUser);
  const syncStarted = useRef(false);
  const workspaces = useQuery(api.organizations.listMine, me ? {} : "skip");
  const [selectedId, setSelectedId] = useState<Id<"organizations"> | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return localStorage.getItem(storageKey) as Id<"organizations"> | null;
  });

  useEffect(() => {
    if (me === null && !syncStarted.current) {
      syncStarted.current = true;
      const displayName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress;
      void syncUser({
        ...(displayName ? { displayName } : {}),
        locale,
      }).catch(() => {
        syncStarted.current = false;
      });
    }
  }, [locale, me, syncUser, user]);

  const value = useMemo<WorkspaceContextValue | null>(() => {
    if (!workspaces || workspaces.length === 0) {
      return null;
    }
    const workspace = workspaces.find((candidate) => candidate.id === selectedId) ?? workspaces[0];
    if (!workspace) {
      return null;
    }
    return {
      workspace,
      workspaces,
      setWorkspaceId(id) {
        localStorage.setItem(storageKey, id);
        setSelectedId(id);
      },
    };
  }, [selectedId, workspaces]);

  if (me === undefined || me === null || workspaces === undefined) {
    return (
      <main id="main-content" className="container py-20" aria-busy="true">
        <div className="card mx-auto max-w-xl p-8">
          <p className="font-semibold text-slate-700">
            {locale === "sl" ? "Pripravljam varen delovni prostor …" : "Preparing your workspace …"}
          </p>
        </div>
      </main>
    );
  }
  if (workspaces.length === 0) {
    return <WorkspaceOnboarding locale={locale} />;
  }
  if (!value) {
    return null;
  }
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return context;
}
