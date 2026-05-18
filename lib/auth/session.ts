import { cookies } from "next/headers";

import { normalizeCurrency, type SupportedCurrency } from "@/lib/utils";
import {
  getWorkspaceById,
  getWorkspaceUserById
} from "@/lib/server/workspace-store";

export type SessionUser = {
  userId: string;
  workspaceId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  workspace: string;
  logo: string;
  currency: SupportedCurrency;
  onboarded: boolean;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("bandos_session")?.value;

  if (!session) {
    return null;
  }

  const workspaceId = cookieStore.get("bandos_workspace_id")?.value;
  const userId = cookieStore.get("bandos_user_id")?.value;

  if (workspaceId && userId) {
    try {
      const [workspace, user] = await Promise.all([
        getWorkspaceById(workspaceId),
        getWorkspaceUserById(workspaceId, userId)
      ]);

      if (workspace && user) {
        return {
          userId: user.id,
          workspaceId: workspace.id,
          name: user.name,
          email: user.email,
          role: user.role,
          workspace: workspace.name,
          logo: workspace.logoUrl,
          currency: workspace.currency,
          onboarded: workspace.onboarded
        };
      }
    } catch {
      // Fall back to cookies for legacy or unavailable local storage state.
    }
  }

  const rawName = cookieStore.get("bandos_name")?.value;
  const rawEmail = cookieStore.get("bandos_email")?.value;
  const rawWorkspace = cookieStore.get("bandos_workspace")?.value;
  const isLegacyWorkspace =
    rawWorkspace === "Bloodsun" || rawEmail?.includes("bloodsun") === true;

  return {
    userId: userId ?? "legacy-user",
    workspaceId: workspaceId ?? "legacy-workspace",
    name: isLegacyWorkspace
      ? "WIDESPREAD DISEASE"
      : rawName ?? "WIDESPREAD DISEASE",
    email: isLegacyWorkspace
      ? "ops@widespreaddisease.com"
      : rawEmail ?? "ops@widespreaddisease.com",
    role:
      (cookieStore.get("bandos_role")?.value as SessionUser["role"] | undefined) ??
      "owner",
    workspace: isLegacyWorkspace
      ? "WIDESPREAD DISEASE"
      : rawWorkspace ?? "WIDESPREAD DISEASE",
    logo:
      cookieStore.get("bandos_logo")?.value ??
      "/widespread-disease-logo.jpg",
    currency: normalizeCurrency(cookieStore.get("bandos_currency")?.value),
    onboarded: cookieStore.get("bandos_onboarded")?.value === "1"
  };
}
