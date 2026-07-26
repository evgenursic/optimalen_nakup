"use client";

import { UserButton } from "@clerk/nextjs";
import type { Id } from "@convex/_generated/dataModel";
import { Bell, CirclePlus, CreditCard, Gauge, Library, Settings, ShieldCheck } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";

import { useWorkspace } from "./workspace-context";

const links = [
  { href: "/app", icon: Gauge, sl: "Pregled", en: "Overview" },
  { href: "/app/research/new", icon: CirclePlus, sl: "Nova raziskava", en: "New research" },
  { href: "/app/saved", icon: Library, sl: "Shranjeno", en: "Saved" },
  { href: "/app/billing", icon: CreditCard, sl: "Naročnina", en: "Billing" },
  { href: "/app/settings", icon: Settings, sl: "Nastavitve", en: "Settings" },
  { href: "/app/admin", icon: ShieldCheck, sl: "Administracija", en: "Administration" },
] as const;

export function AppShell({
  children,
  locale,
}: Readonly<{ children: React.ReactNode; locale: "sl" | "en" }>) {
  const pathname = usePathname();
  const { workspace, workspaces, setWorkspaceId } = useWorkspace();

  return (
    <div className="app-frame">
      <aside className="app-sidebar" aria-label={locale === "sl" ? "Aplikacija" : "Application"}>
        <div>
          <p className="text-xs font-bold tracking-widest text-teal-700 uppercase">
            {locale === "sl" ? "Delovni prostor" : "Workspace"}
          </p>
          <select
            className="app-select mt-2 w-full"
            value={workspace.id}
            onChange={(event) => setWorkspaceId(event.target.value as Id<"organizations">)}
            aria-label={locale === "sl" ? "Izberi delovni prostor" : "Choose workspace"}
          >
            {workspaces.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500">
            {workspace.role} · {workspace.plan.replace("_", " ")}
          </p>
        </div>
        <nav className="mt-8 grid gap-1">
          {links.map(({ href, icon: Icon, sl, en }) => {
            const active = href === "/app" ? pathname === "/app" : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`app-nav-link ${active ? "app-nav-link-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon aria-hidden="true" size={19} />
                {locale === "sl" ? sl : en}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-5">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Bell aria-hidden="true" size={18} />
            {locale === "sl" ? "Obvestila" : "Alerts"}
          </span>
          <UserButton />
        </div>
      </aside>
      <div className="app-content">{children}</div>
    </div>
  );
}
