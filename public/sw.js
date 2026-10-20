/**
 * Service worker do D.Sync (app instalável).
 * - Telas: busca sempre na rede (pega a versão nova a cada deploy); sem internet, abre a última salva.
 * - Arquivos do build (/assets, com hash no nome) e ícones: guarda no aparelho para abrir mais rápido.
 * - Chamadas da API nunca passam pelo cache.
 */
const CACHE = "dsync-v2"; // mude a versão quando logo/ícones mudarem
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icons/icon-192.png", "/logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api")) return;

  // Navegação (abrir/recarregar uma tela): rede primeiro, cópia salva se estiver sem internet
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Arquivos estáticos: cache primeiro
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/") || url.pathname === "/logo.png") {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});
