/**
 * Cliente de conexión robusto para Google Apps Script
 * Diseñado para funcionar tanto directamente en cliente (SPA estática en Vercel, PWA)
 * como a través de proxies locales o Serverless Functions.
 */

export interface GasCatalogResponse {
  ok: boolean;
  productos?: any[];
  configuracion?: {
    tasa_usd: number;
    tasa_activa: boolean;
    ultima_actualizacion: string;
    horas_desde_actualizacion: number;
    vigencia_horas: number;
    mensaje: string;
  };
  error?: string;
}

export function sanitizeGasUrl(url: string): string {
  if (!url) return '';
  let clean = url.trim().replace(/[\r\n\t]/g, '').replace(/["']/g, '');
  if (clean.endsWith('/edit') || clean.endsWith('/view')) {
    clean = clean.replace(/\/(edit|view).*$/, '/exec');
  }
  // Asegurar que si es una URL de macros/s/ termine en /exec
  if (clean.includes('script.google.com/macros/s/') && !clean.endsWith('/exec')) {
    clean = clean.replace(/\/+$/, '') + '/exec';
  }
  return clean;
}

/**
 * Obtiene el catálogo y configuración de Google Sheets
 * Prioriza la conexión directa (sin pasar por servidor proxy) para evitar errores 404 en Vercel.
 */
export async function fetchGasCatalog(rawUrl: string): Promise<GasCatalogResponse> {
  const cleanUrl = sanitizeGasUrl(rawUrl);
  if (!cleanUrl) {
    throw new Error('No se ha configurado la URL de Google Apps Script');
  }

  // 1. INTENTO DIRECTO: Fetch directo simple a Google Apps Script (Ideal para Vercel SPA y PWA)
  // NOTA: NO enviar cabeceras personalizadas para evitar que el navegador envíe preflight OPTIONS
  try {
    const directResp = await fetch(cleanUrl, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
    });

    if (directResp.ok) {
      const text = await directResp.text();
      try {
        const data = JSON.parse(text);
        if (data && (data.ok !== undefined || Array.isArray(data.productos))) {
          return data;
        }
      } catch {
        // Detectar si devolvió una página HTML de Google en vez de JSON
        if (
          text.includes('The page cannot be found') ||
          text.includes('No se ha encontrado la página') ||
          text.includes('<html') ||
          text.includes('Google Drive')
        ) {
          throw new Error(
            "La URL devolvió una página de Google en vez de datos JSON. Verifica que en Google Apps Script en 'Gestionar implementaciones' el acceso esté configurado en 'Cualquier usuario' (Anyone)."
          );
        }
      }
    }
  } catch (directErr: any) {
    if (directErr.message && directErr.message.includes('Gestionar implementaciones')) {
      throw directErr;
    }
    console.info('Conexión directa no completada, intentando vía endpoint proxy...', directErr);
  }

  // 2. INTENTO VÍA PROXY / SERVERLESS: Si la petición directa falla por CORS, recurrir a /api/gas/catalog
  try {
    const proxyResp = await fetch(`/api/gas/catalog?url=${encodeURIComponent(cleanUrl)}`);
    if (proxyResp.ok) {
      const data = await proxyResp.json();
      if (data && (data.ok !== undefined || Array.isArray(data.productos))) {
        return data;
      }
    }
  } catch (proxyErr) {
    console.warn('Proxy local/serverless no disponible:', proxyErr);
  }

  throw new Error(
    'No se pudo conectar con Google Apps Script. Revisa que la URL sea válida, termine en /exec y tenga permisos públicos.'
  );
}

/**
 * Ejecuta una acción en Google Apps Script (actualizar tasa, crear/editar/eliminar producto)
 * Utiliza múltiples estrategias compatibles con Vercel y navegadores móviles.
 */
export async function executeGasAction(rawUrl: string, payload: any): Promise<{ ok: boolean; [key: string]: any }> {
  const cleanUrl = sanitizeGasUrl(rawUrl);
  if (!cleanUrl) {
    throw new Error('URL de Google Apps Script no configurada');
  }

  // Estrategia 1: Envío directo con POST y Content-Type text/plain
  // (text/plain evita la petición preflight OPTIONS que Google Apps Script rechazaría)
  try {
    const postResp = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (postResp.ok) {
      const text = await postResp.text();
      try {
        const json = JSON.parse(text);
        return json;
      } catch {
        return { ok: true, raw: text };
      }
    }
  } catch (postErr) {
    console.info('POST directo bloqueado por CORS/redirect, probando métodos alternativos...');
  }

  // Estrategia 2: Envío directo mediante GET con parámetros codificados
  // (Los GET en Apps Script siempre devuelven JSON sin problemas de preflight)
  try {
    const getUrl = new URL(cleanUrl);
    getUrl.searchParams.set('action', payload.action || 'accion');
    getUrl.searchParams.set('payload', JSON.stringify(payload));
    if (payload.tasa !== undefined) {
      getUrl.searchParams.set('tasa', String(payload.tasa));
    }

    const getResp = await fetch(getUrl.toString(), {
      method: 'GET',
      mode: 'cors',
    });

    if (getResp.ok) {
      const text = await getResp.text();
      try {
        const json = JSON.parse(text);
        if (json && json.ok) {
          return json;
        }
      } catch {
        // Continuar si no parseó
      }
    }
  } catch (getErr) {
    console.info('GET alternativo no soportado por el script desplegado...');
  }

  // Estrategia 3: Intento mediante proxy /api/gas/action (Vercel Serverless o Express local)
  try {
    const proxyResp = await fetch('/api/gas/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: cleanUrl,
        payload,
      }),
    });

    if (proxyResp.ok) {
      const data = await proxyResp.json();
      return data;
    }
  } catch (proxyErr) {
    console.warn('Proxy /api/gas/action no disponible.');
  }

  // Estrategia 4 (Garantía PWA): Envío con mode no-cors
  // La petición llega a Google Apps Script y se ejecuta en la hoja, aunque el navegador no pueda leer la respuesta
  try {
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
    return { ok: true, modo: 'no-cors' };
  } catch (noCorsErr: any) {
    throw new Error('Fallo al sincronizar con Google Apps Script: ' + (noCorsErr.message || 'Error de red'));
  }
}
