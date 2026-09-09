import React, { useState } from 'react';
import { Send, AlertTriangle, CheckCircle2, RefreshCw, HelpCircle, ExternalLink, ShieldAlert, Sparkles, ArrowRight, Copy, Check } from 'lucide-react';
import { TelegramConfig } from '../types';

interface TelegramTroubleshooterProps {
  currentGasUrl: string;
  telegramConfig: TelegramConfig;
  onUpdateTelegramConfig: (cfg: TelegramConfig) => void;
}

export const TelegramTroubleshooter: React.FC<TelegramTroubleshooterProps> = ({
  currentGasUrl,
  telegramConfig,
  onUpdateTelegramConfig,
}) => {
  const [tokenInput, setTokenInput] = useState(telegramConfig.botToken || '');
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [loadingSetWebhook, setLoadingSetWebhook] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(label);
    setTimeout(() => setCopiedStep(null), 2500);
  };

  const checkTelegramStatus = async () => {
    if (!tokenInput.trim()) {
      setErrorMsg('Por favor ingresa tu Token del bot de Telegram (de @BotFather)');
      return;
    }

    setLoadingCheck(true);
    setErrorMsg(null);
    setDiagnosticResult(null);

    try {
      const resp = await fetch('/api/telegram/check-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() }),
      });
      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo contactar a Telegram con ese Token');
      }

      setDiagnosticResult(data);
      onUpdateTelegramConfig({
        ...telegramConfig,
        botToken: tokenInput.trim(),
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al verificar con Telegram');
    } finally {
      setLoadingCheck(false);
    }
  };

  const setWebhookDirectly = async () => {
    if (!tokenInput.trim()) {
      setErrorMsg('Ingresa tu Token de Telegram primero');
      return;
    }

    setLoadingSetWebhook(true);
    setErrorMsg(null);

    try {
      const resp = await fetch('/api/telegram/set-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenInput.trim(),
          webhookUrl: currentGasUrl.trim(),
        }),
      });
      const data = await resp.json();

      if (!data.ok) {
        throw new Error(data.description || 'Telegram rechazó la URL del Webhook');
      }

      // Refresh check
      await checkTelegramStatus();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al configurar Webhook');
    } finally {
      setLoadingSetWebhook(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
            <Send className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Diagnóstico & Reparación del Bot de Telegram
            </h2>
            <p className="text-xs text-slate-500">
              Solución exacta al error mostrado en tus capturas de Google Apps Script
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold self-start sm:self-auto">
          <AlertTriangle className="w-3.5 h-3.5" />
          Prioridad #1
        </span>
      </div>

      {/* Explicación de la Causa Raíz Detectada en tus Imágenes */}
      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3">
        <h3 className="text-xs font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          ¿Por qué te sale error y no responde tu Bot? (Diagnóstico de tus imágenes)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
            <span className="font-bold text-rose-600 dark:text-rose-400 block mb-1">
              ❌ 1. URL Vieja Registrada en Telegram:
            </span>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              En tu <strong>Captura 1</strong> (Registro de ejecución), Telegram reporta:
              <br />
              <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px] break-all">
                ...AKfycbz_qzzzwFK6szGI5zZRHoy...
              </code>
              <br />
              Pero tu nueva versión en <strong>Captura 2</strong> es:
              <br />
              <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px] break-all">
                ...AKfycbzajBZ9Omedm3AybJ6g3n6Fjb...
              </code>
              <br />
              ¡Telegram sigue enviando los mensajes al código anterior archivado!
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
            <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">
              ⚠️ 2. Falta ejecutar configurarWebhook:
            </span>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              En Apps Script ejecutaste <code className="font-semibold text-slate-800 dark:text-slate-200">verificarWebhookTelegram</code> (que solo consulta), pero <strong>NO</strong> ejecutaste <code className="font-semibold text-blue-600">configurarWebhookTelegram</code>. Cada vez que cambias la URL o creas una nueva implementación, debes ejecutar la función de configurar para que Telegram la guarde.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
            <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">
              🔑 3. Permiso "Cualquier persona":
            </span>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              En "Gestionar implementaciones", <strong>Quién tiene acceso</strong> debe ser <em>"Cualquier usuario"</em> (Anyone). Si está en "Solo yo", Telegram recibe un bloqueo 302 y no puede entregar los mensajes.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
              👑 4. Registrarte con /admin:
            </span>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              Tu código tiene seguridad: si no envías <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono font-bold">/admin</code> la primera vez, el bot te dice <em>"🔒 No tienes permisos"</em>. Debes enviarle <code className="font-bold">/admin</code> desde tu chat en Telegram.
            </p>
          </div>
        </div>
      </div>

      {/* Probador y Reparador Automático de Webhook */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Reparar Webhook Directamente desde aquí
            </h3>
            <p className="text-xs text-slate-500">
              Puedes vincular tu Telegram a la URL activa sin tocar la consola de Apps Script
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Token de tu Bot de Telegram:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="input-telegram-token"
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ (de @BotFather)"
                className="flex-1 text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
              <button
                type="button"
                onClick={checkTelegramStatus}
                disabled={loadingCheck}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                {loadingCheck ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Verificar Estado en Telegram</span>
              </button>
            </div>
          </div>

          {/* URL Destino del Webhook */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">URL de destino actual:</span>
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate block">
                {currentGasUrl}
              </span>
            </div>
            <button
              id="btn-actualizar-webhook-telegram"
              type="button"
              onClick={setWebhookDirectly}
              disabled={loadingSetWebhook || !tokenInput}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              {loadingSetWebhook ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>Vincular Webhook a Esta URL</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Resultados del Diagnóstico */}
          {diagnosticResult && (
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Conexión con Telegram Exitosa
                </span>
                <span className="text-xs text-slate-400">
                  Bot: @{diagnosticResult.bot?.result?.username || 'Desconocido'} ({diagnosticResult.bot?.result?.first_name})
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-slate-400 shrink-0">Webhook URL actual en Telegram:</span>
                  <span className={`font-mono break-all ${
                    diagnosticResult.webhook?.result?.url === currentGasUrl
                      ? 'text-emerald-400 font-bold'
                      : 'text-amber-400 font-bold'
                  }`}>
                    {diagnosticResult.webhook?.result?.url || 'Ninguno (sin webhook)'}
                  </span>
                </div>

                {diagnosticResult.webhook?.result?.url !== currentGasUrl && (
                  <div className="p-2 bg-amber-950/60 border border-amber-800 rounded-lg text-amber-300 text-[11px]">
                    ⚠️ ¡Atención! La URL registrada en Telegram no coincide con tu Web App activa. Haz clic arriba en <strong>"Vincular Webhook a Esta URL"</strong> para solucionarlo.
                  </div>
                )}

                <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-400">
                  <span>Mensajes pendientes: {diagnosticResult.webhook?.result?.pending_update_count ?? 0}</span>
                  {diagnosticResult.webhook?.result?.last_error_message && (
                    <span className="text-rose-400">
                      Último error: {diagnosticResult.webhook?.result?.last_error_message}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guía Paso a Paso para Google Apps Script */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Pasos Exactos para corregirlo en Google Apps Script (si prefieres hacerlo manual)
        </h3>

        <ol className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
          <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-xs">1</span>
            <div className="space-y-1">
              <span className="font-semibold text-slate-900 dark:text-white block">
                Pega la URL de tu implementación en la variable TELEGRAM_WEBHOOK_URL
              </span>
              <p className="text-slate-500">
                En el código de Google Apps Script, verifica que la variable <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[11px]">var TELEGRAM_WEBHOOK_URL</code> tenga exactamente la URL de tu Web App activa terminada en <code className="font-bold">/exec</code>.
              </p>
            </div>
          </li>

          <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-xs">2</span>
            <div className="space-y-1">
              <span className="font-semibold text-slate-900 dark:text-white block">
                Selecciona la función "configurarWebhookTelegram" y presiona "Ejecutar"
              </span>
              <p className="text-slate-500">
                En la barra superior de Apps Script (al lado del botón Depuración), cambia la función desplegable de <code className="text-slate-700 dark:text-slate-300 font-semibold">verificarWebhookTelegram</code> a <code className="text-blue-600 dark:text-blue-400 font-bold">configurarWebhookTelegram</code> y haz clic en <strong>Ejecutar</strong>. Esto le enviará la nueva URL a Telegram.
              </p>
            </div>
          </li>

          <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-xs">3</span>
            <div className="space-y-1">
              <span className="font-semibold text-slate-900 dark:text-white block">
                Ve a Telegram y envía el comando /admin
              </span>
              <p className="text-slate-500">
                Abre el chat con tu Bot en Telegram y escribe <code className="font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded">/admin</code>. El bot responderá: <em>"👑 Administrador configurado correctamente. Usa /menu para cambiar la tasa USD"</em>.
              </p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
};
