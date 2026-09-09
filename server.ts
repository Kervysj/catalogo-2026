import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parser for request bodies
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // API Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Proxy to fetch Google Apps Script catalog (avoids CORS issues in browser)
  app.get("/api/gas/catalog", async (req, res) => {
    const rawUrl = (req.query.url as string) || "https://script.google.com/macros/s/AKfycbx5cDJiQKm9mbqwf-WDGfMNb6WjYEhJMiaRawRRqZkiA4Gpj7ohg5VFiyCTMsKeo461Ng/exec";
    const gasUrl = rawUrl.trim();

    if (!gasUrl.startsWith("http")) {
      return res.status(400).json({
        ok: false,
        error: "URL inválida. Debe comenzar con https://script.google.com/...",
      });
    }

    try {
      const response = await fetch(gasUrl, {
        headers: { Accept: "application/json" },
        redirect: "follow",
      });

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        return res.json(data);
      } catch {
        if (text.includes("The page cannot be found") || text.includes("No se ha encontrado la página") || text.includes("<html") || text.includes("Google Drive")) {
          return res.status(400).json({
            ok: false,
            error: "La URL devolvió una página web de Google en vez de datos JSON. Verifica que la URL esté completa (debe terminar en /exec) y que en 'Gestionar implementaciones' el acceso esté en 'Cualquier usuario'.",
          });
        }
        return res.status(400).json({
          ok: false,
          error: `Respuesta no es JSON válido: ${text.substring(0, 100)}...`,
        });
      }
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || "Error al conectar con Google Apps Script",
      });
    }
  });

  // Proxy to execute Google Apps Script actions (e.g. update tasa, add/edit product)
  app.post("/api/gas/action", async (req, res) => {
    const gasUrl = (req.body.url as string) || "https://script.google.com/macros/s/AKfycbx5cDJiQKm9mbqwf-WDGfMNb6WjYEhJMiaRawRRqZkiA4Gpj7ohg5VFiyCTMsKeo461Ng/exec";
    const payload = req.body.payload;

    try {
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
        redirect: "follow",
      });

      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return res.json(json);
      } catch {
        return res.json({ ok: true, raw: text });
      }
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || "Error al enviar acción a Google Apps Script",
      });
    }
  });

  // Telegram webhook diagnostic endpoint
  app.post("/api/telegram/check-webhook", async (req, res) => {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ ok: false, error: "Token de Telegram requerido" });
    }

    try {
      const [botInfoRes, webhookInfoRes] = await Promise.all([
        fetch(`https://api.telegram.org/bot${token}/getMe`).then((r) => r.json()),
        fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((r) => r.json()),
      ]);

      return res.json({
        ok: true,
        bot: botInfoRes,
        webhook: webhookInfoRes,
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || "Error al contactar los servidores de Telegram",
      });
    }
  });

  // Endpoint to set Telegram Webhook directly
  app.post("/api/telegram/set-webhook", async (req, res) => {
    const { token, webhookUrl } = req.body;
    if (!token || !webhookUrl) {
      return res.status(400).json({ ok: false, error: "Token y webhookUrl requeridos" });
    }

    try {
      const resp = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          drop_pending_updates: true,
          max_connections: 40,
        }),
      }).then((r) => r.json());

      return res.json(resp);
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || "Error al configurar webhook en Telegram",
      });
    }
  });

  // GitHub Image Upload Proxy / Helper
  app.post("/api/github/upload", async (req, res) => {
    const { token, owner, repo, branch, path: filePath, content, message } = req.body;

    if (!token || !owner || !repo || !filePath || !content) {
      return res.status(400).json({
        ok: false,
        error: "Faltan parámetros requeridos (token, owner, repo, path, content en base64)",
      });
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const cleanBranch = branch || "main";

    try {
      // Check if file exists first to get sha if updating
      let sha: string | undefined;
      const checkRes = await fetch(`${apiUrl}?ref=${cleanBranch}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Catalogo-Admin-PWA",
        },
      });

      if (checkRes.ok) {
        const checkData = (await checkRes.json()) as { sha?: string };
        sha = checkData.sha;
      }

      const bodyPayload: any = {
        message: message || `Subir imagen de catálogo: ${filePath}`,
        content: content.replace(/^data:image\/[a-z]+;base64,/, ""),
        branch: cleanBranch,
      };
      if (sha) {
        bodyPayload.sha = sha;
      }

      const uploadRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "Catalogo-Admin-PWA",
        },
        body: JSON.stringify(bodyPayload),
      });

      const uploadData: any = await uploadRes.json();

      if (!uploadRes.ok) {
        return res.status(uploadRes.status).json({
          ok: false,
          error: uploadData.message || "Error al subir imagen a GitHub",
          details: uploadData,
        });
      }

      // Compute public CDN URLs
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${cleanBranch}/${filePath}`;
      const jsDelivrUrl = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${cleanBranch}/${filePath}`;

      return res.json({
        ok: true,
        url: jsDelivrUrl, // jsDelivr has global CDN caching and fast load
        rawUrl: rawUrl,
        github: uploadData,
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || "Error al conectar con la API de GitHub",
      });
    }
  });

  // Sincronizador Automático de Proyecto a GitHub para Vercel
  app.post("/api/github/sync-project", async (req, res) => {
    const { token, owner, repo, branch } = req.body;

    if (!token || !owner || !repo) {
      return res.status(400).json({
        ok: false,
        error: "Se requiere GitHub Token, Owner (Kervysj) y Repo (admin-catalogo)",
      });
    }

    const cleanBranch = branch || "main";
    const filesToSync = [
      "vercel.json",
      "package.json",
      "vite.config.ts",
      "server.ts",
      "api/gas/catalog.js",
      "api/gas/action.js",
      "api/telegram/check-webhook.js",
      "api/telegram/set-webhook.js",
      "api/github/upload.js",
      "src/types.ts",
      "src/data/mockData.ts",
      "src/utils/gasClient.ts",
      "src/utils/gasScriptTemplate.ts",
      "src/App.tsx",
      "src/components/SettingsModal.tsx",
      "src/components/ProductFormModal.tsx",
      "src/components/GitHubImageUploader.tsx",
      "src/components/ProductList.tsx",
      "src/components/TasaManager.tsx",
      "src/components/GoogleAppsScriptCodeModal.tsx",
      "src/components/TelegramTroubleshooter.tsx",
      "src/components/PWAInstallButton.tsx",
      "src/components/OfflineIndicator.tsx",
    ];

    const results: Array<{ path: string; status: string; error?: string }> = [];

    for (const relPath of filesToSync) {
      const fullPath = path.join(process.cwd(), relPath);
      if (!fs.existsSync(fullPath)) {
        continue;
      }

      try {
        const fileContent = fs.readFileSync(fullPath, "utf-8");
        const contentBase64 = Buffer.from(fileContent).toString("base64");
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${relPath}`;

        // Obtener SHA actual si el archivo ya existe en GitHub
        let sha: string | undefined;
        const checkRes = await fetch(`${apiUrl}?ref=${cleanBranch}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "Catalogo-Admin-PWA-Sync",
          },
        });

        if (checkRes.ok) {
          const checkData = (await checkRes.json()) as { sha?: string };
          sha = checkData.sha;
        }

        const putRes = await fetch(apiUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "Catalogo-Admin-PWA-Sync",
          },
          body: JSON.stringify({
            message: `Actualizar ${relPath} para soporte Vercel y Google Sheets`,
            content: contentBase64,
            branch: cleanBranch,
            ...(sha ? { sha } : {}),
          }),
        });

        if (putRes.ok) {
          results.push({ path: relPath, status: "updated" });
        } else {
          const errData: any = await putRes.json();
          results.push({ path: relPath, status: "error", error: errData.message || `HTTP ${putRes.status}` });
        }
      } catch (fErr: any) {
        results.push({ path: relPath, status: "error", error: fErr.message });
      }
    }

    const hasErrors = results.some((r) => r.status === "error");
    return res.json({
      ok: !hasErrors,
      results,
      message: hasErrors
        ? "Algunos archivos no se pudieron sincronizar. Revisa los permisos de tu token."
        : "¡Todos los archivos se sincronizaron con éxito en GitHub! Vercel desplegará automáticamente.",
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
