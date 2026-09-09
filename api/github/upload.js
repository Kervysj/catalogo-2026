// Vercel Serverless Function: POST /api/github/upload
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

  const { token, owner, repo, branch, path: filePath, content, message } = req.body || {};

  if (!token || !owner || !repo || !filePath || !content) {
    return res.status(400).json({
      ok: false,
      error: 'Faltan parámetros requeridos (token, owner, repo, path, content)',
    });
  }

  const cleanBranch = branch || 'main';
  const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`;

  try {
    let sha = undefined;
    try {
      const getFileResp = await fetch(`${apiUrl}?ref=${cleanBranch}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Admin-Catalogo-App',
        },
      });
      if (getFileResp.ok) {
        const fileData = await getFileResp.json();
        sha = fileData.sha;
      }
    } catch {
      // Archivo nuevo, no tiene sha previo
    }

    const uploadBody = {
      message: message || `Subir imagen ${cleanPath} desde Admin Catálogo`,
      content,
      branch: cleanBranch,
    };
    if (sha) {
      uploadBody.sha = sha;
    }

    const putResp = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Admin-Catalogo-App',
      },
      body: JSON.stringify(uploadBody),
    });

    const putResult = await putResp.json();

    if (!putResp.ok) {
      return res.status(putResp.status).json({
        ok: false,
        error: putResult.message || 'Error al subir a GitHub API',
      });
    }

    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${cleanBranch}/${cleanPath}`;
    const cdnUrl = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${cleanBranch}/${cleanPath}`;

    return res.status(200).json({
      ok: true,
      url: cdnUrl,
      rawUrl,
      githubData: putResult,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error al procesar la subida a GitHub',
    });
  }
}
