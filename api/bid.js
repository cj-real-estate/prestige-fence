// Vercel serverless function — receives bid requests from prestigefenceusa.com
//
// Required env var (set in Vercel project settings):
//   RESEND_API_KEY  — from resend.com (free tier: 100 emails/day)

const TO = ['caleb@prestigefenceusa.com', 'luis@prestigefenceusa.com'];

async function sendEmail(lead) {
  const subject = `New Fence Bid Request — ${lead.company}${lead.projectName ? `: ${lead.projectName}` : ''}`;

  const row = (label, value) =>
    value
      ? `<tr>
           <td style="padding:7px 12px 7px 0;color:#666;font-size:14px;width:140px;vertical-align:top;white-space:nowrap">${label}</td>
           <td style="padding:7px 0;font-size:14px;font-weight:600;vertical-align:top">${value}</td>
         </tr>`
      : '';

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;color:#222">
      <div style="background:#0a0b0d;padding:22px 28px;border-radius:8px 8px 0 0">
        <p style="color:#f5b800;font-weight:800;font-size:12px;letter-spacing:1.5px;margin:0 0 4px;text-transform:uppercase">Prestige Fence</p>
        <h2 style="color:#fff;margin:0;font-size:20px">New Bid Request</h2>
      </div>
      <div style="background:#f5f5f5;padding:24px 28px;border-radius:0 0 8px 8px">
        <div style="background:#fff;border-radius:6px;padding:16px 20px">
          <table style="width:100%;border-collapse:collapse">
            ${row('Company', lead.company)}
            ${row('Contact', lead.name)}
            ${row('Email', `<a href="mailto:${lead.email}" style="color:#b8860b">${lead.email}</a>`)}
            ${row('Phone', `<a href="tel:${lead.phone}" style="color:#b8860b">${lead.phone}</a>`)}
            ${row('Project', lead.projectName)}
            ${row('Location', lead.location)}
            ${row('Project Type', lead.projectType)}
            ${row('Bid Due Date', lead.bidDate)}
          </table>
        </div>
        ${lead.notes ? `
        <div style="margin-top:14px;background:#fff;border-radius:6px;padding:16px 20px">
          <p style="font-size:11px;font-weight:700;letter-spacing:1px;color:#999;text-transform:uppercase;margin:0 0 8px">Scope / Notes</p>
          <p style="white-space:pre-wrap;font-size:14px;margin:0;line-height:1.6">${lead.notes}</p>
        </div>` : ''}
        <p style="margin-top:18px;font-size:12px;color:#aaa;text-align:center">Submitted via prestigefenceusa.com</p>
      </div>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Prestige Fence <noreply@prestigefenceusa.com>',
      to: TO,
      reply_to: lead.email,
      subject,
      html,
    }),
  });

  if (!res.ok) throw new Error(`Resend error: ${res.status} ${await res.text()}`);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const b = req.body || {};
  const lead = {
    company:     (b.company     || '').trim(),
    name:        (b.name        || '').trim(),
    email:       (b.email       || '').trim(),
    phone:       (b.phone       || '').trim(),
    projectName: (b.projectName || '').trim(),
    location:    (b.location    || '').trim(),
    projectType: (b.projectType || '').trim(),
    bidDate:     (b.bidDate     || '').trim(),
    notes:       (b.notes       || '').trim(),
  };

  if (!lead.company || !lead.name || !lead.email || !lead.phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await sendEmail(lead);
  } catch (err) {
    console.error('sendEmail failed:', err.message);
  }

  res.status(200).json({ ok: true });
};
