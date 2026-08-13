"use client";

import { api } from "@convex/_generated/api";
import { useConvex, useMutation, useQuery } from "convex/react";
import { CreditCard, Download, MailPlus, Trash2, Users } from "lucide-react";
import { useState } from "react";

import { Link } from "@/i18n/navigation";

import { useWorkspace } from "./workspace-context";

type Role = "owner" | "admin" | "researcher" | "viewer";

function downloadJson(value: string): void {
  const blob = new Blob([value], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `optimalen-nakup-export-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SettingsPage({ locale }: Readonly<{ locale: "sl" | "en" }>) {
  const { workspace } = useWorkspace();
  const convex = useConvex();
  const canManage = workspace.role === "owner" || workspace.role === "admin";
  const isOwner = workspace.role === "owner";
  const members = useQuery(api.organizations.listMembers, {
    organizationId: workspace.id,
  });
  const invitations = useQuery(
    api.organizations.listInvitations,
    canManage ? { organizationId: workspace.id } : "skip",
  );
  const updateMemberRole = useMutation(api.organizations.updateMemberRole);
  const revokeInvitation = useMutation(api.organizations.revokeInvitation);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<Role, "owner">>("researcher");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState("");
  const [exportRequested, setExportRequested] = useState(false);
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  const [renderedAt] = useState(() => Date.now());

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("invite");
    setStatus("");
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId: workspace.id,
          email,
          role,
          locale,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus(
          payload.error === "email_not_configured"
            ? locale === "sl"
              ? "Vabilo ni ustvarjeno: e-poštni transport še ni konfiguriran."
              : "No invitation was created: email transport is not configured."
            : locale === "sl"
              ? "Vabila ni bilo mogoče varno poslati."
              : "The invitation could not be sent securely.",
        );
        return;
      }
      setEmail("");
      setStatus(locale === "sl" ? "Vabilo je bilo poslano." : "The invitation was sent.");
    } catch {
      setStatus(locale === "sl" ? "E-poštna storitev ni dosegljiva." : "Email is unavailable.");
    } finally {
      setBusy("");
    }
  }

  async function deleteAccount() {
    setBusy("delete");
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        if (payload.error === "ownership_transfer_required") {
          setStatus(
            locale === "sl"
              ? "Pred izbrisom prenesite lastništvo vsakega delovnega prostora na drugega aktivnega lastnika."
              : "Transfer every workspace to another active owner before deleting the account.",
          );
          return;
        }
        throw new Error("deletion_failed");
      }
      setStatus(
        locale === "sl"
          ? "Clerk identiteta je izbrisana, račun pa anonimiziran. Seja se bo zaključila."
          : "Your Clerk identity was deleted and account data anonymized. This session will end.",
      );
    } catch {
      setStatus(
        locale === "sl"
          ? "Zahteve za izbris ni bilo mogoče zabeležiti."
          : "The deletion request could not be recorded.",
      );
    } finally {
      setBusy("");
    }
  }

  async function exportData() {
    setExportRequested(true);
    setStatus("");
    try {
      downloadJson(await convex.query(api.users.exportMyData, {}));
      setStatus(locale === "sl" ? "Izvoz je prenesen." : "Your export was downloaded.");
    } catch {
      setStatus(
        locale === "sl" ? "Izvoza ni bilo mogoče pripraviti." : "The export could not be prepared.",
      );
    } finally {
      setExportRequested(false);
    }
  }

  return (
    <main id="main-content" className="px-5 py-8 lg:px-10 lg:py-10">
      <p className="eyebrow">{locale === "sl" ? "Delovni prostor" : "Workspace"}</p>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0b1f33]">
        {locale === "sl" ? "Člani in nastavitve računa" : "Members and account settings"}
      </h1>
      {status ? (
        <p className="mt-6 rounded-lg bg-teal-50 p-4 font-semibold text-teal-900" role="status">
          {status}
        </p>
      ) : null}

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-2xl font-extrabold text-[#0b1f33]">
            <Users aria-hidden="true" size={22} />
            {locale === "sl" ? "Člani" : "Members"}
          </h2>
          <Link href="/app/billing" className="button button-secondary">
            <CreditCard aria-hidden="true" size={17} />
            {locale === "sl" ? "Naročnina" : "Billing"}
          </Link>
        </div>
        <div className="card mt-4 overflow-x-auto">
          <table className="results-table">
            <thead>
              <tr>
                <th>{locale === "sl" ? "Oseba" : "Person"}</th>
                <th>{locale === "sl" ? "Vloga" : "Role"}</th>
                <th>{locale === "sl" ? "Stanje" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {(members ?? []).map((member) => (
                <tr key={member.membershipId}>
                  <td>
                    <p className="font-bold text-[#0b1f33]">
                      {member.displayName ?? member.primaryEmail ?? member.userId}
                    </p>
                    {member.displayName && member.primaryEmail ? (
                      <p className="mt-1 text-xs text-slate-500">{member.primaryEmail}</p>
                    ) : null}
                  </td>
                  <td>
                    {canManage && (isOwner || !["owner", "admin"].includes(member.role)) ? (
                      <select
                        className="app-select min-h-10 w-auto"
                        value={member.role}
                        onChange={(event) =>
                          void updateMemberRole({
                            organizationId: workspace.id,
                            membershipId: member.membershipId,
                            role: event.target.value as Role,
                          }).catch(() =>
                            setStatus(
                              locale === "sl"
                                ? "Vloge ni bilo mogoče spremeniti. Preverite lastništvo."
                                : "The role could not be changed. Check ownership constraints.",
                            ),
                          )
                        }
                        aria-label={
                          locale === "sl"
                            ? `Vloga za ${member.displayName ?? member.primaryEmail ?? "člana"}`
                            : `Role for ${member.displayName ?? member.primaryEmail ?? "member"}`
                        }
                      >
                        {(isOwner
                          ? (["viewer", "researcher", "admin", "owner"] as const)
                          : (["viewer", "researcher"] as const)
                        ).map((candidate) => (
                          <option key={candidate} value={candidate}>
                            {candidate}
                          </option>
                        ))}
                      </select>
                    ) : (
                      member.role
                    )}
                  </td>
                  <td>{member.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {canManage ? (
        <section className="mt-10 grid gap-5 xl:grid-cols-2">
          <form className="card p-6" onSubmit={invite}>
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-[#0b1f33]">
              <MailPlus aria-hidden="true" size={21} />
              {locale === "sl" ? "Povabite člana" : "Invite a member"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {locale === "sl"
                ? "Vabilo se ustvari samo, če je Resend konfiguriran. Surovi žeton se nikoli ne vrne v aplikacijo."
                : "An invitation is created only when Resend is configured. The raw token is never returned to the app."}
            </p>
            <label className="mt-5 grid gap-2 font-semibold">
              {locale === "sl" ? "E-poštni naslov" : "Email address"}
              <input
                className="app-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={320}
                required
              />
            </label>
            <label className="mt-4 grid gap-2 font-semibold">
              {locale === "sl" ? "Vloga" : "Role"}
              <select
                className="app-select"
                value={role}
                onChange={(event) => setRole(event.target.value as Exclude<Role, "owner">)}
              >
                <option value="viewer">viewer</option>
                <option value="researcher">researcher</option>
                {isOwner ? <option value="admin">admin</option> : null}
              </select>
            </label>
            <button
              className="button button-primary mt-5"
              disabled={busy === "invite"}
              type="submit"
            >
              {busy === "invite"
                ? locale === "sl"
                  ? "Pošiljam …"
                  : "Sending …"
                : locale === "sl"
                  ? "Pošlji vabilo"
                  : "Send invitation"}
            </button>
          </form>

          <div className="card p-6">
            <h2 className="text-xl font-extrabold text-[#0b1f33]">
              {locale === "sl" ? "Odprta vabila" : "Pending invitations"}
            </h2>
            <div className="mt-5 grid gap-3">
              {(invitations ?? [])
                .filter(
                  (invitation) =>
                    invitation.acceptedAt === undefined &&
                    invitation.revokedAt === undefined &&
                    invitation.expiresAt > renderedAt,
                )
                .map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-4"
                  >
                    <div>
                      <p className="font-bold text-[#0b1f33]">{invitation.email}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {invitation.role} · {locale === "sl" ? "poteče" : "expires"}{" "}
                        {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                          invitation.expiresAt,
                        )}
                      </p>
                    </div>
                    <button
                      className="button button-secondary min-h-9 px-3 py-1 text-red-700"
                      onClick={() =>
                        void revokeInvitation({
                          organizationId: workspace.id,
                          invitationId: invitation.id,
                        })
                      }
                      type="button"
                    >
                      {locale === "sl" ? "Prekliči" : "Revoke"}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-10 border-t border-slate-200 pt-10">
        <h2 className="text-2xl font-extrabold text-[#0b1f33]">
          {locale === "sl" ? "Osebni podatki" : "Personal data"}
        </h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="card p-6">
            <h3 className="font-extrabold text-[#0b1f33]">
              {locale === "sl" ? "Izvoz podatkov" : "Data export"}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {locale === "sl"
                ? "Prenesite omejen JSON izvoz svojega računa, članstev, raziskav in shranjenih iskanj."
                : "Download a bounded JSON export of your account, memberships, research, and saved searches."}
            </p>
            <button
              className="button button-secondary mt-5"
              disabled={exportRequested}
              onClick={() => void exportData()}
              type="button"
            >
              <Download aria-hidden="true" size={17} />
              {exportRequested
                ? locale === "sl"
                  ? "Pripravljam …"
                  : "Preparing …"
                : locale === "sl"
                  ? "Prenesi izvoz"
                  : "Download export"}
            </button>
          </div>
          <div className="card border-red-200 p-6">
            <h3 className="font-extrabold text-red-800">
              {locale === "sl" ? "Izbris računa" : "Account deletion"}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {locale === "sl"
                ? "Zahteva račun takoj označi za nadzorovano obdelavo. Pred tem izvozite podatke in prenesite lastništvo delovnih prostorov."
                : "The request immediately marks the account for controlled processing. Export data and transfer workspace ownership first."}
            </p>
            <label className="mt-4 flex items-start gap-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={confirmDeletion}
                onChange={(event) => setConfirmDeletion(event.target.checked)}
              />
              {locale === "sl"
                ? "Razumem, da bo dostop onemogočen in da moram urediti lastništvo."
                : "I understand access will be disabled and ownership must be resolved."}
            </label>
            <button
              className="button button-secondary mt-5 text-red-700"
              disabled={!confirmDeletion || busy === "delete"}
              onClick={() => void deleteAccount()}
              type="button"
            >
              <Trash2 aria-hidden="true" size={17} />
              {locale === "sl" ? "Zahtevaj izbris" : "Request deletion"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
