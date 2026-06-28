// Vercel serverless function — receives bid requests from prestigefenceusa.com
// Forwards lead data to Zapier for email/CRM routing

const ZAPIER_WEBHOOK = 'https://hooks.zapier.com/hooks/catch/28068299/42wahe7/';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const b = req.body || {};
  const lead = {
    company:      (b.company     || '').trim(),
    name:         (b.name        || '').trim(),
    email:        (b.email       || '').trim(),
    phone:        (b.phone       || '').trim(),
    project_name: (b.projectName || '').trim(),
    location:     (b.location    || '').trim(),
    project_type: (b.projectType || '').trim(),
    bid_date:     (b.bidDate     || '').trim(),
    notes:        (b.notes       || '').trim(),
    source:       'prestigefenceusa.com',
    submitted_at: new Date().toISOString(),
  };

  if (!lead.company || !lead.name || !lead.email || !lead.phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const zapRes = await fetch(ZAPIER_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    });
    if (!zapRes.ok) throw new Error(`Zapier returned ${zapRes.status}`);
  } catch (err) {
    console.error('Zapier webhook failed:', err.message);
  }

  res.status(200).json({ ok: true });
};
