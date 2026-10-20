const C="nebenexistenz-201020261229";
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(["./","manifest.json","icon-192.png","icon-512.png"])))});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;
  if(r.mode==="navigate"){e.respondWith(fetch(r).then(x=>{const y=x.clone();caches.open(C).then(c=>c.put("./",y));return x}).catch(()=>caches.match("./")));return}
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(x=>{if(x.ok&&(r.url.includes("fonts.")||r.url.endsWith(".png"))){const y=x.clone();caches.open(C).then(c=>c.put(r,y))}return x})))});
