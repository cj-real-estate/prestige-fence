// Vercel serverless function — receives job applications from prestigefenceusa.com/careers
// Forwards applicant data to Zapier. Payload includes form_type: 'job_application'
// so the Zap can branch it away from estimate requests.

const ZAPIER_WEBHOOK = 'https://hooks.zapier.com/hooks/catch/28068299/42wahe7/';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const b = req.body || {};
  const applicant = {
    form_type:    'job_application',
    name:         (b.name       || '').trim(),
    phone:        (b.phone      || '').trim(),
    email:        (b.email      || '').trim(),
    position:     (b.position   || '').trim(),
    experience:   (b.experience || '').trim(),
    city:         (b.city       || '').trim(),
    notes:        (b.notes      || '').trim(),
    source:       'prestigefenceusa.com/careers',
    submitted_at: new Date().toISOString(),
  };

  if (!applicant.name || !applicant.phone || !applicant.email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const zapRes = await fetch(ZAPIER_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applicant),
    });
    if (!zapRes.ok) throw new Error(`Zapier returned ${zapRes.status}`);
  } catch (err) {
    console.error('Zapier webhook failed:', err.message);
  }

  res.status(200).json({ ok: true });
};
