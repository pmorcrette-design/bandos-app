"use client";

import { useState } from "react";
import { RefreshCw, Shield, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { t, type Locale } from "@/lib/i18n";

type AdminWorkspaceSummary = {
  workspace: {
    id: string;
    name: string;
    genre: string;
    country: string;
    logoUrl: string;
    currency: string;
    locale: string;
    onboarded: boolean;
    subscriptionPlan: "starter" | "touring" | "label";
    trialEndsAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  owner: {
    id: string;
    name: string;
    email: string;
    role: "owner" | "admin" | "member" | "viewer";
    title: string;
    imageUrl: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  userCount: number;
  isProtected: boolean;
  trialDaysLeft: number;
};

type PlatformAdminUser = {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  isBandosAdmin?: boolean;
  title: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export function BandosAdminView({
  initialWorkspaces,
  initialAdminUsers,
  locale
}: {
  initialWorkspaces: AdminWorkspaceSummary[];
  initialAdminUsers: PlatformAdminUser[];
  locale: Locale;
}) {
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [adminUsers, setAdminUsers] = useState(initialAdminUsers);
  const [savingWorkspaceId, setSavingWorkspaceId] = useState<string | null>(null);
  const [deletingWorkspaceId, setDeletingWorkspaceId] = useState<string | null>(null);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    title: "BandOS platform admin"
  });
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function refreshAll() {
    setFeedback("");
    setError("");

    const [workspacesResponse, adminsResponse] = await Promise.all([
      fetch("/api/bandos-admin/workspaces", {
        method: "GET",
        cache: "no-store"
      }),
      fetch("/api/bandos-admin/admin-users", {
        method: "GET",
        cache: "no-store"
      })
    ]);
    const workspacesPayload = (await workspacesResponse.json().catch(() => null)) as
      | { workspaces?: AdminWorkspaceSummary[]; error?: string }
      | null;
    const adminsPayload = (await adminsResponse.json().catch(() => null)) as
      | { users?: PlatformAdminUser[]; error?: string }
      | null;

    if (
      !workspacesResponse.ok ||
      !adminsResponse.ok ||
      !workspacesPayload?.workspaces ||
      !adminsPayload?.users
    ) {
      setError(
        workspacesPayload?.error ||
          adminsPayload?.error ||
          t(locale, "Impossible de rafraîchir la liste.", "Unable to refresh the list.")
      );
      return;
    }

    setWorkspaces(workspacesPayload.workspaces);
    setAdminUsers(adminsPayload.users);
  }

  async function saveWorkspace(
    workspaceId: string,
    subscriptionPlan: AdminWorkspaceSummary["workspace"]["subscriptionPlan"],
    trialDays: number
  ) {
    setSavingWorkspaceId(workspaceId);
    setFeedback("");
    setError("");

    const response = await fetch(`/api/bandos-admin/workspaces/${workspaceId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        subscriptionPlan,
        trialDays
      })
    });
    const payload = (await response.json().catch(() => null)) as
      | { workspace?: AdminWorkspaceSummary["workspace"]; error?: string }
      | null;

    if (!response.ok || !payload?.workspace) {
      setError(
        payload?.error ||
          t(locale, "Impossible d'enregistrer ce client.", "Unable to save this client.")
      );
      setSavingWorkspaceId(null);
      return;
    }

    setWorkspaces((current) =>
      current.map((entry) =>
        entry.workspace.id === workspaceId
          ? {
              ...entry,
              workspace: payload.workspace!,
              trialDaysLeft:
                payload.workspace!.trialEndsAt
                  ? Math.max(
                      0,
                      Math.ceil(
                        (new Date(payload.workspace!.trialEndsAt).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24)
                      )
                    )
                  : 0
            }
          : entry
      )
    );
    setFeedback(
      t(locale, "Paramètres client mis à jour.", "Client settings updated.")
    );
    setSavingWorkspaceId(null);
  }

  async function deleteWorkspace(workspaceId: string) {
    setDeletingWorkspaceId(workspaceId);
    setFeedback("");
    setError("");

    const response = await fetch(`/api/bandos-admin/workspaces/${workspaceId}`, {
      method: "DELETE"
    });
    const payload = (await response.json().catch(() => null)) as
      | { success?: boolean; error?: string }
      | null;

    if (!response.ok || !payload?.success) {
      setError(
        payload?.error ||
          t(locale, "Impossible de supprimer ce client.", "Unable to delete this client.")
      );
      setDeletingWorkspaceId(null);
      return;
    }

    setWorkspaces((current) =>
      current.filter((entry) => entry.workspace.id !== workspaceId)
    );
    setFeedback(
      t(locale, "Compte client supprimé.", "Client account deleted.")
    );
    setDeletingWorkspaceId(null);
  }

  async function createAdminAccount() {
    setCreatingAdmin(true);
    setFeedback("");
    setError("");

    const response = await fetch("/api/bandos-admin/admin-users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(adminForm)
    });
    const payload = (await response.json().catch(() => null)) as
      | { user?: PlatformAdminUser; error?: string; emailSent?: boolean }
      | null;

    if (!response.ok || !payload?.user) {
      setError(
        payload?.error ||
          t(locale, "Impossible de créer ce compte admin.", "Unable to create this admin account.")
      );
      setCreatingAdmin(false);
      return;
    }

    setAdminUsers((current) => [...current, payload.user!].sort((left, right) => left.name.localeCompare(right.name)));
    setAdminForm({
      name: "",
      email: "",
      password: "",
      title: "BandOS platform admin"
    });
    setFeedback(
      payload.emailSent
        ? t(
            locale,
            "Compte admin créé et email envoyé.",
            "Admin account created and email sent."
          )
        : t(
            locale,
            "Compte admin créé. Email non envoyé pour l'instant.",
            "Admin account created. Email not sent yet."
          )
    );
    setCreatingAdmin(false);
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-lg font-medium text-mist-50">BandOS Admin</p>
          <p className="mt-2 text-sm text-mist-300">
            {t(
              locale,
              "Gère les comptes clients, le niveau d'abonnement et la durée d'essai sans toucher au contenu de leurs workspaces.",
              "Manage client accounts, subscription level, and trial duration without touching the content inside their workspaces."
            )}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4" />
          {t(locale, "Rafraîchir", "Refresh")}
        </Button>
      </Card>

      {feedback ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-5">
          <div>
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Admins BandOS", "BandOS admins")}
            </p>
            <p className="mt-2 text-sm text-mist-300">
              {t(
                locale,
                "Comptes internes uniquement. Ils n'apparaissent pas dans les workspaces clients.",
                "Internal-only accounts. They do not appear inside client workspaces."
              )}
            </p>
          </div>
          <div className="space-y-3">
            {adminUsers.map((user) => (
              <div
                key={user.id}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-mist-50">{user.name}</p>
                    <p className="mt-1 text-sm text-mist-300">{user.email}</p>
                  </div>
                  <Badge tone="warning">{user.title}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Créer un admin BandOS", "Create a BandOS admin")}
            </p>
            <p className="mt-2 text-sm text-mist-300">
              {t(
                locale,
                "Crée un accès interne séparé du produit client, pour gérer la plateforme depuis le control center.",
                "Create an internal access separate from the client product to manage the platform from the control center."
              )}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-mist-200">{t(locale, "Nom", "Name")}</span>
              <Input
                value={adminForm.name}
                onChange={(event) =>
                  setAdminForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">{t(locale, "Email", "Email")}</span>
              <Input
                value={adminForm.email}
                onChange={(event) =>
                  setAdminForm((current) => ({ ...current, email: event.target.value }))
                }
                type="email"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">{t(locale, "Mot de passe", "Password")}</span>
              <Input
                value={adminForm.password}
                onChange={(event) =>
                  setAdminForm((current) => ({ ...current, password: event.target.value }))
                }
                type="password"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">{t(locale, "Titre", "Title")}</span>
              <Input
                value={adminForm.title}
                onChange={(event) =>
                  setAdminForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={createAdminAccount}
              disabled={creatingAdmin}
            >
              {creatingAdmin
                ? t(locale, "Création…", "Creating…")
                : t(locale, "Créer l'admin", "Create admin")}
            </Button>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {workspaces.map((entry) => (
          <WorkspaceAdminRow
            key={entry.workspace.id}
            entry={entry}
            locale={locale}
            isSaving={savingWorkspaceId === entry.workspace.id}
            isDeleting={deletingWorkspaceId === entry.workspace.id}
            onSave={saveWorkspace}
            onDelete={deleteWorkspace}
          />
        ))}
      </div>
    </div>
  );
}

function WorkspaceAdminRow({
  entry,
  locale,
  isSaving,
  isDeleting,
  onSave,
  onDelete
}: {
  entry: AdminWorkspaceSummary;
  locale: Locale;
  isSaving: boolean;
  isDeleting: boolean;
  onSave: (
    workspaceId: string,
    subscriptionPlan: AdminWorkspaceSummary["workspace"]["subscriptionPlan"],
    trialDays: number
  ) => Promise<void>;
  onDelete: (workspaceId: string) => Promise<void>;
}) {
  const [subscriptionPlan, setSubscriptionPlan] = useState(entry.workspace.subscriptionPlan);
  const [trialDays, setTrialDays] = useState(String(entry.trialDaysLeft));

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xl font-semibold text-mist-50">{entry.workspace.name}</p>
            <Badge tone={entry.workspace.onboarded ? "success" : "accent"}>
              {entry.workspace.onboarded
                ? t(locale, "Onboardé", "Onboarded")
                : t(locale, "En setup", "Setup")}
            </Badge>
            {entry.isProtected ? (
              <Badge tone="warning">
                <Shield className="mr-1 h-3 w-3" />
                {t(locale, "Protégé", "Protected")}
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-mist-300">
            {entry.owner?.email ?? t(locale, "Aucun owner", "No owner")} •{" "}
            {entry.userCount} {t(locale, "utilisateur(s)", "user(s)")}
          </p>
          <p className="mt-1 text-sm text-mist-400">
            {entry.workspace.genre} • {entry.workspace.country} • {entry.workspace.currency}
          </p>
        </div>
        <div className="text-sm text-mist-300">
          <p>
            {t(locale, "Créé le", "Created")}{" "}
            {new Date(entry.workspace.createdAt).toLocaleDateString(
              locale === "fr" ? "fr-FR" : "en-GB"
            )}
          </p>
          <p className="mt-1">
            {t(locale, "Mis à jour", "Updated")}{" "}
            {new Date(entry.workspace.updatedAt).toLocaleDateString(
              locale === "fr" ? "fr-FR" : "en-GB"
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_auto]">
        <label className="space-y-2">
          <span className="text-sm text-mist-200">
            {t(locale, "Abonnement", "Subscription")}
          </span>
          <select
            value={subscriptionPlan}
            onChange={(event) =>
              setSubscriptionPlan(
                event.target.value as AdminWorkspaceSummary["workspace"]["subscriptionPlan"]
              )
            }
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
          >
            <option value="starter" className="bg-graphite-900">Starter</option>
            <option value="touring" className="bg-graphite-900">Touring</option>
            <option value="label" className="bg-graphite-900">Label</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-mist-200">
            {t(locale, "Jours d'essai", "Trial days")}
          </span>
          <Input
            value={trialDays}
            onChange={(event) => setTrialDays(event.target.value)}
            inputMode="numeric"
          />
        </label>

        <div className="space-y-2">
          <span className="text-sm text-mist-200">
            {t(locale, "État essai", "Trial status")}
          </span>
          <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-50">
            {entry.trialDaysLeft > 0
              ? t(locale, `${entry.trialDaysLeft} jour(s) restants`, `${entry.trialDaysLeft} day(s) left`)
              : t(locale, "Aucun essai actif", "No active trial")}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              onSave(
                entry.workspace.id,
                subscriptionPlan,
                Math.max(0, Math.floor(Number(trialDays) || 0))
              )
            }
            disabled={isSaving}
          >
            {isSaving
              ? t(locale, "Enregistrement…", "Saving…")
              : t(locale, "Enregistrer", "Save")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={entry.isProtected || isDeleting}
            onClick={() => onDelete(entry.workspace.id)}
            className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting
              ? t(locale, "Suppression…", "Deleting…")
              : t(locale, "Supprimer", "Delete")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
