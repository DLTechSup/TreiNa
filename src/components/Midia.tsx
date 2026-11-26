import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';

import { cores, fontes } from '@/constants/tema';
import { gifDoVideo, porId } from '@/data';
import { miniaturas, videos } from '@/data/midia';
import { useMiniaturaPrivada, useVideoPrivado } from '@/lib/midiaPrivada';

type Ajuste = 'cover' | 'contain';

/**
 * Imagem parada do exercício: a do GIF do app, ou a "foto" do vídeo próprio guardado no celular.
 * Enquanto o vídeo próprio não foi atualizado, mostra um quadro escuro com ▶ (e um aviso, se `aviso`).
 */
export function MiniaturaExercicio({ id, style, ajuste = 'cover', aviso }: {
  id: string; style?: StyleProp<ImageStyle>; ajuste?: Ajuste; aviso?: boolean;
}) {
  const e = porId(id);
  const privada = useMiniaturaPrivada(e?.video);
  if (!e?.video) return <Image source={miniaturas[id]} style={style} contentFit={ajuste} transition={120} />;
  if (privada) return <Image source={{ uri: privada }} style={[style, { backgroundColor: '#000' }]} contentFit="cover" />;
  // Sem a foto do vídeo ainda: usa a do GIF do mesmo exercício, se existir
  const gif = gifDoVideo(id);
  if (gif && miniaturas[gif]) return <Image source={miniaturas[gif]} style={style} contentFit={ajuste} transition={120} />;
  return (
    <View style={[style as StyleProp<ViewStyle>, s.vazio]}>
      <Text style={s.vazioIcone}>▶</Text>
      {aviso ? <Text style={s.vazioTexto}>Vídeo indisponível no momento.</Text> : null}
    </View>
  );
}

/** Vídeo do exercício em loop, sem som (GIF do app ou vídeo próprio guardado no celular). */
export function VideoDoExercicio({ id, ajuste = 'contain', style }: { id: string; ajuste?: Ajuste; style?: StyleProp<ViewStyle> }) {
  const e = porId(id);
  const privado = useVideoPrivado(e?.video);
  // Vídeo próprio indisponível agora (sem acesso/sem internet): mostra o GIF do mesmo exercício, se houver
  const gif = e?.video ? gifDoVideo(id) : undefined;
  const usarGif = !!e?.video && privado.indisponivel && !!gif && videos[gif] != null;
  const fonte: VideoSource | null = !e?.video ? (videos[id] ?? null) : usarGif ? videos[gif!] : privado.url;
  // o aviso só aparece se o vídeo demorar (normalmente ele chega em instantes)
  const [demorou, setDemorou] = useState(false);
  useEffect(() => {
    setDemorou(false);
    const t = setTimeout(() => setDemorou(true), 2500);
    return () => clearTimeout(t);
  }, [id]);
  if (fonte == null) {
    return <MiniaturaExercicio id={id} style={[StyleSheet.absoluteFill, style as StyleProp<ImageStyle>]} ajuste={ajuste} aviso={demorou} />;
  }
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: e?.video && !usarGif ? '#000' : '#FFFFFF' }, style]}>
      <Reprodutor key={String(fonte)} fonte={fonte} ajuste={usarGif ? 'contain' : ajuste} />
    </View>
  );
}

function Reprodutor({ fonte, ajuste }: { fonte: VideoSource; ajuste: Ajuste }) {
  const player = useVideoPlayer(fonte, (p) => { p.loop = true; p.muted = true; p.play(); });
  // No site o vídeo só existe depois que a tela aparece: manda tocar de novo (no iPhone, em linha e sem som).
  useEffect(() => { if (Platform.OS === 'web') player.play(); }, [player]);
  return <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit={ajuste} nativeControls={false} playsInline />;
}

const s = StyleSheet.create({
  vazio: { backgroundColor: cores.escuro2, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, overflow: 'hidden' },
  vazioIcone: { color: cores.lima, fontSize: 16 },
  vazioTexto: { fontFamily: fontes.media, fontSize: 12, color: cores.textoClaro2, textAlign: 'center', lineHeight: 16 },
});
