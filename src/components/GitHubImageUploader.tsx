import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  Image as ImageIcon,
  Link as LinkIcon,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Sparkles,
} from 'lucide-react';
import { GitHubConfig } from '../types';

interface GitHubImageUploaderProps {
  onImageUploaded: (url: string) => void;
  currentImageUrl?: string;
  githubConfig: GitHubConfig;
  onUpdateGithubConfig: (newConfig: GitHubConfig) => void;
}

export const GitHubImageUploader: React.FC<GitHubImageUploaderProps> = ({
  onImageUploaded,
  currentImageUrl,
  githubConfig,
  onUpdateGithubConfig,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfig, setShowConfig] = useState(!githubConfig.token);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Local draft config for settings
  const [localConfig, setLocalConfig] = useState<GitHubConfig>({
    token: githubConfig.token || '',
    owner: githubConfig.owner || 'Kervysj',
    repo: githubConfig.repo || 'catalogo-2026',
    branch: githubConfig.branch || 'main',
    folder: githubConfig.folder || 'CATEGORIAS',
  });

  // Keep local draft in sync if props change
  useEffect(() => {
    setLocalConfig({
      token: githubConfig.token || '',
      owner: githubConfig.owner || 'Kervysj',
      repo: githubConfig.repo || 'catalogo-2026',
      branch: githubConfig.branch || 'main',
      folder: githubConfig.folder || 'CATEGORIAS',
    });
    if (githubConfig.token) {
      setShowConfig(false);
    }
  }, [githubConfig]);

  // Core upload handler to GitHub
  const executeUpload = async (file: File, base64Preview: string, configToUse: GitHubConfig) => {
    if (!configToUse.token?.trim()) {
      setShowConfig(true);
      setErrorMessage('Ingresa tu Personal Access Token de GitHub para subir automáticamente.');
      return;
    }

    const token = configToUse.token.trim();
    const owner = (configToUse.owner || 'Kervysj').trim();
    const repo = (configToUse.repo || 'catalogo-2026').trim();
    const branch = (configToUse.branch || 'main').trim();
    const folder = configToUse.folder ? `${configToUse.folder.replace(/^\/+|\/+$/g, '')}/` : 'CATEGORIAS/';

    setIsUploading(true);
    setErrorMessage(null);
    setUploadSuccess(null);

    // Clean file name
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanBase = file.name
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');
    const timestamp = Date.now().toString().slice(-6);
    const fileName = `${cleanBase || 'producto'}-${timestamp}.${ext}`;
    const fullPath = `${folder}${fileName}`;

    // Extract base64 without prefix
    const base64Data = base64Preview.includes(',') ? base64Preview.split(',')[1] : base64Preview;

    try {
      let publicUrl = '';

      // Method A: Direct browser-to-GitHub API call (Fastest, full CORS support from api.github.com)
      try {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`;

        // Check if file exists to obtain SHA
        let sha: string | undefined;
        try {
          const checkRes = await fetch(`${apiUrl}?ref=${branch}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          });
          if (checkRes.ok) {
            const data = await checkRes.json();
            sha = data.sha;
          }
        } catch {
          // File does not exist yet
        }

        const putBody: any = {
          message: `Subir imagen producto ${fileName} desde Catálogo`,
          content: base64Data,
          branch,
        };
        if (sha) {
          putBody.sha = sha;
        }

        const putRes = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(putBody),
        });

        if (putRes.ok) {
          publicUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fullPath}`;
        } else {
          const errData = await putRes.json().catch(() => ({}));
          throw new Error(errData.message || `GitHub error ${putRes.status}`);
        }
      } catch (directErr: any) {
        console.warn('Direct GitHub upload attempt failed, trying server proxy fallback:', directErr);

        // Method B: Server proxy fallback
        const proxyResp = await fetch('/api/github/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            owner,
            repo,
            branch,
            path: fullPath,
            content: base64Data,
            message: `Subir imagen producto ${fileName}`,
          }),
        });

        const proxyData = await proxyResp.json();
        if (proxyResp.ok && proxyData.ok) {
          publicUrl = proxyData.rawUrl || proxyData.url;
        } else {
          throw new Error(proxyData.error || directErr.message || 'Error al comunicarse con GitHub');
        }
      }

      if (!publicUrl) {
        throw new Error('No se pudo generar la URL pública de la imagen en GitHub');
      }

      setUploadSuccess(publicUrl);
      onImageUploaded(publicUrl);
    } catch (err: any) {
      console.error('Error uploading image to GitHub:', err);
      setErrorMessage(
        err.message || 'Error al subir la imagen a GitHub. Verifica que tu token tenga permiso "repo".'
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Process file when selected or dropped
  const processFile = (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setUploadSuccess(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreviewUrl(dataUrl);

      // AUTO-UPLOAD: If credentials exist, trigger upload automatically
      if (githubConfig.token?.trim()) {
        await executeUpload(file, dataUrl, githubConfig);
      } else {
        setShowConfig(true);
        setErrorMessage('Ingresa tu Personal Access Token de GitHub para completar la subida automática.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      token: localConfig.token.trim(),
      owner: (localConfig.owner || 'Kervysj').trim(),
      repo: (localConfig.repo || 'catalogo-2026').trim(),
      branch: (localConfig.branch || 'main').trim(),
      folder: (localConfig.folder || 'CATEGORIAS').trim(),
    };

    try {
      const rawStored = localStorage.getItem('catalog_admin_settings');
      const current = rawStored ? JSON.parse(rawStored) : {};
      current.github = updated;
      localStorage.setItem('catalog_admin_settings', JSON.stringify(current));
    } catch {}

    onUpdateGithubConfig(updated);
    setShowConfig(false);

    // If file was already chosen, upload it now!
    if (selectedFile && previewUrl) {
      executeUpload(selectedFile, previewUrl, updated);
    }
  };

  const copyUrlToClipboard = () => {
    const url = uploadSuccess || currentImageUrl;
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 space-y-3">
      {/* Header status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <UploadCloud className="w-4 h-4" />
          </span>
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
              Subida Automática a GitHub
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
              Sube la foto y genera el enlace público para Google Sheets
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
        >
          <Key className="w-3.5 h-3.5" />
          <span>{showConfig ? 'Ocultar Token' : githubConfig.token ? 'Editar Token' : 'Configurar Token'}</span>
        </button>
      </div>

      {/* GitHub Credentials config form */}
      {showConfig && (
        <form
          onSubmit={handleSaveConfig}
          className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-2.5 shadow-xs"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>Token de GitHub para Guardar Fotos</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Se guarda de forma segura en tu navegador (<code>localStorage</code>) para que la app suba las fotos automáticamente.
              </p>
            </div>
            <a
              href="https://github.com/settings/tokens/new?description=Catalogo+Admin+PWA&scopes=repo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-0.5 shrink-0"
            >
              <span>Crear Token</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Personal Access Token (con permiso 'repo')
            </label>
            <div className="relative">
              <input
                type={showTokenInput ? 'text' : 'password'}
                required
                value={localConfig.token}
                onChange={(e) => setLocalConfig({ ...localConfig, token: e.target.value.trim() })}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full text-xs font-mono pl-3 pr-9 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowTokenInput(!showTokenInput)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
              >
                {showTokenInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Usuario (Owner)</label>
              <input
                type="text"
                value={localConfig.owner}
                onChange={(e) => setLocalConfig({ ...localConfig, owner: e.target.value })}
                placeholder="Kervysj"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Repositorio</label>
              <input
                type="text"
                value={localConfig.repo}
                onChange={(e) => setLocalConfig({ ...localConfig, repo: e.target.value })}
                placeholder="catalogo-2026"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Guardado en localStorage
            </span>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar Token y Usar</span>
            </button>
          </div>
        </form>
      )}

      {/* File Dropzone & Auto-Uploader */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center relative min-h-[120px] ${
            isDragOver
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40'
              : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-white dark:bg-slate-900/40'
          }`}
        >
          {isUploading ? (
            <div className="py-2 flex flex-col items-center gap-2">
              <RefreshCw className="w-7 h-7 text-blue-600 animate-spin" />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block">
                  Subiendo foto a GitHub...
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Generando enlace público para Google Sheets
                </span>
              </div>
            </div>
          ) : previewUrl ? (
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                <img
                  src={previewUrl}
                  alt="Vista previa"
                  className="h-24 w-24 object-cover rounded-xl shadow-xs border border-slate-200 dark:border-slate-700"
                />
                {uploadSuccess && (
                  <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white p-1 rounded-full shadow-xs">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {selectedFile?.name}
              </span>
              <span className="text-[11px] text-blue-600 hover:underline mt-0.5">
                Toca aquí si deseas cambiar la foto
              </span>
            </div>
          ) : currentImageUrl ? (
            <div className="flex flex-col items-center">
              <img
                src={currentImageUrl}
                alt="Actual"
                className="h-20 w-20 object-cover rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 mb-1.5"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Foto actual vinculada
              </span>
              <span className="text-[11px] text-blue-600 hover:underline mt-0.5">
                Toca para seleccionar o arrastrar una nueva foto
              </span>
            </div>
          ) : (
            <div className="py-2 flex flex-col items-center">
              <ImageIcon className="w-7 h-7 text-slate-400 group-hover:text-blue-500 mb-1.5 transition-colors" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Selecciona una foto o arrástrala aquí
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                Se subirá automáticamente a GitHub y colocará el enlace público
              </span>
            </div>
          )}
        </div>

        {/* Retry button if failed */}
        {selectedFile && !isUploading && !uploadSuccess && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => previewUrl && executeUpload(selectedFile, previewUrl, githubConfig)}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold flex items-center gap-1.5 hover:bg-blue-700 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar Subida</span>
            </button>
          </div>
        )}

        {/* Success Confirmation & Direct Link View */}
        {uploadSuccess && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>¡Foto subida a GitHub con éxito!</span>
              </div>
              <button
                type="button"
                onClick={copyUrlToClipboard}
                className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 text-emerald-900 dark:text-emerald-200 font-medium flex items-center gap-1 transition cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado' : 'Copiar Link'}</span>
              </button>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono break-all text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-900/50 p-1.5 rounded-lg">
              <LinkIcon className="w-3 h-3 shrink-0 text-emerald-600" />
              <span className="truncate">{uploadSuccess}</span>
            </div>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
              ✓ Este link se guardará automáticamente en Google Sheets al guardar el producto para mostrarlo en el catálogo.
            </p>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">No se pudo subir la foto:</span>
              <span className="text-[11px] block">{errorMessage}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
