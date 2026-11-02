// Service worker mínimo: hace que el catálogo se pueda instalar como app.
// No guarda nada en caché, así el catálogo siempre muestra productos y precios actualizados.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
