import "server-only";

import nodemailer from "nodemailer";

export type TransactionalEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function getAppBaseUrl() {
  return (
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://bandos.online"
  ).replace(/\/$/, "");
}

function getEmailConfig() {
  const host = process.env.EMAIL_SMTP_HOST ?? "smtp.hostinger.com";
  const port = Number(process.env.EMAIL_SMTP_PORT ?? "465");
  const secure = String(process.env.EMAIL_SMTP_SECURE ?? "true") === "true";
  const user = process.env.EMAIL_SMTP_USER ?? "";
  const pass = process.env.EMAIL_SMTP_PASS ?? "";
  const from = process.env.EMAIL_FROM ?? user;
  const replyTo = process.env.EMAIL_REPLY_TO ?? from;

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    replyTo
  };
}

export function isEmailTransportConfigured() {
  const config = getEmailConfig();
  return Boolean(config.user && config.pass && config.from);
}

export function buildAppUrl(path: string) {
  return `${getAppBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function getBrandMarkUrl() {
  return buildAppUrl("/bandos-mark.svg");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendTransactionalEmail(message: TransactionalEmail) {
  if (!isEmailTransportConfigured()) {
    throw new Error("EMAIL_TRANSPORT_NOT_CONFIGURED");
  }

  const config = getEmailConfig();
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  await transport.sendMail({
    from: config.from,
    replyTo: config.replyTo,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text
  });
}

function buildDetailCard(
  title: string,
  rows: Array<{ label: string; value: string }>
) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-collapse:separate;border-spacing:0;border:1px solid #262a30;border-radius:22px;background:#0c0f11;">
      <tr>
        <td style="padding:18px 20px 8px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#fb7868;">
          ${escapeHtml(title)}
        </td>
      </tr>
      ${rows
        .map(
          (row) => `
            <tr>
              <td style="padding:10px 20px;border-top:1px solid #1f2328;">
                <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8f959d;margin-bottom:6px;">
                  ${escapeHtml(row.label)}
                </div>
                <div style="font-size:16px;line-height:1.6;color:#f5f3ef;font-weight:600;">
                  ${escapeHtml(row.value)}
                </div>
              </td>
            </tr>
          `
        )
        .join("")}
    </table>
  `;
}

