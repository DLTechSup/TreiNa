/* TreiNa — proteção extra do site
 * Roda antes de tudo. Se o endereço tiver cara de ferramenta de invasão
 * (procura de painel WordPress, .env, .git, phpMyAdmin, injeção de SQL ou script...),
 * a pessoa é mandada para fora do site antes de o app abrir.
 */
(function () {
  try {
    var caminho = decodeURIComponent(location.pathname || '').toLowerCase();
    var busca = '';
    try { busca = decodeURIComponent((location.search || '') + (location.hash || '')).toLowerCase(); } catch (e) { busca = (location.search || '').toLowerCase(); }

    var caminhoRuim = /(\/wp-|wordpress|xmlrpc|phpmyadmin|\/pma\b|\/myadmin|\/\.env|\/\.git|\/\.svn|\/\.hg|\/\.ht|\/\.ds_store|\/\.aws|\/\.ssh|\/\.vscode|\/\.idea|\/admin|\/administrator|\/cpanel|\/cgi-bin|\/vendor\/|\/node_modules|\/config\.|\/web\.config|\/server-status|\/actuator|\/console|\/shell|\/debug|\/backup|\/dump|\/etc\/passwd|\/proc\/self|\.php\b|\.asp\b|\.aspx\b|\.jsp\b|\.cgi\b|\.sql\b|\.bak\b|\.old\b|\.swp\b|\.zip\b|\.tar\b|\.gz\b|\.7z\b|\.rar\b|\.\.\/|\.\.\\)/;
    var buscaRuim = /(<script|<\/script|<iframe|<svg[^>]*on\w+=|javascript:|vbscript:|data:text\/html|onerror\s*=|onload\s*=|union[\s+]+(all[\s+]+)?select|select[\s+].+[\s+]from[\s+]|insert[\s+]+into|drop[\s+]+table|sleep\s*\(|benchmark\s*\(|waitfor[\s+]+delay|'\s*or\s*'1'\s*=\s*'1|"\s*or\s*"1"\s*=\s*"1|\bor\s+1\s*=\s*1\b|\.\.\/|\.\.\\|\/etc\/passwd|\$\{jndi:|\{\{.*\}\}|%00)/;

    if (caminhoRuim.test(caminho) || buscaRuim.test(busca)) {
      document.documentElement.innerHTML = '';
      location.replace('https://www.google.com/');
    }
  } catch (e) {}
})();
