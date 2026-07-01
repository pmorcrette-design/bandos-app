import type {
  WorkspaceAccessUserRecord,
  WorkspaceRecord
} from "@/lib/server/workspace-store";

const shouldUseSecureCookies =
  process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

export const cookieConfig = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: shouldUseSecureCookies
};

type WritableCookieStore = {
  delete: (name: string) => unknown;
  set: (
    name: string,
    value: string,
    options: typeof cookieConfig
  ) => unknown;
};

export function clearBaseSessionCookies(store: WritableCookieStore) {
  [
    "bandos_session",
    "bandos_user_id",
    "bandos_name",
    "bandos_email",
    "bandos_role",
    "bandos_workspace_id",
    "bandos_workspace",
    "bandos_logo",
    "bandos_currency",
    "bandos_locale",
    "bandos_onboarded",
    "bandos_genre",
    "bandos_country",
    "bandos_first_tour"
  ].forEach((key) => store.delete(key));
}

export function setBaseSessionCookies(
  store: WritableCookieStore,
  {
    user,
    workspace
  }: {
    user: Pick<WorkspaceAccessUserRecord, "id" | "name" | "email" | "role">;
    workspace: Pick<
      WorkspaceRecord,
      "id" | "name" | "logoUrl" | "currency" | "locale" | "onboarded" | "genre" | "country"
    >;
  }
) {
  store.set("bandos_session", "1", cookieConfig);
  store.set("bandos_user_id", user.id, cookieConfig);
  store.set("bandos_name", user.name, cookieConfig);
  store.set("bandos_email", user.email, cookieConfig);
  store.set("bandos_role", user.role, cookieConfig);
  store.set("bandos_workspace_id", workspace.id, cookieConfig);
  store.set("bandos_workspace", workspace.name, cookieConfig);
  store.set("bandos_logo", workspace.logoUrl, cookieConfig);
  store.set("bandos_currency", workspace.currency, cookieConfig);
  store.set("bandos_locale", workspace.locale, cookieConfig);
  store.set("bandos_genre", workspace.genre, cookieConfig);
  store.set("bandos_country", workspace.country, cookieConfig);

  if (workspace.onboarded) {
    store.set("bandos_onboarded", "1", cookieConfig);
  } else {
    store.delete("bandos_onboarded");
  }
}