function buildInfoStrip(items: string[]) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-collapse:separate;border-spacing:0 10px;">
      ${items
        .map(
          (item) => `
            <tr>
              <td style="border:1px solid #23272d;border-radius:18px;background:#111417;padding:14px 16px;font-size:14px;line-height:1.7;color:#d7d1ca;">
                ${escapeHtml(item)}
              </td>
            </tr>
          `
        )
        .join("")}
    </table>
  `;
}

function wrapEmailHtml({
  preheader,
  eyebrow,
  title,
  intro,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  footerNote
}: {
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}) {
  const markUrl = getBrandMarkUrl();

  return `
    <!DOCTYPE html>
    <html lang="en">
      <body style="margin:0;padding:0;background:#050608;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
          ${escapeHtml(preheader)}
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#050608;">
          <tr>
            <td align="center" style="padding:32px 16px;background:
              radial-gradient(circle at top left, rgba(251,100,85,0.20), transparent 38%),
              radial-gradient(circle at bottom right, rgba(255,255,255,0.08), transparent 28%),
              #050608;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;border-collapse:separate;border-spacing:0;">
                <tr>
                  <td style="border:1px solid #1e2227;border-radius:30px;background:#101214;overflow:hidden;box-shadow:0 26px 80px rgba(0,0,0,0.42);">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="padding:28px 32px 18px;background:
                          linear-gradient(135deg, #181a1d 0%, #101214 54%, #170f0e 100%);
                          border-bottom:1px solid #242830;">
                          <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                            <tr>
                              <td width="56" valign="middle">
                                <div style="height:48px;width:48px;border-radius:16px;background:#050608;border:1px solid #262a30;text-align:center;line-height:48px;">
                                  <img src="${markUrl}" width="28" height="28" alt="BandOS" style="display:block;margin:10px auto 0;" />
                                </div>
                              </td>
                              <td valign="middle" style="padding-left:12px;">
                                <div style="font-size:28px;line-height:1;color:#f5f3ef;font-weight:700;letter-spacing:-0.02em;">Band<span style="color:#fb6455;">OS</span></div>
                                <div style="margin-top:6px;font-size:11px;letter-spacing:0.30em;text-transform:uppercase;color:#8f959d;">
                                  Tour. Manage. Grow.
                                </div>
                              </td>
                            </tr>
                          </table>

                          <div style="margin-top:28px;display:inline-block;border:1px solid rgba(251,100,85,0.28);border-radius:999px;padding:8px 12px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#fb7868;background:rgba(251,100,85,0.08);">
                            ${escapeHtml(eyebrow)}
                          </div>
                          <h1 style="margin:18px 0 0;font-size:36px;line-height:1.12;letter-spacing:-0.03em;color:#f5f3ef;font-weight:700;">
                            ${escapeHtml(title)}
                          </h1>
                          <p style="margin:14px 0 0;font-size:16px;line-height:1.8;color:#c7c2bc;">
                            ${escapeHtml(intro)}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:30px 32px 34px;">
                          <div style="font-size:15px;line-height:1.85;color:#ece7e1;">
                            ${bodyHtml}
                          </div>
                          ${
                            ctaLabel && ctaUrl
                              ? `
                                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;border-collapse:collapse;">
                                  <tr>
                                    <td style="border-radius:18px;background:#fb6455;">
                                      <a href="${ctaUrl}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.01em;">
                                        ${escapeHtml(ctaLabel)}
                                      </a>
                                    </td>
                                  </tr>
                                </table>
                              `
                              : ""
                          }
                          <div style="margin-top:26px;padding-top:18px;border-top:1px solid #1f2328;font-size:13px;line-height:1.8;color:#8f959d;">
                            ${escapeHtml(
                              footerNote ??
                                "BandOS est un workspace opérationnel pour les groupes en tournée. Réponds simplement à cet email si tu as besoin d'aide."
                            )}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function buildWelcomeEmail(payload: {
  recipientName: string;
  workspaceName: string;
  locale: "fr" | "en";
}) {
  const loginUrl = buildAppUrl("/auth/sign-in");

  if (payload.locale === "fr") {
    return {
      subject: `Bienvenue sur BandOS — ${payload.workspaceName}`,
      text: `Bonjour ${payload.recipientName},\n\nTon workspace ${payload.workspaceName} est prêt. Tu peux te connecter ici : ${loginUrl}\n\nBandOS`,
      html: wrapEmailHtml({
        preheader: `Ton workspace ${payload.workspaceName} est prêt.`,
        eyebrow: "Workspace prêt",
        title: `Bienvenue dans ${payload.workspaceName}`,
        intro: "Ton compte BandOS vient d'être créé.",
        bodyHtml: `
          <p style="margin:0 0 14px;">Bonjour ${escapeHtml(payload.recipientName)},</p>
          <p style="margin:0 0 14px;">Ton workspace est prêt. Tu peux maintenant te connecter, terminer ton onboarding, puis commencer à structurer la tournée, les concerts, le merch et les documents.</p>
          ${buildInfoStrip([
            "Workspace sécurisé et isolé pour ton équipe",
            "Pilotage concerts, routing, finance, merch et documents",
            "Interface premium pensée pour les groupes qui tournent sérieusement"
          ])}
        `,
        ctaLabel: "Se connecter à BandOS",
        ctaUrl: loginUrl
      })
    };
  }

  return {
    subject: `Welcome to BandOS — ${payload.workspaceName}`,
    text: `Hi ${payload.recipientName},\n\nYour ${payload.workspaceName} workspace is ready. You can sign in here: ${loginUrl}\n\nBandOS`,
    html: wrapEmailHtml({
      preheader: `Your ${payload.workspaceName} workspace is ready.`,
      eyebrow: "Workspace ready",
      title: `Welcome to ${payload.workspaceName}`,
      intro: "Your BandOS account has been created.",
      bodyHtml: `
        <p style="margin:0 0 14px;">Hi ${escapeHtml(payload.recipientName)},</p>
        <p style="margin:0 0 14px;">Your workspace is ready. You can now sign in, finish onboarding, and start organizing tour routing, shows, merch, finance, and documents.</p>
        ${buildInfoStrip([
          "Secure and isolated workspace for your crew",
          "Shows, route planning, finance, merch, and docs in one place",
          "Premium operations UX for serious touring bands"
        ])}
      `,
      ctaLabel: "Sign in to BandOS",
      ctaUrl: loginUrl
    })
  };
}

export function buildTeamInviteEmail(payload: {
  recipientName: string;
  workspaceName: string;
  email: string;
  temporaryPassword: string;
  locale: "fr" | "en";
}) {
  const loginUrl = buildAppUrl("/auth/sign-in");

  if (payload.locale === "fr") {
    return {
      subject: `Invitation BandOS — ${payload.workspaceName}`,
      text: `Bonjour ${payload.recipientName},\n\nUn accès t'a été créé sur ${payload.workspaceName}.\nEmail : ${payload.email}\nMot de passe temporaire : ${payload.temporaryPassword}\nConnexion : ${loginUrl}\n\nBandOS`,
      html: wrapEmailHtml({
        preheader: `Ton accès à ${payload.workspaceName} est prêt.`,
        eyebrow: "Accès équipe",
        title: `Accès créé pour ${payload.workspaceName}`,
        intro: "Ton login BandOS est prêt.",
        bodyHtml: `
          <p style="margin:0 0 14px;">Bonjour ${escapeHtml(payload.recipientName)},</p>
          <p style="margin:0 0 14px;">Un accès a été créé pour toi sur <strong>${escapeHtml(payload.workspaceName)}</strong>. Tu peux te connecter tout de suite avec les informations ci-dessous.</p>
          ${buildDetailCard("Identifiants", [
            { label: "Email", value: payload.email },
            { label: "Mot de passe temporaire", value: payload.temporaryPassword }
          ])}
          ${buildInfoStrip([
            "Change ton mot de passe après la première connexion",
            "Ton accès est séparé du reste de l'équipe",
            "Tu arrives directement dans le workspace du groupe"
          ])}
        `,
        ctaLabel: "Ouvrir BandOS",
        ctaUrl: loginUrl
      })
    };
  }

  return {
    subject: `BandOS invite — ${payload.workspaceName}`,
    text: `Hi ${payload.recipientName},\n\nAn account was created for you on ${payload.workspaceName}.\nEmail: ${payload.email}\nTemporary password: ${payload.temporaryPassword}\nSign in: ${loginUrl}\n\nBandOS`,
    html: wrapEmailHtml({
      preheader: `Your access to ${payload.workspaceName} is ready.`,
      eyebrow: "Team access",
      title: `Your access for ${payload.workspaceName} is ready`,
      intro: "Your BandOS login has been created.",
      bodyHtml: `
        <p style="margin:0 0 14px;">Hi ${escapeHtml(payload.recipientName)},</p>
        <p style="margin:0 0 14px;">An account was created for you on <strong>${escapeHtml(payload.workspaceName)}</strong>. You can sign in right away with the details below.</p>
        ${buildDetailCard("Credentials", [
          { label: "Email", value: payload.email },
          { label: "Temporary password", value: payload.temporaryPassword }
        ])}
        ${buildInfoStrip([
          "Change your password after the first sign-in",
          "Your access stays separate from the rest of the team",
          "You land directly in the band's workspace"
        ])}
      `,
      ctaLabel: "Open BandOS",
      ctaUrl: loginUrl
    })
  };
}

export function buildBandosAdminInviteEmail(payload: {
  recipientName: string;
  email: string;
  temporaryPassword: string;
  locale: "fr" | "en";
}) {
  const adminUrl = buildAppUrl("/bandos-admin");

  if (payload.locale === "fr") {
    return {
      subject: "Accès BandOS Admin",
      text: `Bonjour ${payload.recipientName},\n\nUn accès admin BandOS t'a été créé.\nEmail : ${payload.email}\nMot de passe temporaire : ${payload.temporaryPassword}\nConnexion : ${adminUrl}\n\nBandOS`,
      html: wrapEmailHtml({
        preheader: "Ton accès admin BandOS est prêt.",
        eyebrow: "Control center",
        title: "Accès BandOS Admin créé",
        intro: "Ton accès interne au control center BandOS est prêt.",
        bodyHtml: `
          <p style="margin:0 0 14px;">Bonjour ${escapeHtml(payload.recipientName)},</p>
          <p style="margin:0 0 14px;">Un accès admin BandOS a été créé pour toi afin de piloter les comptes clients, les abonnements et l'administration plateforme.</p>
          ${buildDetailCard("Identifiants", [
            { label: "Email", value: payload.email },
            { label: "Mot de passe temporaire", value: payload.temporaryPassword }
          ])}
          ${buildInfoStrip([
            "Espace interne séparé de l'app client",
            "Change le mot de passe après la première connexion",
            "Accès réservé aux admins plateforme BandOS"
          ])}
        `,
        ctaLabel: "Ouvrir le control center",
        ctaUrl: adminUrl
      })
    };
  }

  return {
    subject: "BandOS admin access",
    text: `Hi ${payload.recipientName},\n\nA BandOS admin account was created for you.\nEmail: ${payload.email}\nTemporary password: ${payload.temporaryPassword}\nSign in: ${adminUrl}\n\nBandOS`,
    html: wrapEmailHtml({
      preheader: "Your BandOS admin access is ready.",
      eyebrow: "Control center",
      title: "BandOS admin access created",
      intro: "Your internal BandOS control-center login is ready.",
      bodyHtml: `
        <p style="margin:0 0 14px;">Hi ${escapeHtml(payload.recipientName)},</p>
        <p style="margin:0 0 14px;">A BandOS admin account was created for you so you can manage client accounts, subscriptions, and internal platform operations.</p>
        ${buildDetailCard("Credentials", [
          { label: "Email", value: payload.email },
          { label: "Temporary password", value: payload.temporaryPassword }
        ])}
        ${buildInfoStrip([
          "Separate internal space from the client app",
          "Change the password after your first sign-in",
          "Access reserved for BandOS platform admins"
        ])}
      `,
      ctaLabel: "Open the control center",
      ctaUrl: adminUrl
    })
  };
}

export function buildPasswordResetEmail(payload: {
  recipientName: string;
  resetUrl: string;
  locale: "fr" | "en";
}) {
  if (payload.locale === "fr") {
    return {
      subject: "Réinitialisation de mot de passe BandOS",
      text: `Bonjour ${payload.recipientName},\n\nTu as demandé une réinitialisation de mot de passe.\nUtilise ce lien dans les 2 heures : ${payload.resetUrl}\n\nBandOS`,
      html: wrapEmailHtml({
        preheader: "Réinitialise ton mot de passe BandOS.",
        eyebrow: "Sécurité compte",
        title: "Réinitialise ton mot de passe",
        intro: "Une demande de réinitialisation vient d'être reçue.",
        bodyHtml: `
          <p style="margin:0 0 14px;">Bonjour ${escapeHtml(payload.recipientName)},</p>
          <p style="margin:0 0 14px;">Utilise le bouton ci-dessous pour définir un nouveau mot de passe. Le lien reste valable pendant 2 heures.</p>
          ${buildInfoStrip([
            "Lien sécurisé valable 2 heures",
            "À utiliser uniquement si tu es à l'origine de la demande",
            "Si tu n'as rien demandé, tu peux ignorer cet email"
          ])}
        `,
        ctaLabel: "Réinitialiser le mot de passe",
        ctaUrl: payload.resetUrl
      })
    };
  }

  return {
    subject: "BandOS password reset",
    text: `Hi ${payload.recipientName},\n\nA password reset was requested.\nUse this link within 2 hours: ${payload.resetUrl}\n\nBandOS`,
    html: wrapEmailHtml({
      preheader: "Reset your BandOS password.",
      eyebrow: "Account security",
      title: "Reset your password",
      intro: "A password reset request was received.",
      bodyHtml: `
        <p style="margin:0 0 14px;">Hi ${escapeHtml(payload.recipientName)},</p>
        <p style="margin:0 0 14px;">Use the button below to set a new password. The link stays valid for 2 hours.</p>
        ${buildInfoStrip([
          "Secure link valid for 2 hours",
          "Use it only if you requested the reset",
          "If you did not request this, you can ignore this email"
        ])}
      `,
      ctaLabel: "Reset password",
      ctaUrl: payload.resetUrl
    })
  };
}

export function buildPasswordChangedEmail(payload: {
  recipientName: string;
  locale: "fr" | "en";
}) {
  const loginUrl = buildAppUrl("/auth/sign-in");

  if (payload.locale === "fr") {
    return {
      subject: "Mot de passe BandOS mis à jour",
      text: `Bonjour ${payload.recipientName},\n\nTon mot de passe BandOS a bien été mis à jour.\nConnexion : ${loginUrl}\n\nBandOS`,
      html: wrapEmailHtml({
        preheader: "Ton mot de passe BandOS a été mis à jour.",
        eyebrow: "Sécurité compte",
        title: "Mot de passe mis à jour",
        intro: "La modification est bien enregistrée.",
        bodyHtml: `
          <p style="margin:0 0 14px;">Bonjour ${escapeHtml(payload.recipientName)},</p>
          <p style="margin:0 0 14px;">Ton mot de passe BandOS a bien été changé. Si tu n'es pas à l'origine de cette action, contacte immédiatement l'équipe BandOS.</p>
          ${buildInfoStrip([
            "Le nouveau mot de passe est actif immédiatement",
            "Tes autres données de workspace ne sont pas modifiées",
            "Réponds à cet email si l'action n'est pas légitime"
          ])}
        `,
        ctaLabel: "Se connecter",
        ctaUrl: loginUrl
      })
    };
  }

  return {
    subject: "BandOS password updated",
    text: `Hi ${payload.recipientName},\n\nYour BandOS password was updated successfully.\nSign in: ${loginUrl}\n\nBandOS`,
    html: wrapEmailHtml({
      preheader: "Your BandOS password was updated.",
      eyebrow: "Account security",
      title: "Password updated",
      intro: "The change has been saved successfully.",
      bodyHtml: `
        <p style="margin:0 0 14px;">Hi ${escapeHtml(payload.recipientName)},</p>
        <p style="margin:0 0 14px;">Your BandOS password was changed successfully. If this wasn't you, contact the BandOS team immediately.</p>
        ${buildInfoStrip([
          "The new password is active immediately",
          "No workspace content was changed",
          "Reply to this email if the action was not legitimate"
        ])}
      `,
      ctaLabel: "Sign in",
      ctaUrl: loginUrl
    })
  };
}
