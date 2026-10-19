#!/usr/bin/env python3
"""Baut Nebenexistenz: dist/app.html (Artefakt) und repo/ (GitHub Pages, PWA)."""
import datetime, zoneinfo, os, json, re, subprocess, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
R = lambda f: open(f, encoding='utf-8').read()
stamp = datetime.datetime.now(zoneinfo.ZoneInfo('Europe/Berlin')).strftime('%d.%m.%Y, %H:%M')

page = (R('shell.html')
        .replace('/*CSS*/', R('style.css'))
        .replace('/*DATA*/', R('data.js'))
        .replace('/*MAIN*/', R('main.js'))
        .replace('__BUILD__', stamp))

# Selbstprüfung: Skript muss sich parsen lassen, ids eindeutig
REPO = '../repo' if os.path.isdir('../repo') else '..'
DIST = '../dist' if os.path.isdir('../dist') else REPO
js = page.split('<script>', 1)[1].rsplit('</script>', 1)[0]
open(DIST + '/_check.js', 'w', encoding='utf-8').write(js)
r = subprocess.run(['node', '--check', DIST + '/_check.js'], capture_output=True, text=True)
os.remove(DIST + '/_check.js')
if r.returncode: sys.exit('Syntaxfehler:\n' + r.stderr)
data = R('data.js')
for arr in ['VORLAGEN', 'PFLICHTEN', 'AUFTRAEGE', 'WISSEN']:
    block = data.split('const ' + arr, 1)[1].split('];', 1)[0]
    ids = re.findall(r'\{id:"([^"]+)"', block)
    dup = {i for i in ids if ids.count(i) > 1}
    if dup: sys.exit(f'Doppelte ids in {arr}: {dup}')
auf = set(re.findall(r'\{id:"(a_[^"]+)"', data))
for ref in re.findall(r'auftrag:"([^"]+)"', data):
    if ref not in auf: sys.exit('Unbekannter Auftrag: ' + ref)

if DIST != REPO: open(DIST + '/app.html', 'w', encoding='utf-8').write(page)
if os.environ.get('ARTIFACT_OUT'): open(os.environ['ARTIFACT_OUT'], 'w', encoding='utf-8').write(page)

# Fassung für GitHub Pages
headpart, body = page.split('<div id="app">', 1)
head = f'''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Eine Nebenexistenz aufbauen, die neben dem Leben bleibt: kleine, legale Gewerbe, die andere führen.">
<meta name="author" content="Carlo Maximilian Engeländer">
<meta name="copyright" content="© Carlo Maximilian Engeländer. Alle Rechte vorbehalten.">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Nebenexistenz">
<meta name="theme-color" content="#E4E8E2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#141921" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" href="icon-192.png">
<meta property="og:title" content="Nebenexistenz">
<meta property="og:description" content="Kleine, legale Gewerbe nebenher aufbauen, die andere führen, ohne das Leben aus dem Blick zu verlieren.">
<meta property="og:image" content="icon-512.png">
<style>:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}[hidden]{{display:none!important}}img{{max-width:100%}}</style>
'''
open(REPO + '/index.html', 'w', encoding='utf-8').write(head + headpart + '</head>\n<body>\n<div id="app">' + body + '\n</body>\n</html>\n')
json.dump({"name": "Nebenexistenz", "short_name": "Nebenexistenz", "lang": "de", "start_url": ".", "display": "standalone",
           "background_color": "#E4E8E2", "theme_color": "#E4E8E2",
           "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
                     {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]},
          open(REPO + '/manifest.json', 'w'), ensure_ascii=False, indent=1)
safe = re.sub(r'\W', '', stamp)
open(REPO + '/sw.js', 'w').write(f'''const C="nebenexistenz-{safe}";
self.addEventListener("install",e=>{{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(["./","manifest.json","icon-192.png","icon-512.png"])))}});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{{const r=e.request;if(r.method!=="GET")return;
  if(r.mode==="navigate"){{e.respondWith(fetch(r).then(x=>{{const y=x.clone();caches.open(C).then(c=>c.put("./",y));return x}}).catch(()=>caches.match("./")));return}}
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(x=>{{if(x.ok&&(r.url.includes("fonts.")||r.url.endsWith(".png"))){{const y=x.clone();caches.open(C).then(c=>c.put(r,y))}}return x}})))}});
''')

# Icons: das Mobile als Zeichen
try:
    from PIL import Image, ImageDraw
    import math
    def icon(n, path, pad=0.0):
        S = n * 4; im = Image.new('RGB', (S, S), '#E4E8E2'); d = ImageDraw.Draw(im)
        u = S * (1 - 2 * pad) / 100; o = S * pad
        P = lambda x, y: (o + x * u, o + y * u)
        ink = '#252B30'; w = max(2, round(2.4 * u))
        def ln(x1, y1, x2, y2, ww=w): d.line([P(x1, y1), P(x2, y2)], fill=ink, width=ww)
        # Haken und Aufhängung
        hx, hy = 50, 17
        d.ellipse([*P(hx - 2.6, hy - 2.6), *P(hx + 2.6, hy + 2.6)], outline=ink, width=max(2, round(1.8 * u)))
        ln(50, 19.6, 50, 34)
        # leicht geneigter Balken: Leben links schwerer
        ang = math.radians(-5); L, R = 28, 28
        lx, ly = 50 - L * math.cos(ang), 34 - L * math.sin(ang)
        rx, ry = 50 + R * math.cos(ang), 34 + R * math.sin(ang)
        pts = [P(lx + (rx - lx) * t, ly + (ry - ly) * t - 2.2 * math.sin(math.pi * t)) for t in [i / 40 for i in range(41)]]
        d.line(pts, fill=ink, width=w, joint='curve')
        r = 1.9 * u; d.ellipse([P(50, 34)[0] - r, P(50, 34)[1] - 2.2 * u - r, P(50, 34)[0] + r, P(50, 34)[1] - 2.2 * u + r], fill=ink)
        # Leben: rote Scheibe
        ln(lx, ly, lx, 56)
        d.ellipse([*P(lx - 12.5, 56), *P(lx + 12.5, 81)], fill='#AE432C')
        # Vorhaben: blaues Dreieck
        ln(rx, ry, rx, 47)
        d.polygon([P(rx, 45), P(rx + 12, 67), P(rx - 12, 67)], fill='#2A5784')
        im.resize((n, n), Image.LANCZOS).save(path)
    icon(192, REPO + '/icon-192.png', 0.08); icon(512, REPO + '/icon-512.png', 0.12); icon(180, REPO + '/apple-touch-icon.png', 0.08)
except ImportError:
    print('PIL fehlt, Icons nicht erzeugt')
print('Gebaut:', stamp, '·', len(page) // 1024, 'KB')
