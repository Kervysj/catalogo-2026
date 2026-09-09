// Vercel Serverless Function: POST /api/telegram/set-webhook
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { token, webhookUrl } = req.body || {};
  if (!token || !webhookUrl) {
    return res.status(400).json({ ok: false, error: 'Token y webhookUrl requeridos' });
  }

  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        drop_pending_updates: true,
        max_connections: 40,
      }),
    }).then((r) => r.json());

    return res.status(200).json(resp);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error al configurar webhook en Telegram',
    });
  }
}
