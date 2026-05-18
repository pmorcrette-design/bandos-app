"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { normalizeLocale } from "@/lib/i18n";
import { normalizeCurrency } from "@/lib/utils";
import {
  authenticateWorkspaceUser,
  createWorkspaceOwnerAccount,
  getDemoOwnerAccount,
  getDemoWorkspace,
  type WorkspaceAccessUserRecord,
  type WorkspaceRecord,
  updateWorkspaceProfile
} from "@/lib/server/workspace-store";

const cookieConfig = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: false
};

function clearBaseSessionCookies(store: Awaited<ReturnType<typeof cookies>>) {
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

function setBaseSessionCookies(
  store: Awaited<ReturnType<typeof cookies>>,
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

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const cookieStore = await cookies();
  const authenticatedSession = await authenticateWorkspaceUser(email, password);

  if (!authenticatedSession) {
    clearBaseSessionCookies(cookieStore);
    redirect("/auth/sign-in?error=invalid_credentials");
  }

  setBaseSessionCookies(cookieStore, authenticatedSession);

  redirect("/app");
}

export async function signUpAction(formData: FormData) {
  const name = String(formData.get("name") ?? "WIDESPREAD DISEASE");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const workspaceName = String(
    formData.get("workspace") ?? "WIDESPREAD DISEASE"
  );
  const password = String(formData.get("password") ?? "");
  const cookieStore = await cookies();

  if (!password.trim() || password.trim().length < 8) {
    clearBaseSessionCookies(cookieStore);
    redirect("/auth/sign-up?error=weak_password");
  }

  try {
    const createdSession = await createWorkspaceOwnerAccount({
      name,
      email,
      password,
      workspaceName
    });

    setBaseSessionCookies(cookieStore, createdSession);
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_IN_USE") {
      clearBaseSessionCookies(cookieStore);
      redirect("/auth/sign-up?error=email_exists");
    }

    throw error;
  }

  redirect("/onboarding");
}

export async function signInWithGoogleAction() {
  const cookieStore = await cookies();
  const [demoUser, demoWorkspace] = await Promise.all([
    getDemoOwnerAccount(),
    getDemoWorkspace()
  ]);

  if (!demoUser || !demoWorkspace) {
    clearBaseSessionCookies(cookieStore);
    redirect("/auth/sign-in?error=demo_unavailable");
  }

  setBaseSessionCookies(cookieStore, {
    user: demoUser,
    workspace: demoWorkspace
  });

  redirect("/onboarding");
}

export async function completeOnboardingAction(formData: FormData) {
  const cookieStore = await cookies();
  const workspaceId = cookieStore.get("bandos_workspace_id")?.value;
  const bandName = String(formData.get("bandName") ?? "WIDESPREAD DISEASE");
  const genre = String(formData.get("genre") ?? "Metalcore");
  const country = String(formData.get("country") ?? "France");
  const tourName = String(
    formData.get("tourName") ?? "Northbound Ruin 2026"
  );
  const logo = String(
    formData.get("logo") ?? "/widespread-disease-logo.jpg"
  );

  cookieStore.set("bandos_genre", genre, cookieConfig);
  cookieStore.set("bandos_country", country, cookieConfig);
  cookieStore.set("bandos_first_tour", tourName, cookieConfig);

  if (!workspaceId) {
    redirect("/auth/sign-in");
  }

  const updatedWorkspace = await updateWorkspaceProfile(workspaceId, {
    name: bandName,
    genre,
    country,
    logoUrl: logo,
    currency: normalizeCurrency(cookieStore.get("bandos_currency")?.value),
    locale: normalizeLocale(cookieStore.get("bandos_locale")?.value),
    onboarded: true
  });

  if (updatedWorkspace) {
    cookieStore.set("bandos_workspace", updatedWorkspace.name, cookieConfig);
    cookieStore.set("bandos_logo", updatedWorkspace.logoUrl, cookieConfig);
    cookieStore.set("bandos_currency", updatedWorkspace.currency, cookieConfig);
    cookieStore.set("bandos_locale", updatedWorkspace.locale, cookieConfig);
    cookieStore.set("bandos_onboarded", "1", cookieConfig);
  }

  redirect("/app");
}

export async function signOutAction() {
  const cookieStore = await cookies();
  clearBaseSessionCookies(cookieStore);

  redirect("/");
}

export async function setCurrencyPreferenceAction(formData: FormData) {
  const cookieStore = await cookies();
  const currency = normalizeCurrency(String(formData.get("currency") ?? "EUR"));
  const returnTo = String(formData.get("returnTo") ?? "/app/settings");

  cookieStore.set("bandos_currency", currency, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false
  });

  redirect(returnTo.startsWith("/") ? returnTo : "/app/settings");
}

export async function setLocalePreferenceAction(formData: FormData) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(String(formData.get("locale") ?? "fr"));
  const returnTo = String(formData.get("returnTo") ?? "/");

  cookieStore.set("bandos_locale", locale, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false
  });

  redirect(returnTo.startsWith("/") ? returnTo : "/");
}
