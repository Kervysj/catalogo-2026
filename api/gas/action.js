// Vercel Serverless Function: POST /api/gas/action
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const gasUrl = req.body?.url || 'https://script.google.com/macros/s/AKfycbx5cDJiQKm9mbqwf-WDGfMNb6WjYEhJMiaRawRRqZkiA4Gpj7ohg5VFiyCTMsKeo461Ng/exec';
  const payload = req.body?.payload || req.body;

  try {
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch {
      return res.status(200).json({ ok: true, raw: text });
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error al enviar acción a Google Apps Script',
    });
  }
}
