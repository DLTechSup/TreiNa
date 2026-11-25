// Ajustes depois do "expo export --platform web" para o site virar um app instalável (PWA)
// e funcionar no GitHub Pages:
//  - manifest + ícones + metatags do iPhone ("Adicionar à Tela de Início")
//  - 404.html = index.html (abrir /TreiNa/biblioteca direto, ou voltar do login do Google)
//  - .nojekyll (o GitHub não esconde a pasta _expo)
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const base = (process.env.TREINA_BASE_URL || '').trim().replace(/\/$/, '');
const indexPath = path.join(dist, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html não encontrado. Rode antes: npx expo export --platform web');
  process.exit(1);
}

const manifest = {
  name: 'TreiNa',
  short_name: 'TreiNa',
  description: 'Seu treino, do seu jeito: biblioteca com 963 exercícios, treinos e histórico.',
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
  '<meta name="description" content="TreiNa: biblioteca de exercícios com vídeos, treinos e histórico." />',
].join('\n    ');

let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/<html lang="[^"]*"/, '<html lang="pt-BR"');
if (!html.includes('rel="manifest"')) html = html.replace('</head>', `    ${tags}\n  </head>`);
fs.writeFileSync(indexPath, html);
fs.writeFileSync(path.join(dist, '404.html'), html);
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

console.log(`Site pronto em dist/ (endereço base: "${base || '/'}")`);
