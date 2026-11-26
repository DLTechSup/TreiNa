// Ajustes depois do "expo export --platform web" para o site virar um app instalável (PWA)
// e funcionar no GitHub Pages:
//  - manifest + ícones + metatags do iPhone ("Adicionar à Tela de Início")
//  - 404.html = index.html (abrir /TreiNa/biblioteca direto, ou voltar do login do Google)
//  - .nojekyll (o GitHub não esconde a pasta _expo)
const fs = require('fs');
const path = require('path');

const dist = process.env.DIST_DIR ? path.resolve(process.env.DIST_DIR) : path.join(__dirname, '..', 'dist');
const base = (process.env.TREINA_BASE_URL || '').trim().replace(/\/$/, '');
const indexPath = path.join(dist, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html não encontrado. Rode antes: npx expo export --platform web');
  process.exit(1);
}

// O GitHub Pages recusa publicar sites com uma pasta chamada "node_modules" (erro 500).
// O Expo põe fontes e ícones em assets/node_modules: renomeia a pasta e corrige os endereços.
const pastaNm = path.join(dist, 'assets', 'node_modules');
if (fs.existsSync(pastaNm)) {
  fs.renameSync(pastaNm, path.join(dist, 'assets', 'pacotes'));
  const corrigir = (dir) => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, item.name);
      if (item.isDirectory()) corrigir(p);
      else if (/\.(js|html|json|css|map)$/.test(item.name)) {
        const txt = fs.readFileSync(p, 'utf8');
        if (txt.includes('assets/node_modules/')) fs.writeFileSync(p, txt.split('assets/node_modules/').join('assets/pacotes/'));
      }
    }
  };
  corrigir(dist);
}

const manifest = {
  name: 'TreiNa',
  short_name: 'TreiNa',
  description: 'TreiNa',
  lang: 'pt-BR',
  start_url: `${base}/`,
  scope: `${base}/`,
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#F5F4F0',
  theme_color: '#16161D',
  icons: [
    { src: `${base}/icones/icone-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: `${base}/icones/icone-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: `${base}/icones/icone-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

const tags = [
  `<link rel="manifest" href="${base}/manifest.webmanifest" />`,
  '<meta name="theme-color" content="#16161D" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
  '<meta name="apple-mobile-web-app-title" content="TreiNa" />',
  `<link rel="apple-touch-icon" href="${base}/icones/icone-180.png" />`,
  '<meta name="description" content="TreiNa" />',
].join('\n    ');

/* ---------------- segurança (site estático: as regras vão em <meta>) ----------------
 * - CSP: o navegador só roda scripts do próprio site (nada de script injetado ou de terceiros)
 *   e só conversa com o próprio site e com o Supabase do app.
 * - no-referrer: não conta para outros sites de onde a pessoa veio.
 * - noindex: Google e outros buscadores não listam o site.
 */
function urlSupabase() {
  if (process.env.EXPO_PUBLIC_SUPABASE_URL) return process.env.EXPO_PUBLIC_SUPABASE_URL.trim();
  try {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    const m = env.match(/^EXPO_PUBLIC_SUPABASE_URL=(.+)$/m);
    return m ? m[1].trim() : '';
  } catch {
    return '';
  }
}
const sb = urlSupabase().replace(/\/$/, '');
const csp = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.googleusercontent.com",
  "font-src 'self' data:",
  `connect-src 'self'${sb ? ` ${sb}` : ''}`,
  `media-src 'self' blob:${sb ? ` ${sb}` : ''}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');
const tagsSeguranca = [
  `<meta http-equiv="Content-Security-Policy" content="${csp}" />`,
  '<meta name="referrer" content="no-referrer" />',
  '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />',
  '<meta name="googlebot" content="noindex, nofollow" />',
  // roda antes do app: endereço com cara de ferramenta de invasão é mandado para fora do site
  `<script src="${base}/seguranca.js"></script>`,
].join('\n    ');

// Celular: ocupa a tela toda (iPhone com notch/barra de gestos), sem zoom estranho e sem "flash" azul ao tocar
const cssCelular = '<style id="treina-celular">html,body{background:#F5F4F0;-webkit-text-size-adjust:100%;text-size-adjust:100%;overscroll-behavior-y:none}*{-webkit-tap-highlight-color:transparent}input,textarea{font-size:16px}</style>';

let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/<html lang="[^"]*"/, '<html lang="pt-BR"');
html = html.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />');
html = html.replace(/\s*<meta httpEquiv="X-UA-Compatible"[^>]*>/, '');
if (!html.includes('Content-Security-Policy')) html = html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n    ${tagsSeguranca}`);
if (!html.includes('treina-celular')) html = html.replace('</head>', `    ${cssCelular}\n  </head>`);
if (!html.includes('rel="manifest"')) html = html.replace('</head>', `    ${tags}\n  </head>`);
fs.writeFileSync(indexPath, html);
fs.writeFileSync(path.join(dist, '404.html'), html);
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
// sem lista de arquivos/rotas para robôs
fs.writeFileSync(path.join(dist, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
// páginas de privacidade/termos também fora dos buscadores
for (const extra of ['privacidade.html', 'termos.html']) {
  const p = path.join(dist, extra);
  if (fs.existsSync(p)) {
    const t = fs.readFileSync(p, 'utf8');
    if (!t.includes('noindex')) fs.writeFileSync(p, t.replace(/<head>/i, '<head>\n<meta name="robots" content="noindex, nofollow" />\n<meta name="referrer" content="no-referrer" />'));
  }
}
// tira mapas de código (.map), se o Expo gerar algum
const tirarMapas = (dir) => {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) tirarMapas(p);
    else if (item.name.endsWith('.map')) fs.unlinkSync(p);
  }
};
tirarMapas(dist);
// tira a lista interna do empacotador (não serve para o site e só mostra como ele foi montado)
for (const interno of ['metadata.json']) {
  const p = path.join(dist, interno);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

console.log(`Site pronto em dist/ (endereço base: "${base || '/'}")`);
