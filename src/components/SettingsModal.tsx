import React, { useState } from 'react';
import { X, Save, Settings, Link2, Github, Send, RefreshCw, CheckCircle2, AlertCircle, AlertTriangle, FileCode, ExternalLink, HelpCircle, RotateCcw, Upload, Eye, EyeOff, ShieldCheck, Lock } from 'lucide-react';
import { AppSettings } from '../types';
import { DEFAULT_GAS_URL } from '../data/mockData';
import { fetchGasCatalog, sanitizeGasUrl } from '../utils/gasClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onOpenCodeModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onOpenCodeModal,
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [testingGas, setTestingGas] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showGithubGuide, setShowGithubGuide] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [testingToken, setTestingToken] = useState(false);
  const [tokenTestResult, setTokenTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [syncingGithub, setSyncingGithub] = useState(false);
  const [githubSyncResult, setGithubSyncResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Sync formData whenever settings changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData({ ...settings });
      setTestResult(null);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleTestGasConnection = async () => {
    setTestingGas(true);
    setTestResult(null);

    const cleanUrl = sanitizeGasUrl(formData.gasUrl);
    if (!cleanUrl) {
      setTestResult({
        ok: false,
        msg: 'Por favor ingresa la URL de tu Google Apps Script.',
      });
      setTestingGas(false);
      return;
    }

    try {
      const data = await fetchGasCatalog(cleanUrl);

      if (data && (data.ok !== undefined || Array.isArray(data.productos))) {
        const prodCount = data.productos?.length || 0;
        const tasa = data.configuracion?.tasa_usd;
        setTestResult({
          ok: true,
          msg: `¡Conexión Exitosa! Se detectaron ${prodCount} productos en tu hoja de Google${tasa ? ` y tasa de ${tasa} Bs/USD` : ''}.`,
        });
        setFormData((prev) => ({ ...prev, gasUrl: cleanUrl }));
        return;
      }

      setTestResult({
        ok: false,
        msg: data.error || 'La URL no devolvió datos JSON válidos. Revisa que en Google Apps Script en "Gestionar implementaciones" el acceso esté en "Cualquier usuario" (Anyone).',
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        msg: err.message || 'Error de conexión con la URL ingresada.',
      });
    } finally {
      setTestingGas(false);
    }
  };

  const handleSyncToGithub = async () => {
    if (!formData.github.token) {
      setGithubSyncResult({
        ok: false,
        msg: "Por favor introduce tu Personal Access Token de GitHub arriba.",
      });
      return;
    }

    setSyncingGithub(true);
    setGithubSyncResult(null);

    try {
      const resp = await fetch('/api/github/sync-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: formData.github.token.trim(),
          owner: formData.github.owner?.trim() || 'Kervysj',
          repo: formData.github.repo?.trim() || 'admin-catalogo',
          branch: formData.github.branch?.trim() || 'main',
        }),
      });

      const data = await resp.json();
      if (data.ok) {
        setGithubSyncResult({
          ok: true,
          msg: "¡Éxito total! Se actualizaron los archivos en GitHub. Vercel ya está compilando automáticamente y estará listo en unos 30 segundos.",
        });
      } else {
        setGithubSyncResult({
          ok: false,
          msg: data.error || data.message || 'Error al conectar con GitHub. Verifica que el token tenga permiso "repo".',
        });
      }
    } catch (err: any) {
      setGithubSyncResult({
        ok: false,
        msg: err.message || 'Error al enviar petición de sincronización a GitHub.',
      });
    } finally {
      setSyncingGithub(false);
    }
  };

  const handleTestGithubToken = async () => {
    const token = formData.github.token?.trim();
    if (!token) {
      setTokenTestResult({ ok: false, msg: 'Introduce tu token de GitHub arriba.' });
      return;
    }
    setTestingToken(true);
    setTokenTestResult(null);
    try {
      const resp = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (resp.ok) {
        const userData = await resp.json();
        setTokenTestResult({
          ok: true,
          msg: `¡Token Válido! Conectado con GitHub como @${userData.login}. Las fotos se subirán automáticamente.`,
        });
        if (!formData.github.owner) {
          setFormData((prev) => ({
            ...prev,
            github: { ...prev.github, owner: userData.login },
          }));
        }
      } else {
        const err = await resp.json().catch(() => ({}));
        setTokenTestResult({
          ok: false,
          msg: err.message || 'Token inválido o expirado. Genera uno nuevo con permiso "repo".',
        });
      }
    } catch (err: any) {
      setTokenTestResult({
        ok: false,
        msg: 'Error al verificar con la API de GitHub: ' + err.message,
      });
    } finally {
      setTestingToken(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSettings: AppSettings = {
      ...formData,
      gasUrl: sanitizeGasUrl(formData.gasUrl),
    };
    try {
      localStorage.setItem('catalog_admin_settings', JSON.stringify(cleanSettings));
    } catch (err) {
      console.warn('Error saving to localStorage:', err);
    }
    onSaveSettings(cleanSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Settings className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Configuración del Sistema
              </h2>
              <p className="text-xs text-slate-500">
                Enlaces a Google Apps Script, GitHub para fotos y Telegram
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="overflow-y-auto px-5 py-4 space-y-5 flex-1 text-xs">
          {/* Google Sheets Apps Script URL */}
          <div className="space-y-2">
            <label className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-emerald-600" />
              <span>URL de Implementación de Google Apps Script (Web App)</span>
            </label>
            <input
              id="input-settings-gas-url"
              type="url"
              required
              value={formData.gasUrl}
              onChange={(e) => setFormData({ ...formData, gasUrl: e.target.value })}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Debe terminar en <code className="font-bold">/exec</code>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, gasUrl: DEFAULT_GAS_URL });
                    setTestResult(null);
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="Restaurar a la URL completa verificada de tu Apps Script"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restaurar URL</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestGasConnection}
                  disabled={testingGas}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {testingGas ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                  <span>Probar Conexión</span>
                </button>
              </div>
            </div>

            {/* Quick link to see and copy the script */}
            {onOpenCodeModal && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
                  <FileCode className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-[11px]">¿Necesitas el código para pegarlo en Google Sheets?</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCodeModal();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 transition cursor-pointer shrink-0"
                >
                  Ver Código Script
                </button>
              </div>
            )}

            {testResult && (
              <div
                className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}
              >
                {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span className="leading-snug">{testResult.msg}</span>
              </div>
            )}
          </div>

          {/* GitHub Config */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Github className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                <span>Configuración de GitHub (Para fotos del catálogo)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowGithubGuide(!showGithubGuide)}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showGithubGuide ? 'Ocultar Guía' : '¿Cómo obtener el Token?'}</span>
              </button>
            </div>

            {showGithubGuide && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                <p className="font-bold text-slate-900 dark:text-white">
                  Pasos rápidos para tu Personal Access Token:
                </p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>
                    Haz clic en{' '}
                    <a
                      href="https://github.com/settings/tokens/new?description=Catalogo+Admin+PWA&scopes=repo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 font-bold underline inline-flex items-center gap-0.5"
                    >
                      Abrir Generador de Token en GitHub
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>{' '}
                    (ya viene con la casilla <strong>repo</strong> seleccionada).
                  </li>
                  <li>Baja hasta el final y haz clic en el botón verde <strong>"Generate token"</strong>.</li>
                  <li>Copia el código que empieza por <code>ghp_...</code> y pégalo en la casilla de abajo.</li>
                </ol>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-blue-600" />
                    <span>Personal Access Token de GitHub (PAT)</span>
                  </label>
                  <a
                    href="https://github.com/settings/tokens/new?description=Catalogo+Admin+PWA&scopes=repo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Crear token en GitHub</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={formData.github.token || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        github: { ...formData.github, token: e.target.value.trim() },
                      })
                    }
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                    title={showToken ? 'Ocultar token' : 'Mostrar token'}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Sub-actions & Security Notice */}
                <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Guardado seguro en este dispositivo (localStorage)
                  </span>
                  <button
                    type="button"
                    onClick={handleTestGithubToken}
                    disabled={testingToken || !formData.github.token}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-blue-600 dark:text-blue-400 transition flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    {testingToken ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Verificando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verificar Token</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Token Test Result Feedback */}
                {tokenTestResult && (
                  <div
                    className={`mt-2 p-2 rounded-lg text-[11px] font-medium flex items-center gap-2 ${
                      tokenTestResult.ok
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {tokenTestResult.ok ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                    )}
                    <span>{tokenTestResult.msg}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Usuario o Dueño (Owner)
                </label>
                <input
                  type="text"
                  value={formData.github.owner}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      github: { ...formData.github, owner: e.target.value },
                    })
                  }
                  placeholder="Ej: tu-usuario"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nombre del Repositorio
                </label>
                <input
                  type="text"
                  value={formData.github.repo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      github: { ...formData.github, repo: e.target.value },
                    })
                  }
                  placeholder="Ej: catalogo-fotos"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Rama (Branch)
                </label>
                <input
                  type="text"
                  value={formData.github.branch || 'main'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      github: { ...formData.github, branch: e.target.value },
                    })
                  }
                  placeholder="main"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Carpeta de destino
                </label>
                <input
                  type="text"
                  value={formData.github.folder || 'productos'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      github: { ...formData.github, folder: e.target.value },
                    })
                  }
                  placeholder="productos"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Botón Sincronizador Automático a GitHub / Vercel */}
            <div className="p-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold flex items-center gap-1.5 text-white">
                    <span>🚀 Actualizar mi Repositorio en GitHub</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-mono">Vercel</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Sube las nuevas rutas y correcciones directo a tu GitHub para que Vercel se actualice solo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncToGithub}
                  disabled={syncingGithub || !formData.github.token}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {syncingGithub ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sincronizando...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Sincronizar a GitHub</span>
                    </>
                  )}
                </button>
              </div>

              {githubSyncResult && (
                <div
                  className={`p-2 rounded-lg text-[11px] font-medium flex items-center gap-2 ${
                    githubSyncResult.ok
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                  }`}
                >
                  {githubSyncResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{githubSyncResult.msg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Telegram Config */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Send className="w-4 h-4 text-sky-600" />
              <span>Bot de Telegram (Token)</span>
            </label>
            <div>
              <input
                type="password"
                value={formData.telegram.botToken}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    telegram: { ...formData.telegram, botToken: e.target.value },
                  })
                }
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ (de @BotFather)"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Se utiliza para verificar y diagnosticar el estado del Webhook en tiempo real.
              </span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            id="btn-guardar-configuracion"
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Ajustes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
