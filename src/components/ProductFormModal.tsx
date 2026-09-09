import React, { useState, useEffect } from 'react';
import { X, Save, DollarSign, Package, Tag, FileText, Image as ImageIcon, Sparkles, RefreshCw, Check } from 'lucide-react';
import { Product, ConfiguracionTasa, GitHubConfig } from '../types';
import { GitHubImageUploader } from './GitHubImageUploader';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Partial<Product>) => Promise<boolean>;
  productToEdit?: Product | null;
  tasaConfig: ConfiguracionTasa;
  githubConfig: GitHubConfig;
  onUpdateGithubConfig: (cfg: GitHubConfig) => void;
  existingCategories: string[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
  tasaConfig,
  githubConfig,
  onUpdateGithubConfig,
  existingCategories,
}) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    nombre: '',
    categoria: 'General',
    precio_usd: 0,
    descripcion: '',
    imagen: '',
    disponible: true,
    codigo: '',
  });

  const [saving, setSaving] = useState(false);
  const [activeImageTab, setActiveImageTab] = useState<'github' | 'url'>('github');

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        ...productToEdit,
        precio_usd: productToEdit.precio_usd !== undefined ? Number(productToEdit.precio_usd) : Number(productToEdit.precio || 0),
        codigo: productToEdit.codigo || productToEdit.codigo_producto || '',
        disponible: productToEdit.disponible !== false && String(productToEdit.disponible).toLowerCase() !== 'no' && String(productToEdit.disponible).toLowerCase() !== 'false',
      });
    } else {
      setFormData({
        nombre: '',
        categoria: existingCategories[0] || 'General',
        precio_usd: 10,
        descripcion: '',
        imagen: '',
        disponible: true,
        codigo: `PROD-${Math.floor(100 + Math.random() * 900)}`,
      });
    }
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const currentTasa = tasaConfig.tasa_usd || 150;
  const calculatedBs = ((formData.precio_usd || 0) * currentTasa).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre?.trim()) {
      alert("Por favor ingresa el nombre del producto");
      return;
    }

    setSaving(true);
    const ok = await onSave(formData);
    setSaving(false);
    if (ok) {
      onClose();
    }
  };

  const presetCategories = Array.from(
    new Set([...existingCategories, 'Calzado', 'Ropa', 'Tecnología', 'Accesorios', 'Hogar', 'Salud & Belleza'])
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
              <Package className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {productToEdit ? 'Modificar Producto' : 'Ingresar Nuevo Producto'}
              </h2>
              <p className="text-xs text-slate-500">
                Se sincronizará en la pestaña <code className="font-semibold text-slate-700 dark:text-slate-300">productos</code> de tu Google Sheet
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {/* Nombre y Código */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nombre del Producto *
              </label>
              <input
                id="input-producto-nombre"
                type="text"
                required
                value={formData.nombre || ''}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Zapatillas Nike Air Zoom"
                className="w-full text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Código / SKU
              </label>
              <input
                type="text"
                value={formData.codigo || ''}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="Ej: ZAP-01"
                className="w-full text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Categoría y Disponibilidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Categoría
              </label>
              <input
                type="text"
                value={formData.categoria || ''}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                placeholder="Ej: Calzado, Ropa..."
                className="w-full text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none mb-1.5"
              />
              {/* Preset category tags */}
              <div className="flex flex-wrap gap-1">
                {presetCategories.slice(0, 5).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData({ ...formData, categoria: cat })}
                    className={`text-[10px] px-2 py-0.5 rounded-md transition cursor-pointer ${
                      formData.categoria === cat
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Disponibilidad Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Estado del Producto
              </label>
              <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, disponible: true })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                    formData.disponible
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  Disponible
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, disponible: false })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                    !formData.disponible
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  Agotado
                </button>
              </div>
            </div>
          </div>

          {/* Precios: USD + Calculado en Bs */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-bold text-blue-950 dark:text-blue-200 mb-1">
                  Precio en Dólares (USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                    $
                  </span>
                  <input
                    id="input-producto-precio"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.precio_usd ?? ''}
                    onChange={(e) => setFormData({ ...formData, precio_usd: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full text-base font-bold pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-blue-950 dark:text-blue-200 mb-1">
                  Equivalente en Bolívares (Automático)
                </span>
                <div className="px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-blue-200/80 dark:border-blue-800/80 rounded-xl">
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    Bs. {calculatedBs}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Calculado con tasa actual de {currentTasa} Bs/USD
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Descripción o Detalles del Producto
            </label>
            <textarea
              rows={2}
              value={formData.descripcion || ''}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Materiales, tallas, especificaciones, garantía..."
              className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Imagen del Producto con GitHub Uploader */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>Foto del Producto</span>
              </label>
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveImageTab('github')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeImageTab === 'github'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Subir a GitHub
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImageTab('url')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeImageTab === 'url'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Link URL Directo
                </button>
              </div>
            </div>

            {activeImageTab === 'github' ? (
              <GitHubImageUploader
                currentImageUrl={formData.imagen}
                onImageUploaded={(url) => setFormData({ ...formData, imagen: url })}
                githubConfig={githubConfig}
                onUpdateGithubConfig={onUpdateGithubConfig}
              />
            ) : (
              <div className="space-y-2">
                <input
                  type="url"
                  value={formData.imagen || ''}
                  onChange={(e) => setFormData({ ...formData, imagen: e.target.value })}
                  placeholder="https://... enlace público de la foto"
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {formData.imagen && (
                  <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <img
                      src={formData.imagen}
                      alt="Preview"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="text-xs text-slate-500 truncate flex-1">
                      {formData.imagen}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Footer actions */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            id="btn-guardar-producto"
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Guardando en Google Sheets...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{productToEdit ? 'Guardar Cambios' : 'Registrar Producto'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
