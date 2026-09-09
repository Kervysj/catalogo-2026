export interface Product {
  id?: string | number;
  nombre: string;
  categoria: string;
  precio_usd: number;
  precio_bs?: number;
  descripcion?: string;
  imagen?: string;
  disponible: boolean;
  codigo?: string;
  [key: string]: any;
}

export interface ConfiguracionTasa {
  tasa_usd: number | null;
  tasa_activa: boolean;
  ultima_actualizacion: string | null;
  horas_desde_actualizacion: number;
  vigencia_horas: number;
  mensaje: string;
}

export interface CatalogApiResponse {
  ok: boolean;
  productos?: any[];
  configuracion?: ConfiguracionTasa;
  error?: string;
  mensaje?: string;
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  folder: string;
}

export interface TelegramConfig {
  botToken: string;
  webhookUrl: string;
  adminChatId?: string;
}

export interface AppSettings {
  gasUrl: string;
  github: GitHubConfig;
  telegram: TelegramConfig;
  useProxy: boolean;
}
