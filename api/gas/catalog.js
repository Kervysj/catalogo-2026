// Vercel Serverless Function: GET /api/gas/catalog
export default async function handler(req, res) {
  // Configurar cabeceras CORS
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

  const gasUrl = req.query.url;
  if (!gasUrl || typeof gasUrl !== 'string') {
    return res.status(400).json({ ok: false, error: 'Parámetro url es requerido' });
  }

  try {
    const response = await fetch(gasUrl, {
      headers: { Accept: 'application/json' },
      redirect: 'follow',
    });

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return res.status(200).json(data);
    } catch {
      if (
        text.includes('The page cannot be found') ||
        text.includes('No se ha encontrado la página') ||
        text.includes('<html') ||
        text.includes('Google Drive')
      ) {
        return res.status(400).json({
          ok: false,
          error:
            "La URL devolvió una página web de Google en vez de datos JSON. Verifica que termine en /exec y que en 'Gestionar implementaciones' el acceso esté en 'Cualquier usuario'.",
        });
      }
      return res.status(400).json({
        ok: false,
        error: `Respuesta no es JSON válido: ${text.substring(0, 100)}...`,
      });
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error al conectar con Google Apps Script',
    });
  }
}
