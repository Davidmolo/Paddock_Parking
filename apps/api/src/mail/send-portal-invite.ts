import { createTransport } from 'nodemailer';

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

export async function sendPortalInviteEmail(opts: {
  to: string;
  name: string;
  inviteUrl: string;
  expiresAt: Date;
}) {
  const port = Number(required('SMTP_PORT'));
  const pass = required('SMTP_PASS').replace(/\s+/g, '');
  const from = required('MAIL_FROM');
  const contact = opts.name || opts.to;
  const expiresLabel = opts.expiresAt.toLocaleString('en-US', {
    timeZone: 'America/Phoenix',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const info = await createTransport({
    host: required('SMTP_HOST'),
    port,
    secure: port === 465,
    auth: { user: required('SMTP_USER'), pass },
  }).sendMail({
    from,
    to: opts.to,
    subject: 'Set your Paddock Parking portal password',
    text: [
      `Hi ${contact},`,
      '',
      'You have been invited to the Paddock Parking customer portal.',
      'Open this link to set your password (expires in 7 days):',
      opts.inviteUrl,
      '',
      `Link expires: ${expiresLabel} (Phoenix time)`,
      '',
      'If you did not expect this email, you can ignore it.',
    ].join('\n'),
    html: `
      <p>Hi ${escapeHtml(contact)},</p>
      <p>You have been invited to the <strong>Paddock Parking</strong> customer portal.</p>
      <p><a href="${opts.inviteUrl}" style="display:inline-block;padding:10px 16px;background:#F5D04A;color:#0a1628;text-decoration:none;border-radius:8px;font-weight:700">Set your password</a></p>
      <p style="color:#555;font-size:13px">Or paste this link into your browser:<br/><a href="${opts.inviteUrl}">${escapeHtml(opts.inviteUrl)}</a></p>
      <p style="color:#555;font-size:13px">This link expires ${escapeHtml(expiresLabel)} (Phoenix time).</p>
    `,
  });

  console.info(`[mail] portal invite → ${opts.to} messageId=${info.messageId}`);
  return info;
}
