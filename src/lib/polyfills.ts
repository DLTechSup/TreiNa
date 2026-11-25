// No navegador (site/PWA) URL e localStorage já existem.
// Só um ajuste: quando um vídeo sai da tela antes de começar a tocar, o navegador avisa
// "play() interrupted" (AbortError). Isso é normal e não é erro do app, então é ignorado.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('unhandledrejection', (e) => {
    const r = (e as PromiseRejectionEvent).reason as { name?: string } | undefined;
    if (r?.name === 'AbortError') e.preventDefault();
  });
}
export {};
