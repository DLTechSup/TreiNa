// Sons do modo treino — versão SITE. Usa o Web Audio (gera os bipes na hora), que funciona
// no iPhone depois do primeiro toque na tela (por isso o prepararSons() vai no botão "Começar").
export type Som = 'alarme' | 'bip' | 'valendo' | 'fim';

let ctx: AudioContext | null = null;

export function prepararSons() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    // toque silencioso para "destravar" o áudio no iPhone
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.02);
  } catch {
    /* sem áudio: segue só com o visual */
  }
}

function bipe(freq: number, inicio: number, dur: number, vol = 0.35) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  const t0 = ctx.currentTime + inicio;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export function tocar(som: Som) {
  if (!ctx) prepararSons();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (som === 'bip') bipe(880, 0, 0.12);
  else if (som === 'valendo') bipe(1319, 0, 0.35, 0.4);
  else if (som === 'fim') [784, 988, 1175, 1568].forEach((f, i) => bipe(f, i * 0.17, i === 3 ? 0.4 : 0.14));
  else {
    // alarme: 3 bipes subindo, 2 vezes
    let t = 0;
    for (let r = 0; r < 2; r++) {
      for (const f of [880, 988, 1175]) { bipe(f, t, 0.16, 0.45); t += 0.22; }
      t += 0.18;
    }
  }
}

export function vibrar(forte = false) {
  try { navigator.vibrate?.(forte ? [300, 120, 300] : 120); } catch { /* iPhone não vibra pelo site */ }
}

export function liberarSons() {
  /* o contexto de áudio fica aberto para o próximo treino */
}
