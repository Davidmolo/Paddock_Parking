import { createTransport, type Transporter } from 'nodemailer';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAVY = '#0b1846';
const ORANGE = '#f39a2c';
const APP_NAME = 'Phoenix Storage Yards';
const LOGO = join(dirname(fileURLToPath(import.meta.url)), 'phoenix-logo.png');

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      'Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and MAIL_FROM.',
    );
  }
  return value;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mailer(): Transporter {
  const port = Number(required('SMTP_PORT'));
  const pass = required('SMTP_PASS').replace(/\s+/g, '');
  return createTransport({
    host: required('SMTP_HOST'),
    port,
    secure: port === 465,
    auth: { user: required('SMTP_USER'), pass },
  });
}

function emailHtml(body: string, action?: { href: string; label: string }) {
  const button = action
    ? `<p style="margin:24px 0 0"><a href="${action.href}" style="display:inline-block;padding:12px 18px;background:${ORANGE};color:${NAVY};text-decoration:none;border-radius:8px;font-weight:700;font-family:Arial,sans-serif">${escapeHtml(action.label)}</a></p>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;background:${NAVY}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NAVY};padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px">
        <tr><td align="center" style="padding:28px 28px 0">
          <img src="cid:phoenix-logo" alt="${APP_NAME}" width="120" style="display:block;width:120px;height:auto;border:0" />
        </td></tr>
        <tr><td style="padding:20px 28px 28px;font-family:Arial,sans-serif;color:${NAVY};font-size:16px;line-height:1.5">
          ${body}
          ${button}
          <p style="margin:28px 0 0;font-size:12px;color:#5b6b7c">${APP_NAME}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const logoAttachment = {
  filename: 'phoenix-logo.png',
  path: LOGO,
  cid: 'phoenix-logo',
};

export async function sendPortalInviteEmail(opts: {
  to: string;
  name: string;
  inviteUrl: string;
  expiresAt: Date;
}) {
  const from = required('MAIL_FROM');
  const contact = opts.name || opts.to;
  const expiresLabel = opts.expiresAt.toLocaleString('en-US', {
    timeZone: 'America/Phoenix',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const info = await mailer().sendMail({
    from,
    to: opts.to,
    subject: `Set your ${APP_NAME} portal password`,
    attachments: [logoAttachment],
    text: [
      `Hi ${contact},`,
      '',
      `You have been invited to the ${APP_NAME} customer portal.`,
      'Open this link to set your password (expires in 7 days):',
      opts.inviteUrl,
      '',
      `Link expires: ${expiresLabel} (Phoenix time)`,
      '',
      'If you did not expect this email, you can ignore it.',
      '',
      APP_NAME,
    ].join('\n'),
    html: emailHtml(
      `<p style="margin:0 0 12px">Hi ${escapeHtml(contact)},</p>
       <p style="margin:0">You have been invited to the <strong>${APP_NAME}</strong> customer portal.</p>
       <p style="margin:16px 0 0;color:#5b6b7c;font-size:13px">Or paste this link into your browser:<br/><a href="${opts.inviteUrl}" style="color:${NAVY}">${escapeHtml(opts.inviteUrl)}</a></p>
       <p style="margin:12px 0 0;color:#5b6b7c;font-size:13px">This link expires ${escapeHtml(expiresLabel)} (Phoenix time).</p>`,
      { href: opts.inviteUrl, label: 'Set your password' },
    ),
  });
  console.info(`[mail] portal invite → ${opts.to} messageId=${info.messageId}`);
  return info;
}

export async function sendManualInvoiceEmail(opts: {
  to: string;
  name: string;
  lines: string[];
  portalUrl: string;
}) {
  const from = required('MAIL_FROM');
  const contact = opts.name || opts.to;
  const lineHtml = opts.lines
    .map((line) => `<p style="margin:0 0 8px">${escapeHtml(line)}</p>`)
    .join('');
  const info = await mailer().sendMail({
    from,
    to: opts.to,
    subject: `Your ${APP_NAME} invoice`,
    attachments: [logoAttachment],
    text: [
      `Hi ${contact},`,
      '',
      `An invoice is ready in your ${APP_NAME} customer portal:`,
      ...opts.lines,
      '',
      opts.portalUrl,
      '',
      APP_NAME,
    ].join('\n'),
    html: emailHtml(
      `<p style="margin:0 0 12px">Hi ${escapeHtml(contact)},</p>
       <p style="margin:0 0 12px">An invoice is ready in your <strong>${APP_NAME}</strong> customer portal.</p>
       ${lineHtml}`,
      { href: opts.portalUrl, label: 'Open the portal' },
    ),
  });
  console.info(`[mail] invoice → ${opts.to} messageId=${info.messageId}`);
  return info;
}
