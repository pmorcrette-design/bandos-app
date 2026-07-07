"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  clearBaseSessionCookies,
  cookieConfig,
  setBaseSessionCookies
} from "@/lib/auth/cookies";
import { normalizeLocale } from "@/lib/i18n";
import { normalizeCurrency } from "@/lib/utils";
import {
  authenticateWorkspaceUser,
  createWorkspaceOwnerAccount,
  findWorkspaceUserByEmail,
  getWorkspaceById,
  isInternalBandosAdminWorkspaceId,
  isBandosPlatformAdminEmail,
  updateWorkspaceUserPasswordById,
  updateWorkspaceProfile
} from "@/lib/server/workspace-store";
import {
  buildPasswordChangedEmail,
  buildPasswordResetEmail,
  buildWelcomeEmail,
  buildAppUrl,
  sendTransactionalEmail
} from "@/lib/server/email";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  getPasswordResetTokenRecord
} from "@/lib/server/password-reset-store";

function buildDefaultWorkspaceName(email: string) {
  const localPart = email.split("@")[0]?.trim();

  if (!localPart) {
    return "New workspace";
  }

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function getPostSignInRedirect(session: Awaited<ReturnType<typeof authenticateWorkspaceUser>>) {
  if (!session) {
    return "/auth/sign-in";
  }

  return session.user.isBandosAdmin ||
    isBandosPlatformAdminEmail(session.user.email)
    ? isInternalBandosAdminWorkspaceId(session.workspace.id)
      ? "/bandos-admin"
      : "/app"
    : "/app";
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

  redirect(getPostSignInRedirect(authenticatedSession));
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fallbackWorkspaceName = buildDefaultWorkspaceName(email);
  const name = String(formData.get("name") ?? "").trim() || "Workspace owner";
  const workspaceName =
    String(formData.get("workspace") ?? "").trim() || fallbackWorkspaceName;
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

    try {
      const welcomeEmail = buildWelcomeEmail({
        recipientName: createdSession.user.name,
        workspaceName: createdSession.workspace.name,
        locale: createdSession.workspace.locale
      });

      await sendTransactionalEmail({
        to: createdSession.user.email,
        subject: welcomeEmail.subject,
        html: welcomeEmail.html,
        text: welcomeEmail.text
      });
    } catch (error) {
      console.warn("BandOS welcome email failed:", error);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_IN_USE") {
      clearBaseSessionCookies(cookieStore);
      redirect("/auth/sign-up?error=email_exists");
    }

    throw error;
  }

  redirect("/onboarding");
}

export async function completeOnboardingAction(formData: FormData) {
  const cookieStore = await cookies();
  const workspaceId = cookieStore.get("bandos_workspace_id")?.value;

  if (!workspaceId) {
    redirect("/auth/sign-in");
  }

  const existingWorkspace = await getWorkspaceById(workspaceId);
  const bandName =
    String(formData.get("bandName") ?? "").trim() ||
    existingWorkspace?.name ||
    "New workspace";
  const genre =
    String(formData.get("genre") ?? "").trim() ||
    existingWorkspace?.genre ||
    "Unspecified";
  const country =
    String(formData.get("country") ?? "").trim() ||
    existingWorkspace?.country ||
    "Unspecified";
  const tourName = String(formData.get("tourName") ?? "").trim();
  const logo =
    String(formData.get("logo") ?? "").trim() ||
    existingWorkspace?.logoUrl ||
    "/bandos-mark.svg";

  cookieStore.set("bandos_genre", genre, cookieConfig);
  cookieStore.set("bandos_country", country, cookieConfig);
  cookieStore.set("bandos_first_tour", tourName, cookieConfig);

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

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect("/auth/forgot-password?error=missing_email");
  }

  try {
    const subject = await findWorkspaceUserByEmail(email);

    if (subject) {
      const resetToken = await createPasswordResetToken({
        userId: subject.user.id,
        workspaceId: subject.workspace.id,
        email: subject.user.email
      });
      const resetUrl = buildAppUrl(`/auth/reset-password?token=${resetToken.token}`);
      const resetEmail = buildPasswordResetEmail({
        recipientName: subject.user.name,
        resetUrl,
        locale: subject.workspace.locale
      });

      await sendTransactionalEmail({
        to: subject.user.email,
        subject: resetEmail.subject,
        html: resetEmail.html,
        text: resetEmail.text
      });
    }
  } catch (error) {
    console.warn("BandOS password reset request failed:", error);
  }

  redirect("/auth/forgot-password?success=sent");
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    redirect("/auth/reset-password?error=invalid_token");
  }

  if (!password.trim() || password.trim().length < 8) {
    redirect(`/auth/reset-password?token=${encodeURIComponent(token)}&error=weak_password`);
  }

  if (password !== confirmPassword) {
    redirect(`/auth/reset-password?token=${encodeURIComponent(token)}&error=password_mismatch`);
  }

  const validRecord = await getPasswordResetTokenRecord(token);

  if (!validRecord) {
    redirect("/auth/reset-password?error=invalid_token");
  }

  const updated = await updateWorkspaceUserPasswordById(validRecord.userId, password);
  await consumePasswordResetToken(token);

  if (updated?.workspace) {
    try {
      const confirmationEmail = buildPasswordChangedEmail({
        recipientName: updated.user.name,
        locale: updated.workspace.locale
      });

      await sendTransactionalEmail({
        to: updated.user.email,
        subject: confirmationEmail.subject,
        html: confirmationEmail.html,
        text: confirmationEmail.text
      });
    } catch (error) {
      console.warn("BandOS password change confirmation failed:", error);
    }
  }

  redirect("/auth/sign-in?reset=success");
}

export async function setCurrencyPreferenceAction(formData: FormData) {
  const cookieStore = await cookies();
  const currency = normalizeCurrency(String(formData.get("currency") ?? "EUR"));
  const returnTo = String(formData.get("returnTo") ?? "/app/settings");

  cookieStore.set("bandos_currency", currency, {
    ...cookieConfig
  });

  redirect(returnTo.startsWith("/") ? returnTo : "/app/settings");
}

export async function setLocalePreferenceAction(formData: FormData) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(String(formData.get("locale") ?? "fr"));
  const returnTo = String(formData.get("returnTo") ?? "/");

  cookieStore.set("bandos_locale", locale, {
    ...cookieConfig
  });

  redirect(returnTo.startsWith("/") ? returnTo : "/");
}
