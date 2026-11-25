// Sons e vibração do modo treino — versão Android/iOS (no site o Metro usa o som.web.ts).
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

export type Som = 'alarme' | 'bip' | 'valendo' | 'fim';

const arquivos: Record<Som, number> = {
  alarme: require('../../assets/sons/alarme.wav'),
  bip: require('../../assets/sons/bip.wav'),
  valendo: require('../../assets/sons/valendo.wav'),
  fim: require('../../assets/sons/fim.wav'),
};

let players: Partial<Record<Som, AudioPlayer>> = {};
let preparado = false;

/** Chamar num toque da pessoa (botão "Começar"): deixa os sons prontos e tocando mesmo no silencioso. */
export function prepararSons() {
  if (preparado) return;
  preparado = true;
  setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => {});
  (Object.keys(arquivos) as Som[]).forEach((s) => { players[s] = createAudioPlayer(arquivos[s]); });
}

export function tocar(som: Som) {
  if (!preparado) prepararSons();
  const p = players[som];
  if (!p) return;
  p.seekTo(0).catch(() => {});
  p.play();
}

export function vibrar(forte = false) {
  if (forte) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function liberarSons() {
  Object.values(players).forEach((p) => p?.remove());
  players = {};
  preparado = false;
}
