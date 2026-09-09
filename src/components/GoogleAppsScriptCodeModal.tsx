import React, { useState } from 'react';
import { X, Copy, Check, FileCode, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';
import { UPDATED_APPS_SCRIPT_CODE } from '../utils/gasScriptTemplate';

interface GoogleAppsScriptCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGasUrl: string;
}

export const GoogleAppsScriptCodeModal: React.FC<GoogleAppsScriptCodeModalProps> = ({
  isOpen,
  onClose,
  currentGasUrl,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Insert active URL into template
  const codeToCopy = UPDATED_APPS_SCRIPT_CODE.replace(
    'https://script.google.com/macros/s/AKfycbzajBZ9Omedm3AybJ6g3n6Fjb--RTFNY2nBPmNxLiOSN6Xyxzr6kW9CBvjLH4lsTK2jYQ/exec',
    currentGasUrl
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(codeToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
              <FileCode className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Código Actualizado para Google Apps Script
              </h2>
              <p className="text-xs text-slate-500">
                Soporta tanto el Bot de Telegram como todas las funciones del Administrador Web
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

        {/* Instructions banner */}
        <div className="px-5 py-3 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-indigo-200 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>¿Por qué necesitas este código actualizado?</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            Tu código anterior en Google Apps Script solo procesaba mensajes de Telegram en <code className="font-semibold">doPost</code>. Este nuevo código detecta automáticamente si la petición viene del Administrador Web (para crear/editar/eliminar productos o cambiar la tasa) o de Telegram (para responder al bot sin errores).
          </p>
        </div>

        {/* 3 Steps */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-blue-600 block mb-1">1. Copiar y Pegar</span>
            <p className="text-[11px] text-slate-500">
              Copia este código y pégalo en tu editor de Google Apps Script (reemplazando el archivo actual).
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-blue-600 block mb-1">2. Nueva Versión</span>
            <p className="text-[11px] text-slate-500">
              Haz clic en <strong>Implementar</strong> &gt; <strong>Gestionar implementaciones</strong> &gt; ✏️ Editar &gt; Versión: <strong>Nueva versión</strong> &gt; Implementar.
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-blue-600 block mb-1">3. Vincular Telegram</span>
            <p className="text-[11px] text-slate-500">
              Selecciona la función <code className="text-blue-600 font-semibold">configurarWebhookTelegram</code> en el editor y presiona <strong>Ejecutar</strong>.
            </p>
          </div>
        </div>

        {/* Code Box */}
        <div className="relative flex-1 overflow-hidden p-5 flex flex-col">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-mono font-bold text-slate-500">
              Código Completo (Listo para usar):
            </span>
            <button
              id="btn-copiar-codigo-gas"
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>¡Copiado al portapapeles!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Código Completo</span>
                </>
              )}
            </button>
          </div>

          <pre className="flex-1 overflow-y-auto p-4 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] leading-relaxed select-all max-h-[360px] border border-slate-800">
            {codeToCopy}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            No altera la estructura de tus hojas ni borra datos existentes.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-semibold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
