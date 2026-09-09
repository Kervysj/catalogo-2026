import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  RefreshCw,
  Send,
  FileCode,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  DollarSign,
  CloudCheck,
  Smartphone,
  Layers,
  Sparkles
} from 'lucide-react';
import { Product, ConfiguracionTasa, AppSettings } from './types';
import { DEFAULT_SETTINGS, INITIAL_CONFIG, INITIAL_PRODUCTS } from './data/mockData';
import { TasaManager } from './components/TasaManager';
import { ProductList } from './components/ProductList';
import { ProductFormModal } from './components/ProductFormModal';
import { TelegramTroubleshooter } from './components/TelegramTroubleshooter';
import { GoogleAppsScriptCodeModal } from './components/GoogleAppsScriptCodeModal';
import { SettingsModal } from './components/SettingsModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { fetchGasCatalog, executeGasAction } from './utils/gasClient';

export default function App() {
  // Application Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('catalog_admin_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // If the stored gasUrl is incomplete or points to an outdated deployment, update to default
        if (
          !parsed.gasUrl ||
          !parsed.gasUrl.endsWith('/exec') ||
          parsed.gasUrl.includes('AKfycbzIMzNUQ8npc3vvHwx') ||
          parsed.gasUrl.includes('AKfycbzajBZ9Omedm3AybJ6g')
        ) {
          parsed.gasUrl = DEFAULT_SETTINGS.gasUrl;
          localStorage.setItem('catalog_admin_settings', JSON.stringify({ ...DEFAULT_SETTINGS, ...parsed }));
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // State: Products & Exchange Rate
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('catalog_admin_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [tasaConfig, setTasaConfig] = useState<ConfiguracionTasa>(() => {
    try {
      const saved = localStorage.getItem('catalog_admin_tasa');
      return saved ? JSON.parse(saved) : INITIAL_CONFIG;
    } catch {
      return INITIAL_CONFIG;
    }
  });

  const [loading, setLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local' | 'error'>('synced');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('catalog_admin_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('catalog_admin_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('catalog_admin_tasa', JSON.stringify(tasaConfig));
  }, [tasaConfig]);

  // Fetch catalog & tasa from Google Apps Script
  const fetchFromGoogleSheets = async (isManual = false) => {
    if (!settings.gasUrl) return;
    setLoading(true);

    try {
      let data = await fetchGasCatalog(settings.gasUrl);

      // Si no devolvió ok y la URL era distinta a la por defecto, reintentar con la URL oficial verificada
      if ((!data || !data.ok) && settings.gasUrl !== DEFAULT_SETTINGS.gasUrl) {
        try {
          const fallbackData = await fetchGasCatalog(DEFAULT_SETTINGS.gasUrl);
          if (fallbackData && fallbackData.ok) {
            data = fallbackData;
            setSettings((prev) => ({ ...prev, gasUrl: DEFAULT_SETTINGS.gasUrl }));
          }
        } catch {}
      }

      if (data && data.ok) {
        if (Array.isArray(data.productos) && data.productos.length > 0) {
          setProducts(data.productos);
        }
        if (data.configuracion) {
          setTasaConfig(data.configuracion);
        }
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        if (isManual) {
          showToast('Sincronizado con éxito desde Google Sheets', 'success');
        }
      } else {
        setSyncStatus('local');
        if (isManual) {
          showToast(data?.error || 'Google Apps Script respondió con error', 'error');
        }
      }
    } catch (err: any) {
      // Reintentar con URL por defecto si la URL personalizada falló
      if (settings.gasUrl !== DEFAULT_SETTINGS.gasUrl) {
        try {
          const fallbackData = await fetchGasCatalog(DEFAULT_SETTINGS.gasUrl);
          if (fallbackData && fallbackData.ok) {
            if (Array.isArray(fallbackData.productos) && fallbackData.productos.length > 0) {
              setProducts(fallbackData.productos);
            }
            if (fallbackData.configuracion) {
              setTasaConfig(fallbackData.configuracion);
            }
            setSettings((prev) => ({ ...prev, gasUrl: DEFAULT_SETTINGS.gasUrl }));
            setSyncStatus('synced');
            setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            if (isManual) {
              showToast('Sincronizado con éxito desde Google Sheets', 'success');
            }
            return;
          }
        } catch {}
      }

      console.warn('Could not fetch from GAS:', err);
      setSyncStatus('local');
      if (isManual) {
        showToast(err.message || 'No se pudo conectar con Google Sheets. Usando datos locales.', 'info');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load on initial mount
  useEffect(() => {
    fetchFromGoogleSheets();
  }, [settings.gasUrl]);

  // Update Exchange Rate in Google Sheets
  const handleUpdateTasa = async (newRate: number): Promise<boolean> => {
    // Optimistic UI update
    const previous = { ...tasaConfig };
    setTasaConfig((prev) => ({
      ...prev,
      tasa_usd: newRate,
      tasa_activa: true,
      horas_desde_actualizacion: 0,
      ultima_actualizacion: new Date().toISOString().replace('T', ' ').substring(0, 19),
      mensaje: 'Tasa vigente.',
    }));

    try {
      const res = await executeGasAction(settings.gasUrl, {
        action: 'actualizar_tasa',
        tasa: newRate,
      });

      if (res.ok) {
        if (res.configuracion) {
          setTasaConfig(res.configuracion);
        }
        showToast(`Tasa USD actualizada a ${newRate} Bs en Google Sheets`, 'success');
        return true;
      } else {
        throw new Error(res.error || 'Error al actualizar');
      }
    } catch (err: any) {
      console.error(err);
      // Keep optimistic update or inform user
      showToast(`Tasa guardada localmente (${newRate} Bs). Recuerda actualizar el script en Google Sheets.`, 'info');
      return true;
    }
  };

  // Save product (create or edit)
  const handleSaveProduct = async (productData: Partial<Product>): Promise<boolean> => {
    const isEdit = !!productData.id && products.some((p) => String(p.id) === String(productData.id));

    // Optimistic update
    let updatedProducts: Product[];
    if (isEdit) {
      updatedProducts = products.map((p) =>
        String(p.id) === String(productData.id) ? ({ ...p, ...productData } as Product) : p
      );
      showToast('Producto modificado con éxito', 'success');
    } else {
      const newProd: Product = {
        id: productData.id || `PROD-${Date.now().toString().slice(-4)}`,
        nombre: productData.nombre || 'Nuevo Producto',
        categoria: productData.categoria || 'General',
        precio_usd: productData.precio_usd || 0,
        descripcion: productData.descripcion || '',
        imagen: productData.imagen || '',
        disponible: productData.disponible !== false,
        codigo: productData.codigo || '',
      };
      updatedProducts = [newProd, ...products];
      showToast('Producto creado y agregado a la lista', 'success');
    }

    setProducts(updatedProducts);

    // Sync with Google Sheets backend
    try {
      await executeGasAction(settings.gasUrl, {
        action: isEdit ? 'editar_producto' : 'crear_producto',
        producto: productData,
      });
    } catch (err) {
      console.warn('Error syncing product action to GAS:', err);
    }

    return true;
  };

  // Toggle stock availability (disponible / agotado = oculto del catálogo, NO eliminar)
  const handleToggleStock = async (product: Product) => {
    const nextVal = !product.disponible;
    const nextStatus = nextVal ? 'disponible' : 'agotado';
    const updated = products.map((p) =>
      p.id === product.id ? { ...p, disponible: nextVal, status: nextStatus } : p
    );
    setProducts(updated);
    showToast(
      `"${product.nombre}" marcado como ${nextVal ? 'Disponible (Visible para clientes)' : 'Agotado (Oculto del catálogo público)'}`,
      'info'
    );

    try {
      await executeGasAction(settings.gasUrl, {
        action: 'editar_producto',
        producto: { ...product, disponible: nextVal, status: nextStatus },
      });
    } catch (err) {
      console.warn(err);
    }
  };

  // Delete product
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const updated = products.filter((p) => p.id !== deleteTarget.id);
    setProducts(updated);
    showToast(`"${deleteTarget.nombre}" eliminado`, 'info');

    try {
      await executeGasAction(settings.gasUrl, {
        action: 'eliminar_producto',
        id: deleteTarget.id,
        nombre: deleteTarget.nombre,
        fila: deleteTarget._fila,
      });
    } catch (err) {
      console.warn(err);
    } finally {
      setDeleteTarget(null);
    }
  };

  // Unique categories
  const existingCategories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.categoria).filter(Boolean)));
  }, [products]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shadow-blue-500/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  AdminCatálogo
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[200px] sm:max-w-xs">
                Google Sheets · Telegram · Fotos GitHub
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* PWA Install button */}
            <PWAInstallButton />

            {/* Telegram Button with Badge */}
            <button
              id="btn-abrir-telegram"
              type="button"
              onClick={() => setIsTelegramOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-sky-200/70 dark:border-sky-800/60"
              title="Diagnosticar y reparar Bot de Telegram"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Bot Telegram</span>
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            </button>

            {/* Google Apps Script Code Modal */}
            <button
              id="btn-abrir-codigo-gas"
              type="button"
              onClick={() => setIsCodeModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-indigo-200/70 dark:border-indigo-800/60"
              title="Ver código Apps Script actualizado"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Código Apps Script</span>
            </button>

            {/* Link to public customer catalog */}
            <a
              id="btn-ver-catalogo-publico"
              href="https://kervysj.github.io/catalogo-2026/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-emerald-200/70 dark:border-emerald-800/60"
              title="Abrir el catálogo digital público de clientes (index.html en GitHub Pages)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Catálogo Clientes</span>
            </a>

            {/* Sync button */}
            <button
              id="btn-sincronizar-datos"
              type="button"
              onClick={() => fetchFromGoogleSheets(true)}
              disabled={loading}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              title="Actualizar datos desde Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>

            {/* Settings */}
            <button
              id="btn-abrir-ajustes"
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Configuración"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Telegram Notice Banner for First Request */}
        <div className="rounded-2xl p-4 bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-indigo-500/10 border border-sky-200 dark:border-sky-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-xl bg-sky-600 text-white shrink-0 mt-0.5">
              <Send className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>¿Tu Bot de Telegram no responde o da error?</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-extrabold">Solución lista</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                Detectamos que en tu Google Apps Script Telegram sigue apuntando a la URL anterior (<code className="text-[10px] font-mono">...AKfycbz_qzzzw...</code>). Haz clic en reparar para solucionarlo en 1 minuto.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsTelegramOpen(true)}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Ver Diagnóstico & Reparar</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 1. Tasa USD Manager */}
        <section aria-label="Gestor de Tasa USD">
          <TasaManager
            config={tasaConfig}
            onUpdateTasa={handleUpdateTasa}
            loading={loading}
          />
        </section>

        {/* 2. Products Section */}
        <section aria-label="Gestión de Catálogo">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Inventario de Productos ({products.length})
              </h2>
              <p className="text-xs text-slate-500">
                Agrega, edita o modifica precios sin tocar las celdas de tu Google Sheet
              </p>
            </div>

            <button
              id="btn-nuevo-producto-top"
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ingresar Producto</span>
            </button>
          </div>

          <ProductList
            products={products}
            tasaConfig={tasaConfig}
            onEdit={(prod) => {
              setEditingProduct(prod);
              setIsProductModalOpen(true);
            }}
            onDelete={(prod) => setDeleteTarget(prod)}
            onToggleStock={handleToggleStock}
            onAddNew={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 bg-white/50 dark:bg-slate-900/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Sincronizado con Google Sheet pestaña <strong>"productos"</strong> y <strong>"CONFIGURACION"</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCodeModalOpen(true)}
              className="text-slate-500 hover:text-blue-600 transition cursor-pointer"
            >
              Código Apps Script
            </button>
            <span>·</span>
            <button
              onClick={() => setIsTelegramOpen(true)}
              className="text-slate-500 hover:text-blue-600 transition cursor-pointer"
            >
              Bot Telegram
            </button>
            <span>·</span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-slate-500 hover:text-blue-600 transition cursor-pointer"
            >
              Tokens & GitHub
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}

      {/* Product Form Modal (Add / Edit + GitHub uploader) */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        productToEdit={editingProduct}
        tasaConfig={tasaConfig}
        githubConfig={settings.github}
        onUpdateGithubConfig={(newGHCfg) => {
          const updatedSettings = { ...settings, github: newGHCfg };
          setSettings(updatedSettings);
          try {
            localStorage.setItem('catalog_admin_settings', JSON.stringify(updatedSettings));
          } catch (e) {
            console.warn('Error saving settings:', e);
          }
        }}
        existingCategories={existingCategories}
      />

      {/* Telegram Diagnostic Modal */}
      {isTelegramOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto my-auto relative">
            <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between z-10">
              <span className="text-xs font-bold text-slate-500 uppercase">Panel de Reparación</span>
              <button
                onClick={() => setIsTelegramOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <TelegramTroubleshooter
                currentGasUrl={settings.gasUrl}
                telegramConfig={settings.telegram}
                onUpdateTelegramConfig={(newTelCfg) =>
                  setSettings({ ...settings, telegram: newTelCfg })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Google Apps Script Code Modal */}
      <GoogleAppsScriptCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        currentGasUrl={settings.gasUrl}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          showToast('Configuraciones guardadas', 'success');
        }}
        onOpenCodeModal={() => setIsCodeModalOpen(true)}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ¿Eliminar este producto?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
              Estás a punto de eliminar <strong>"{deleteTarget.nombre}"</strong>. Esta acción se sincronizará eliminando la fila en tu Google Sheet.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirmar-eliminar"
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white animate-in slide-in-from-top-2">
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}
          {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 text-blue-500" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Offline Connectivity Indicator (PWA compliance) */}
      <OfflineIndicator />
    </div>
  );
}
