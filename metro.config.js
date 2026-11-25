// Configuração do Metro (empacotador do Expo).
// No celular o banco é o expo-sqlite; no site é o sql.js (src/db/sqlite.web.tsx),
// que não precisa de cabeçalhos especiais e por isso funciona no GitHub Pages.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

module.exports = config;
