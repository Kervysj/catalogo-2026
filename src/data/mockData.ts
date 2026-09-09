import { Product, ConfiguracionTasa, AppSettings } from '../types';

export const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbx5cDJiQKm9mbqwf-WDGfMNb6WjYEhJMiaRawRRqZkiA4Gpj7ohg5VFiyCTMsKeo461Ng/exec";

export const INITIAL_CONFIG: ConfiguracionTasa = {
  tasa_usd: 150,
  tasa_activa: true,
  ultima_actualizacion: new Date().toISOString().replace('T', ' ').substring(0, 19),
  horas_desde_actualizacion: 1.5,
  vigencia_horas: 24,
  mensaje: "Tasa vigente."
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "PROD-001",
    nombre: "Zapatillas Deportivas Runner Pro",
    categoria: "Calzado",
    precio_usd: 45.00,
    precio_bs: 6750.00,
    descripcion: "Zapatillas ligeras transpirables con suela ergonómica para alto rendimiento.",
    imagen: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    disponible: true,
    codigo: "ZAP-45"
  },
  {
    id: "PROD-002",
    nombre: "Camiseta Dry-Fit Entrenamiento",
    categoria: "Ropa",
    precio_usd: 18.50,
    precio_bs: 2775.00,
    descripcion: "Camiseta de secado rápido ideal para gimnasio y actividades al aire libre.",
    imagen: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
    disponible: true,
    codigo: "CAM-18"
  },
  {
    id: "PROD-003",
    nombre: "Audífonos Inalámbricos Bluetooth 5.3",
    categoria: "Tecnología",
    precio_usd: 32.00,
    precio_bs: 4800.00,
    descripcion: "Cancelación de ruido activa, estuche con batería de 30 horas y sonido HD.",
    imagen: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    disponible: true,
    codigo: "AUD-32"
  },
  {
    id: "PROD-004",
    nombre: "Mochila Impermeable Urbana",
    categoria: "Accesorios",
    precio_usd: 28.00,
    precio_bs: 4200.00,
    descripcion: "Compartimento para laptop de 15.6 pulgadas, puerto USB de carga externa.",
    imagen: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80",
    disponible: false,
    codigo: "MOC-28"
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  gasUrl: DEFAULT_GAS_URL,
  github: {
    token: "",
    owner: "Kervysj",
    repo: "catalogo-2026",
    branch: "main",
    folder: "CATEGORIAS"
  },
  telegram: {
    botToken: "",
    webhookUrl: DEFAULT_GAS_URL,
    adminChatId: ""
  },
  useProxy: true
};
