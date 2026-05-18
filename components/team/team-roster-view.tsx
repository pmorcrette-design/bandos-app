"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Users, Volume2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  t,
  translateWorkspaceRole,
  type Locale
} from "@/lib/i18n";
import {
  useBandosUIStore,
  type EditableTeamMember
} from "@/store/ui-store";

const rolePresets = [
  "Vocalist",
  "Guitarist",
  "Drummer",
  "Bassist",
  "Manager",
  "Tour Manager",
  "Merch Seller",
  "Driver",
  "Sound Engineer",
  "FOH",
  "Crew"
] as const;

function isSoundEngineerRole(role: string) {
  const normalizedRole = role.trim().toLowerCase();

  return (
    normalizedRole.includes("sound engineer") ||
    normalizedRole.includes("ingé son") ||
    normalizedRole.includes("inge son") ||
    normalizedRole.includes("foh")
  );
}

const emptyDraft = {
  name: "",
  role: "Sound Engineer",
  workspaceRole: "member" as EditableTeamMember["workspaceRole"],
  location: "",
  focus: ""
};

export function TeamRosterView({ locale }: { locale: Locale }) {
  const teamRoster = useBandosUIStore((state) => state.teamRoster);
  const loadDemoTeamRoster = useBandosUIStore((state) => state.loadDemoTeamRoster);
  const addTeamMember = useBandosUIStore((state) => state.addTeamMember);
  const updateTeamMember = useBandosUIStore((state) => state.updateTeamMember);
  const deleteTeamMember = useBandosUIStore((state) => state.deleteTeamMember);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState(emptyDraft.name);
  const [role, setRole] = useState(emptyDraft.role);
  const [workspaceRole, setWorkspaceRole] = useState(emptyDraft.workspaceRole);
  const [location, setLocation] = useState(emptyDraft.location);
  const [focus, setFocus] = useState(emptyDraft.focus);
  const [saveMessage, setSaveMessage] = useState("");

  const selectedMember =
    teamRoster.find((member) => member.id === selectedMemberId) ?? null;
  const modalOpen = isCreating || Boolean(selectedMember);
  const soundEngineers = useMemo(
    () => teamRoster.filter((member) => isSoundEngineerRole(member.role)),
    [teamRoster]
  );

  useEffect(() => {
    if (isCreating) {
      setName(emptyDraft.name);
      setRole(emptyDraft.role);
      setWorkspaceRole(emptyDraft.workspaceRole);
      setLocation(emptyDraft.location);
      setFocus(emptyDraft.focus);
      setSaveMessage("");
      return;
    }

    if (!selectedMember) {
      setSaveMessage("");
      return;
    }

    setName(selectedMember.name);
    setRole(selectedMember.role);
    setWorkspaceRole(selectedMember.workspaceRole);
    setLocation(selectedMember.location);
    setFocus(selectedMember.focus);
    setSaveMessage("");
  }, [isCreating, selectedMember]);

  function closeModal() {
    setIsCreating(false);
    setSelectedMemberId(null);
    setSaveMessage("");
  }

  function openCreateModal() {
    setSelectedMemberId(null);
    setIsCreating(true);
  }

  function saveMember() {
    const payload = {
      name: name.trim() || t(locale, "Nouveau membre", "New member"),
      role: role.trim() || "Crew",
      workspaceRole,
      location: location.trim(),
      focus: focus.trim()
    };

    if (isCreating) {
      addTeamMember(payload);
      setSaveMessage(t(locale, "Membre créé.", "Member created."));
      setIsCreating(false);
      return;
    }

    if (!selectedMember) {
      return;
    }

    updateTeamMember(selectedMember.id, payload);
    setSaveMessage(t(locale, "Membre mis à jour.", "Member updated."));
  }

  function removeSelectedMember() {
    if (!selectedMember) {
      return;
    }

    deleteTeamMember(selectedMember.id);
    closeModal();
  }

  return (
    <>
      <div className="space-y-6">
        <Card className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Roster du workspace", "Workspace roster")}
            </p>
            <p className="mt-2 text-sm text-mist-300">
              {t(
                locale,
                "Ajoute l'équipe de tournée puis assigne l'ingé son directement sur chaque date.",
                "Add the touring team, then assign the sound engineer directly on each show."
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={loadDemoTeamRoster}>
              <Users className="h-4 w-4" />
              {t(locale, "Charger l'équipe WIDESPREAD DISEASE", "Load WIDESPREAD DISEASE team")}
            </Button>
            <Button type="button" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              {t(locale, "Ajouter un membre", "Add member")}
            </Button>
          </div>
        </Card>

        <Card className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Membres", "Members")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-mist-50">
              {teamRoster.length}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Ingés son", "Sound engineers")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-mist-50">
              {soundEngineers.length}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Prêt à assigner", "Ready to assign")}
            </p>
            <p className="mt-2 text-sm text-mist-200">
              {soundEngineers.length
                ? t(
                    locale,
                    "Tes dates peuvent maintenant recevoir un ingé son.",
                    "Your shows can now receive a sound engineer."
                  )
                : t(
                    locale,
                    "Ajoute au moins un Sound Engineer pour l'assignation par date.",
                    "Add at least one Sound Engineer for per-show assignment."
                  )}
            </p>
          </div>
        </Card>

        {!teamRoster.length ? (
          <EmptyState
            title={t(locale, "Aucun membre dans l'équipe", "No team member yet")}
            body={t(
              locale,
              "Charge l'équipe de démo ou ajoute manuellement tes membres et crew.",
              "Load the demo crew or add your members and crew manually."
            )}
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {teamRoster.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setSelectedMemberId(member.id);
                }}
                className="w-full text-left"
              >
                <Card className="transition hover:border-coral-500/20 hover:bg-coral-500/[0.04]">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-white/5 text-lg font-semibold text-mist-50">
                      {member.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xl font-semibold text-mist-50">{member.name}</p>
                        {isSoundEngineerRole(member.role) ? (
                          <Badge tone="success">
                            <Volume2 className="mr-1 h-3.5 w-3.5" />
                            {t(locale, "Ingé son", "Sound engineer")}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-mist-300">{member.role}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone="accent">
                          {translateWorkspaceRole(locale, member.workspaceRole)}
                        </Badge>
                        {member.location ? <Badge>{member.location}</Badge> : null}
                      </div>
                      <p className="mt-4 text-sm leading-7 text-mist-200">
                        {member.focus || t(locale, "Aucun focus renseigné.", "No focus set.")}
                      </p>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={
          isCreating
            ? t(locale, "Nouveau membre", "New member")
            : selectedMember?.name ?? ""
        }
        description={
          isCreating
            ? t(
                locale,
                "Ajoute un membre, un crew ou un ingé son assignable ensuite sur les dates.",
                "Add a member, crew contact, or sound engineer that can later be assigned to shows."
              )
            : selectedMember
              ? `${selectedMember.role} • ${selectedMember.location || "—"}`
              : undefined
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
                {t(locale, "Rôle workspace", "Workspace role")}
              </span>
              <select
                value={workspaceRole}
                onChange={(event) =>
                  setWorkspaceRole(event.target.value as EditableTeamMember["workspaceRole"])
                }
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
              >
                <option value="owner" className="bg-graphite-900">
                  {translateWorkspaceRole(locale, "owner")}
                </option>
                <option value="admin" className="bg-graphite-900">
                  {translateWorkspaceRole(locale, "admin")}
                </option>
                <option value="member" className="bg-graphite-900">
                  {translateWorkspaceRole(locale, "member")}
                </option>
                <option value="viewer" className="bg-graphite-900">
                  {translateWorkspaceRole(locale, "viewer")}
                </option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Rôle tournée", "Tour role")}
              </span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
              >
                {rolePresets.map((preset) => (
                  <option key={preset} value={preset} className="bg-graphite-900">
                    {preset}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Base / ville", "Base / city")}
              </span>
              <Input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder={t(locale, "Paris", "Paris")}
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm text-mist-200">
              {t(locale, "Focus / notes", "Focus / notes")}
            </span>
            <textarea
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-50 outline-none transition placeholder:text-mist-300/70 focus:border-coral-500/50 focus:bg-white/[0.07]"
              placeholder={t(
                locale,
                "FOH, patch, line check, advances, merch…",
                "FOH, patch, line check, advances, merch..."
              )}
            />
          </label>

          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Aperçu", "Preview")}
            </p>
            <p className="mt-2 text-sm text-mist-50">
              {role} • {location || "—"}
            </p>
            <p className="mt-1 text-sm text-mist-300">
              {isSoundEngineerRole(role)
                ? t(
                    locale,
                    "Ce membre sera assignable comme ingé son sur les dates.",
                    "This member will be assignable as sound engineer on shows."
                  )
                : t(
                    locale,
                    "Les rôles Sound Engineer ou FOH apparaissent dans l'assignation des dates.",
                    "Sound Engineer or FOH roles appear in show assignments."
                  )}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!isCreating ? (
              <Button
                type="button"
                variant="secondary"
                onClick={removeSelectedMember}
                className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" />
                {t(locale, "Supprimer ce membre", "Delete member")}
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-4">
              <p className="text-sm text-emerald-300">{saveMessage}</p>
              <Button type="button" onClick={saveMember}>
                {isCreating
                  ? t(locale, "Créer le membre", "Create member")
                  : t(locale, "Enregistrer", "Save")}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
