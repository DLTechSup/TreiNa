// Configuração dinâmica do Expo (lê o app.json e ajusta só o que precisa).
// No site do GitHub Pages o endereço começa com o nome do repositório (ex.: /TreiNa),
// então a publicação define TREINA_BASE_URL=/TreiNa. No celular e no teste local fica vazio.
module.exports = ({ config }) => {
  const base = (process.env.TREINA_BASE_URL || '').trim();
  if (!base) return config;
  return { ...config, experiments: { ...config.experiments, baseUrl: base } };
};
