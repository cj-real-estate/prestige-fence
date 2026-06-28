// Vercel serverless function — receives bid requests from prestigefenceusa.com
//
// Required env vars (set in Vercel project settings):
//   RESEND_API_KEY          — from resend.com (free tier: 100 emails/day)
//
// Optional env vars (add later to activate Jobber integration):
//   JOBBER_CLIENT_ID        — from developer.getjobber.com
//   JOBBER_CLIENT_SECRET    — from developer.getjobber.com
//   JOBBER_REFRESH_TOKEN    — obtained via Jobber OAuth flow

const NOTIFICATION_EMAIL = 'estimating@prestigeservicesusa.com';
const JOBBER_API = 'https://api.getjobber.com/api/graphql';
const JOBBER_TOKEN_URL = 'https://api.getjobber.com/api/oauth/token';

// ─── Jobber ────────────────────────────────────────────────────────────────

async function getJobberAccessToken() {
  const res = await fetch(JOBBER_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.JOBBER_CLIENT_ID,
      client_secret: process.env.JOBBER_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: process.env.JOBBER_REFRESH_TOKEN,
    }),
  });
  if (!res.ok) throw new Error(`Jobber token refresh failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function jobberQuery(token, query, variables) {
  const res = await fetch(JOBBER_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-JOBBER-GRAPHQL-VERSION': '2024-07-26',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Jobber GraphQL error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function createJobberLead(lead) {
  const token = await getJobberAccessToken();

  const nameParts = (lead.name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || lead.company;
  const lastName = nameParts.slice(1).join(' ') || '';

  // Create client record
  const clientResult = await jobberQuery(token, `
    mutation ClientCreate($input: ClientCreateInput!) {
      clientCreate(input: $input) {
        client { id }
        userErrors { message path }
      }
    }
  `, {
    input: {
      firstName,
      lastName,
      companyName: lead.company,
      emails: lead.email ? [{ address: lead.email, primary: true }] : [],
      phones: lead.phone ? [{ number: lead.phone, primary: true }] : [],
    },
  });

  const clientErrors = clientResult?.data?.clientCreate?.userErrors;
  if (clientErrors?.length) console.warn('Jobber clientCreate warnings:', clientErrors);

  const clientId = clientResult?.data?.clientCreate?.client?.id;
  if (!clientId) throw new Error(`Jobber client not created: ${JSON.stringify(clientErrors)}`);

  // Build description from all form fields
  const description = [
    `Company: ${lead.company}`,
    `Contact: ${lead.name}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone}`,
    lead.projectName && `Project: ${lead.projectName}`,
    lead.location && `Location: ${lead.location}`,
    lead.projectType && `Project Type: ${lead.projectType}`,
    lead.bidDate && `Bid Due Date: ${lead.bidDate}`,
    lead.notes && `\nScope / Notes:\n${lead.notes}`,
  ].filter(Boolean).join('\n');

  // Create request linked to client
  const requestResult = await jobberQuery(token, `
    mutation RequestCreate($input: RequestCreateInput!) {
      requestCreate(input: $input) {
        request { id jobNumber }
        userErrors { message path }
      }
    }
  `, {
    input: {
      clientId,
      title: `Bid Request — ${lead.company}${lead.projectName ? `: ${lead.projectName}` : ''}`,
      description,
    },
  });

  const requestErrors = requestResult?.data?.requestCreate?.userErrors;
  if (requestErrors?.length) console.warn('Jobber requestCreate warnings:', requestErrors);

  return requestResult?.data?.requestCreate?.request;
}

// ─── Email (Resend) ────────────────────────────────────────────────────────

async function sendEmail(lead) {
  const subject = `New Fence Bid Request — ${lead.company}${lead.projectName ? `: ${lead.projectName}` : ''}`;

  const row = (label, value) =>
    value
      ? `<tr>
           <td style="padding:7px 0;color:#666;font-size:14px;width:140px;vertical-align:top">${label}</td>
           <td style="padding:7px 0;font-size:14px;font-weight:600;vertical-align:top">${value}</td>
         </tr>`
      : '';

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;color:#222">
      <div style="background:#0a0b0d;padding:24px 28px;border-radius:8px 8px 0 0;display:flex;align-items:center;gap:12px">
        <div>
          <p style="color:#f5b800;font-weight:800;font-size:13px;letter-spacing:1px;margin:0 0 4px;text-transform:uppercase">Prestige Fence</p>
          <h2 style="color:#fff;margin:0;font-size:19px">New Bid Request</h2>
        </div>
      </div>
      <div style="background:#f5f5f5;padding:24px 28px">
        <table style="width:100%;border-collapse:collapse;background:#fff;padding:16px 20px;border-radius:6px;display:table">
          <tbody style="display:table-row-group">
            ${row('Company', lead.company)}
            ${row('Contact', lead.name)}
            ${row('Email', `<a href="mailto:${lead.email}" style="color:#c69400">${lead.email}</a>`)}
            ${row('Phone', `<a href="tel:${lead.phone}" style="color:#c69400">${lead.phone}</a>`)}
            ${row('Project', lead.projectName)}
            ${row('Location', lead.location)}
            ${row('Project Type', lead.projectType)}
            ${row('Bid Due Date', lead.bidDate)}
          </tbody>
        </table>
        ${lead.notes ? `
        <div style="margin-top:16px;background:#fff;border-radius:6px;padding:16px 20px">
          <p style="font-size:12px;font-weight:700;letter-spacing:1px;color:#666;text-transform:uppercase;margin:0 0 8px">Scope / Notes</p>
          <p style="white-space:pre-wrap;font-size:14px;margin:0;line-height:1.6">${lead.notes}</p>
        </div>` : ''}
        <p style="margin-top:20px;font-size:12px;color:#999;text-align:center">Submitted via prestigefenceusa.com</p>
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
      to: NOTIFICATION_EMAIL,
      reply_to: lead.email,
      subject,
      html,
    }),
  });

  if (!res.ok) throw new Error(`Resend error: ${res.status} ${await res.text()}`);
}

// ─── Handler ───────────────────────────────────────────────────────────────

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

  const tasks = [];

  if (process.env.RESEND_API_KEY) {
    tasks.push(sendEmail(lead));
  } else {
    console.warn('RESEND_API_KEY not set — skipping email');
  }

  if (process.env.JOBBER_CLIENT_ID && process.env.JOBBER_REFRESH_TOKEN) {
    tasks.push(createJobberLead(lead));
  }

  const results = await Promise.allSettled(tasks);
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`bid.js task[${i}] failed:`, r.reason?.message);
  });

  res.status(200).json({ ok: true });
};
