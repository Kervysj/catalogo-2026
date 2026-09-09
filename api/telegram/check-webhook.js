// Vercel Serverless Function: POST /api/telegram/check-webhook
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

  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ ok: false, error: 'Token de Telegram requerido' });
  }

  try {
    const [botInfoRes, webhookInfoRes] = await Promise.all([
      fetch(`https://api.telegram.org/bot${token}/getMe`).then((r) => r.json()),
      fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((r) => r.json()),
    ]);

    return res.status(200).json({
      ok: true,
      bot: botInfoRes,
      webhook: webhookInfoRes,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error al contactar los servidores de Telegram',
    });
  }
}
