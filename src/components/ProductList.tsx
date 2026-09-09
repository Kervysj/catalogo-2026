import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, CheckCircle2, XCircle, LayoutGrid, List, Tag, DollarSign, PackageOpen, ExternalLink, ImageOff } from 'lucide-react';
import { Product, ConfiguracionTasa } from '../types';

interface ProductListProps {
  products: Product[];
  tasaConfig: ConfiguracionTasa;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleStock: (product: Product) => void;
  onAddNew: () => void;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  tasaConfig,
  onEdit,
  onDelete,
  onToggleStock,
  onAddNew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'available' | 'out'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const tasa = tasaConfig.tasa_usd || 150;

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categoria) set.add(p.categoria);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        (p.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.categoria || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.codigo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchCat = selectedCategory === 'all' || p.categoria === selectedCategory;

      const isAvailable = p.disponible !== false;
      const matchStock =
        stockFilter === 'all' ||
        (stockFilter === 'available' && isAvailable) ||
        (stockFilter === 'out' && !isAvailable);

      return matchSearch && matchCat && matchStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  return (
    <div className="space-y-4">
      {/* Controls toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-buscar-producto"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, código, categoría o detalle..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Vista de cuadrícula"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Vista de lista / tabla"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Add Product Button */}
            <button
              id="btn-agregar-producto-toolbar"
              type="button"
              onClick={onAddNew}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </button>
          </div>
        </div>

        {/* Filter categories and stock status */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-medium mr-1">Categorías:</span>
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Todas ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                stockFilter === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs' : 'text-slate-500'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('available')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                stockFilter === 'available' ? 'bg-white dark:bg-slate-900 text-emerald-600 font-bold shadow-xs' : 'text-slate-500'
              }`}
              title="Productos visibles para los clientes en el catálogo digital"
            >
              Visibles ({products.filter((p) => p.disponible !== false).length})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('out')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                stockFilter === 'out' ? 'bg-white dark:bg-slate-900 text-amber-600 font-bold shadow-xs' : 'text-slate-500'
              }`}
              title="Productos agotados (ocultos del catálogo público, no eliminados)"
            >
              Ocultos / Agotados ({products.filter((p) => p.disponible === false).length})
            </button>
          </div>
        </div>
      </div>

      {/* Product List Content */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
          <PackageOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No se encontraron productos
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'all'
              ? 'Prueba modificando tus filtros o término de búsqueda.'
              : 'Agrega tu primer producto haciendo clic en "Nuevo Producto".'}
          </p>
          <button
            type="button"
            onClick={onAddNew}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Primer Producto</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p, idx) => {
            const isAvailable = p.disponible !== false && String(p.disponible).toLowerCase() !== 'no' && String(p.disponible).toLowerCase() !== 'false';
            const numPrice = Number(p.precio_usd !== undefined && p.precio_usd !== '' ? p.precio_usd : (p.precio || 0));
            const priceBs = (numPrice * tasa).toLocaleString('es-VE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const productCode = p.codigo || p.codigo_producto;

            return (
              <div
                key={p.id || idx}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                {/* Image & Badges */}
                <div className="relative aspect-4/3 bg-slate-100 dark:bg-slate-800 overflow-hidden group">
                  {p.imagen ? (
                    <img
                      src={p.imagen}
                      alt={p.nombre}
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <ImageOff className="w-8 h-8 mb-1" />
                      <span className="text-[11px]">Sin imagen</span>
                    </div>
                  )}

                  {/* Badges overlay */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                    <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                      {p.categoria || 'General'}
                    </span>
                    {productCode && (
                      <span className="bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 text-[9px] font-mono px-1.5 py-0.5 rounded-md shadow-xs">
                        {productCode}
                      </span>
                    )}
                  </div>

                  {/* Stock Toggle button */}
                  <button
                    type="button"
                    onClick={() => onToggleStock(p)}
                    className="absolute top-2.5 right-2.5 shadow-xs cursor-pointer"
                    title={
                      isAvailable
                        ? "Visible para clientes. Haz clic para marcar Agotado (Se ocultará del catálogo)"
                        : "Oculto del catálogo. Haz clic para marcar Disponible (Volver a mostrar a los clientes)"
                    }
                  >
                    {isAvailable ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full hover:bg-emerald-700 transition shadow-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        Visible
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full hover:bg-amber-700 transition shadow-xs">
                        <XCircle className="w-3 h-3" />
                        Agotado (Oculto)
                      </span>
                    )}
                  </button>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                      {p.nombre}
                    </h3>
                    {p.descripcion && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {p.descripcion}
                      </p>
                    )}
                  </div>

                  {/* Price info */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Precio USD</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">
                        ${numPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">En Bolívares</span>
                      <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                        Bs. {priceBs}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => onEdit(p)}
                      className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(p)}
                      className="py-1.5 px-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-bold">Foto</th>
                <th className="py-3 px-4 font-bold">Producto</th>
                <th className="py-3 px-4 font-bold">Categoría</th>
                <th className="py-3 px-4 font-bold">Precio USD</th>
                <th className="py-3 px-4 font-bold">Precio Bs ({tasa})</th>
                <th className="py-3 px-4 font-bold">Estado</th>
                <th className="py-3 px-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.map((p, idx) => {
                const isAvailable = p.disponible !== false && String(p.disponible).toLowerCase() !== 'no' && String(p.disponible).toLowerCase() !== 'false';
                const numPrice = Number(p.precio_usd !== undefined && p.precio_usd !== '' ? p.precio_usd : (p.precio || 0));
                const priceBs = (numPrice * tasa).toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                const productCode = p.codigo || p.codigo_producto;

                return (
                  <tr key={p.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4">
                      {p.imagen ? (
                        <img
                          src={p.imagen}
                          alt={p.nombre}
                          className="w-11 h-11 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-11 h-11 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
                          <ImageOff className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white max-w-[220px]">
                      <div className="truncate">{p.nombre}</div>
                      {productCode && (
                        <span className="text-[10px] text-slate-400 font-mono">{productCode}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[11px] font-medium">
                        {p.categoria || 'General'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                      ${numPrice.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 font-extrabold text-emerald-600 dark:text-emerald-400">
                      Bs. {priceBs}
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        type="button"
                        onClick={() => onToggleStock(p)}
                        className="cursor-pointer"
                        title={
                          isAvailable
                            ? "Visible para clientes. Haz clic para marcar Agotado (Se ocultará del catálogo)"
                            : "Oculto del catálogo. Haz clic para marcar Disponible (Volver a mostrar a los clientes)"
                        }
                      >
                        {isAvailable ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Visible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" />
                            Agotado (Oculto)
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(p)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(p)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
