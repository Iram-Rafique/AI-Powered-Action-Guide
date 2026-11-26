import nodemailer from 'nodemailer'

// Sends emails through a transactional email service (e.g. Brevo) over SMTP.
// The settings come from .env:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS  - from the email service
//   EMAIL_FROM                                   - verified sender, e.g. "Action Guide <you@example.com>"
//   APP_URL                                      - frontend address, used for the link in the email

let transporter = null

export const emailConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM)

const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 uses TLS from the start; 587 upgrades with STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return transporter
}

// Text from the letter must never be treated as HTML
const escapeHtml = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// "17 March 2026"
const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

const byDate = (a, b) => {
  if (!a.due_date) return 1
  if (!b.due_date) return -1
  return new Date(a.due_date) - new Date(b.due_date)
}

// Builds the subject, HTML and plain-text versions of an Action Guide email
export const buildActionGuideEmail = (document, userName) => {
  const items = document.extracted_items
  const todo = items.filter((i) => i.item_type === 'action' && i.action_status !== 'completed').sort(byDate)
  const done = items.filter((i) => i.item_type === 'action' && i.action_status === 'completed')
  const dates = items.filter((i) => i.item_type === 'date').sort(byDate)
  const details = items.filter((i) => i.item_type === 'detail')
  const link = process.env.APP_URL ? `${process.env.APP_URL.replace(/\/$/, '')}/documents/${document.document_id}` : null

  const subject = `Your Action Guide: ${document.document_name}`

  // ---------- Plain text ----------
  const lines = [`Hello ${userName},`, '', `Here is your Action Guide for "${document.document_name}".`, '']
  lines.push('TO DO')
  if (todo.length) {
    todo.forEach((i) => lines.push(`- ${i.description}${i.due_date ? ` (by ${formatDate(i.due_date)})` : ''}`))
  } else {
    lines.push('- Nothing left to do.')
  }
  if (done.length) {
    lines.push('', 'ALREADY DONE')
    done.forEach((i) => lines.push(`- ${i.description}`))
  }
  if (dates.length) {
    lines.push('', 'KEY DATES')
    dates.forEach((i) => lines.push(`- ${i.due_date ? `${formatDate(i.due_date)}: ` : ''}${i.description}`))
  }
  if (details.length) {
    lines.push('', 'DETAILS')
    details.forEach((i) => lines.push(`- ${i.description}`))
  }
  if (link) lines.push('', `Open your Action Guide: ${link}`)
  lines.push(
    '',
    'This information was extracted by AI and may be incomplete or incorrect. Always check it against your original letter. It is general information only and is not legal, medical or financial advice.'
  )
  const text = lines.join('\n')

  // ---------- HTML (inline styles, because email apps ignore style sheets) ----------
  const row = (main, side = '') => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #EAE4DA;font-size:15px;color:#1E2A44;">${main}</td>
      <td style="padding:10px 0 10px 16px;border-bottom:1px solid #EAE4DA;font-size:14px;color:#57534E;text-align:right;white-space:nowrap;">${side}</td>
    </tr>`
  const section = (title, rows) => `
    <p style="margin:28px 0 4px;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#57534E;">${title}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>`

  let body = ''
  body += section(
    'To do',
    todo.length
      ? todo.map((i) => row(escapeHtml(i.description), i.due_date ? `By ${formatDate(i.due_date)}` : 'No date')).join('')
      : row('Nothing left to do.')
  )
  if (done.length) {
    body += section('Already done', done.map((i) => row(`<span style="color:#78716C;text-decoration:line-through;">${escapeHtml(i.description)}</span>`)).join(''))
  }
  if (dates.length) {
    body += section('Key dates', dates.map((i) => row(escapeHtml(i.description), i.due_date ? formatDate(i.due_date) : '')).join(''))
  }
  if (details.length) {
    body += section('Details', details.map((i) => row(escapeHtml(i.description))).join(''))
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#FAF7F2;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid #EAE4DA;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#1E2A44;border-bottom:3px solid #F2715A;padding:18px 28px;font-size:18px;font-weight:bold;color:#FFFFFF;">Action Guide</td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0;font-size:15px;color:#1E2A44;">Hello ${escapeHtml(userName)},</p>
          <p style="margin:8px 0 0;font-size:15px;color:#1E2A44;">Here is your Action Guide for <strong>${escapeHtml(document.document_name)}</strong>.</p>
          ${body}
          ${link ? `<p style="margin:28px 0 0;"><a href="${escapeHtml(link)}" style="display:inline-block;background:#1E3A5F;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 20px;border-radius:8px;">Open your Action Guide</a></p>` : ''}
          <p style="margin:28px 0 0;padding:12px 14px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;font-size:12px;line-height:18px;color:#1E2A44;">
            <strong>Extracted by AI.</strong> This information may be incomplete or incorrect. Always check it against your original letter. It is general information only and is not legal, medical or financial advice.
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#78716C;">You received this email because you asked Action Guide to send it to you.</p>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, text, html }
}

export const sendEmail = ({ to, subject, text, html }) =>
  getTransporter().sendMail({ from: process.env.EMAIL_FROM, to, subject, text, html })