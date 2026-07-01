"use client";

import { useMemo, useState, useTransition } from "react";
import { KeyRound, Mail, Plus, Shield, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { t, type Locale } from "@/lib/i18n";

type WorkspaceAccessUser = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  title: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

const emptyDraft = {
  name: "",
  email: "",
  role: "member" as WorkspaceAccessUser["role"],
  title: "",
  password: "touring-demo"
};

function translateAccessRole(locale: Locale, role: WorkspaceAccessUser["role"]) {
  switch (role) {
    case "owner":
      return t(locale, "Owner", "Owner");
    case "admin":
      return t(locale, "Admin", "Admin");
    case "member":
      return t(locale, "Membre", "Member");
    default:
      return t(locale, "Viewer", "Viewer");
  }
}

export function TeamAccessManager({
  locale,
  initialUsers,
  currentUserId
}: {
  locale: Locale;
  initialUsers: WorkspaceAccessUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState(emptyDraft.name);
  const [email, setEmail] = useState(emptyDraft.email);
  const [role, setRole] = useState(emptyDraft.role);
  const [title, setTitle] = useState(emptyDraft.title);
  const [password, setPassword] = useState(emptyDraft.password);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedUser =
    users.find((entry) => entry.id === selectedUserId) ?? null;
  const modalOpen = isCreating || Boolean(selectedUser);
  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((entry) => entry.role === "owner" || entry.role === "admin")
        .length
    }),
    [users]
  );

  function closeModal() {
    setSelectedUserId(null);
    setIsCreating(false);
    setName(emptyDraft.name);
    setEmail(emptyDraft.email);
    setRole(emptyDraft.role);
    setTitle(emptyDraft.title);
    setPassword(emptyDraft.password);
    setFeedback("");
    setError("");
  }

  function openCreateModal() {
    closeModal();
    setIsCreating(true);
  }

  function openEditModal(user: WorkspaceAccessUser) {
    setSelectedUserId(user.id);
    setIsCreating(false);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setTitle(user.title);
    setPassword("");
    setFeedback("");
    setError("");
  }

  async function saveUser() {
    setFeedback("");
    setError("");

    if (!name.trim() || !email.trim()) {
      setError(t(locale, "Nom et email sont requis.", "Name and email are required."));
      return;
    }

    if (isCreating && password.trim().length < 8) {
      setError(
        t(
          locale,
          "Le mot de passe temporaire doit faire au moins 8 caractères.",
          "Temporary password must be at least 8 characters."
        )
      );
      return;
    }

    startTransition(async () => {
      const response = await fetch(
        isCreating ? "/api/team-access" : `/api/team-access/${selectedUser?.id}`,
        {
          method: isCreating ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name,
            email,
            role,
            title,
            password: password.trim()
          })
        }
      );

      const payload = (await response.json().catch(() => null)) as
        | { user?: WorkspaceAccessUser; error?: string; emailSent?: boolean }
        | null;

      if (!response.ok || !payload?.user) {
        setError(
          payload?.error ||
            t(locale, "Impossible d'enregistrer l'accès.", "Unable to save access.")
        );
        return;
      }

      setUsers((currentUsers) => {
        if (isCreating) {
          return [payload.user!, ...currentUsers].sort((left, right) =>
            left.name.localeCompare(right.name)
          );
        }

        return currentUsers
          .map((entry) => (entry.id === payload.user!.id ? payload.user! : entry))
          .sort((left, right) => left.name.localeCompare(right.name));
      });

      if (isCreating) {
        const successMessage = payload.emailSent
          ? t(
              locale,
              "Accès créé et email envoyé.",
              "Access created and email sent."
            )
          : t(
              locale,
              "Accès créé. Email non envoyé pour l'instant.",
              "Access created. Email not sent yet."
            );
        closeModal();
        setFeedback(successMessage);
      } else {
        openEditModal(payload.user);
        setFeedback(
          payload.emailSent
            ? t(
                locale,
                "Accès équipe mis à jour. Email de rappel envoyé.",
                "Team access updated. Reminder email sent."
              )
            : t(
                locale,
                "Accès équipe mis à jour.",
                "Team access updated."
              )
        );
      }
    });
  }

  async function removeSelectedUser() {
    if (!selectedUser) {
      return;
    }

    setFeedback("");
    setError("");

    startTransition(async () => {
      const response = await fetch(`/api/team-access/${selectedUser.id}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.success) {
        setError(
          payload?.error ||
            t(locale, "Impossible de supprimer cet accès.", "Unable to delete this access.")
        );
        return;
      }

      setUsers((currentUsers) =>
        currentUsers.filter((entry) => entry.id !== selectedUser.id)
      );
      closeModal();
    });
  }

  return (
    <>
      <div className="space-y-6">
        <Card className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Accès équipe", "Team access")}
            </p>
            <p className="mt-2 text-sm text-mist-300">
              {t(
                locale,
                "Crée les connexions email / mot de passe pour le groupe, le manager, le merch ou le driver sans passer par des comptes partagés.",
                "Create email / password access for the band, manager, merch, or driver without shared accounts."
              )}
            </p>
          </div>
          <Button type="button" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            {t(locale, "Créer un accès", "Create access")}
          </Button>
        </Card>

        <Card className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Connexions actives", "Active logins")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-mist-50">{stats.total}</p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Admins / owners", "Admins / owners")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-mist-50">{stats.admins}</p>
          </div>
        </Card>

        {!users.length ? (
          <EmptyState
            title={t(locale, "Aucun accès équipe", "No team access yet")}
            body={t(
              locale,
              "Crée un premier login pour laisser le groupe, le manager ou le merch entrer dans BandOS avec leur propre email.",
              "Create a first login so your band, manager, or merch seller can enter BandOS with their own email."
            )}
          />
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-white/8 bg-gradient-to-b from-white/[0.04] to-white/[0.02]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/8 bg-white/[0.03] text-mist-300">
                  <tr>
                    <th className="px-5 py-4 font-medium">
                      {t(locale, "Nom", "Name")}
                    </th>
                    <th className="px-5 py-4 font-medium">
                      {t(locale, "Email", "Email")}
                    </th>
                    <th className="px-5 py-4 font-medium">
                      {t(locale, "Rôle", "Role")}
                    </th>
                    <th className="px-5 py-4 font-medium">
                      {t(locale, "Titre", "Title")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="cursor-pointer border-b border-white/8 transition hover:bg-white/[0.03]"
                      onClick={() => openEditModal(user)}
                    >
                      <td className="px-5 py-4 text-mist-50">
                        <div className="flex items-center gap-3">
                          <span>{user.name}</span>
                          {user.id === currentUserId ? (
                            <Badge tone="accent">{t(locale, "Toi", "You")}</Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-mist-200">{user.email}</td>
                      <td className="px-5 py-4">
                        <Badge>{translateAccessRole(locale, user.role)}</Badge>
                      </td>
                      <td className="px-5 py-4 text-mist-200">{user.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={
          isCreating
            ? t(locale, "Nouvel accès équipe", "New team access")
            : selectedUser?.name ?? ""
        }
        description={
          isCreating
            ? t(
                locale,
                "Crée un login pour un membre du groupe ou du crew avec mot de passe temporaire.",
                "Create a login for a band or crew member with a temporary password."
              )
            : selectedUser?.email
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Nom", "Name")}
              </span>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Email", "Email")}
              </span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-mist-300" />
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-10"
                />
              </div>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Rôle d'accès", "Access role")}
              </span>
              <select
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as WorkspaceAccessUser["role"])
                }
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
              >
                {(["owner", "admin", "member", "viewer"] as const).map((roleOption) => (
                  <option key={roleOption} value={roleOption} className="bg-graphite-900">
                    {translateAccessRole(locale, roleOption)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Titre / usage", "Title / use")}
              </span>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t(locale, "Tour manager", "Tour manager")}
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm text-mist-200">
              {isCreating
                ? t(locale, "Mot de passe temporaire", "Temporary password")
                : t(locale, "Nouveau mot de passe", "New password")}
            </span>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-mist-300" />
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                className="pl-10"
                placeholder={
                  isCreating
                    ? "touring-demo"
                    : t(locale, "Laisse vide pour garder l'actuel", "Leave blank to keep current")
                }
              />
            </div>
          </label>

          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-mist-50">
              <Shield className="h-4 w-4 text-coral-300" />
              <p className="text-sm font-medium">
                {t(locale, "Connexion équipe active", "Team login enabled")}
              </p>
            </div>
            <p className="mt-2 text-sm leading-7 text-mist-300">
              {t(
                locale,
                "Chaque accès créé ici peut se connecter depuis l'écran de login BandOS avec son propre email et mot de passe.",
                "Every access created here can sign in from the BandOS login screen with its own email and password."
              )}
            </p>
          </div>

          {error ? (
            <p className="text-sm text-red-200">{error}</p>
          ) : feedback ? (
            <p className="text-sm text-emerald-300">{feedback}</p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!isCreating && selectedUser && selectedUser.id !== currentUserId ? (
              <Button
                type="button"
                variant="secondary"
                onClick={removeSelectedUser}
                disabled={isPending}
                className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" />
                {t(locale, "Supprimer l'accès", "Delete access")}
              </Button>
            ) : (
              <div />
            )}
            <Button type="button" onClick={saveUser} disabled={isPending}>
              {isCreating
                ? t(locale, "Créer l'accès", "Create access")
                : t(locale, "Enregistrer", "Save")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
