import React, { useState } from 'react';
import { RefreshCw, DollarSign, CheckCircle2, AlertTriangle, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { ConfiguracionTasa } from '../types';

interface TasaManagerProps {
  config: ConfiguracionTasa;
  onUpdateTasa: (newRate: number) => Promise<boolean>;
  loading: boolean;
}

export const TasaManager: React.FC<TasaManagerProps> = ({
  config,
  onUpdateTasa,
  loading,
}) => {
  const [inputVal, setInputVal] = useState<string>(
    config.tasa_usd ? String(config.tasa_usd) : '150'
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(inputVal.replace(',', '.'));
    if (isNaN(num) || num <= 0) {
      return;
    }

    setIsUpdating(true);
    const ok = await onUpdateTasa(num);
    setIsUpdating(false);

    if (ok) {
      setSuccessMessage(`¡Tasa actualizada a ${num} con éxito!`);
      setTimeout(() => setSuccessMessage(null), 3500);
    }
  };

  const applyIncrement = (increment: number) => {
    const current = parseFloat(inputVal.replace(',', '.')) || (config.tasa_usd || 150);
    const nextVal = (current + increment).toFixed(2).replace(/\.00$/, '');
    setInputVal(nextVal);
  };

  const hoursRemaining = Math.max(0, 24 - (config.horas_desde_actualizacion || 0));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 dark:border-slate-800 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Tasa de Cambio Oficial (USD)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Se almacena en la pestaña <code className="font-semibold text-slate-700 dark:text-slate-300">CONFIGURACION!B2</code>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {config.tasa_usd !== null ? `${config.tasa_usd}` : '---'}
              <span className="text-sm font-normal text-slate-500 ml-1">Bs / USD</span>
            </div>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              {config.tasa_activa ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Vigente ({hoursRemaining.toFixed(1)}h restantes)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  Vencida (&gt;24h)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick change form */}
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Nueva tasa a guardar:
            </label>
            <div className="relative">
              <input
                id="input-nueva-tasa"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ej: 155.00"
                className="w-full pl-3 pr-16 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                Bs/USD
              </span>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              id="btn-guardar-tasa"
              type="submit"
              disabled={isUpdating || loading}
              className="w-full sm:w-auto h-[42px] px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Actualizar Tasa</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick increments */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-medium">Ajuste rápido:</span>
          {[0.5, 1, 2, 5].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => applyIncrement(val)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition cursor-pointer"
            >
              +{val}
            </button>
          ))}
          {[-0.5, -1].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => applyIncrement(val)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition cursor-pointer"
            >
              {val}
            </button>
          ))}
        </div>

        {/* Feedback message */}
        {successMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="mt-3 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Última confirmación: {config.ultima_actualizacion || 'Nunca'} ({config.horas_desde_actualizacion || 0} horas transcurridas)</span>
        </div>
      </form>
    </div>
  );
};
