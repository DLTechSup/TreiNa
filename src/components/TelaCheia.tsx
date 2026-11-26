import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { cores, fontes } from '@/constants/tema';
import { porId } from '@/data';
import { Icone } from './Icone';
import { VideoDoExercicio } from './Midia';

/**
 * Vídeo do exercício ocupando a tela inteira, para ver a execução com calma.
 * Fecha no ✕, no "voltar" do Android e no voltar do navegador (no site).
 * Fica dentro da própria tela/janela que abriu (assim funciona até por cima do "Adicionar exercícios").
 */
function JanelaTelaCheia({ id, onFechar }: { id: string; onFechar: () => void }) {
  const e = porId(id);
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  // No site: o "voltar" do navegador/celular fecha o vídeo em vez de sair da tela
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    let fechouPeloVoltar = false;
    window.history.pushState({ ...(window.history.state ?? {}), treinaTelaCheia: true }, '');
    const aoVoltar = () => { fechouPeloVoltar = true; fechar.current(); };
    window.addEventListener('popstate', aoVoltar);
    return () => {
      window.removeEventListener('popstate', aoVoltar);
      if (!fechouPeloVoltar && window.history.state?.treinaTelaCheia) window.history.back();
    };
  }, []);

  // Esc fecha (computador)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const tecla = (ev: KeyboardEvent) => { if (ev.key === 'Escape') fechar.current(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onFechar} statusBarTranslucent navigationBarTranslucent
      supportedOrientations={['portrait', 'landscape']} presentationStyle="fullScreen">
      <SafeAreaProvider>
        <View style={s.fundo}>
          <SafeAreaView edges={['top', 'left', 'right']} style={s.topo}>
            <Text style={s.nome} numberOfLines={2}>{e?.nome ?? ''}</Text>
            <Pressable onPress={onFechar} style={({ pressed }) => [s.fechar, pressed && { opacity: 0.7 }]}
              accessibilityRole="button" accessibilityLabel="Fechar tela cheia" hitSlop={10}>
              <Icone nome="fechar" tamanho={24} cor={cores.textoClaro} espessura={2.4} />
            </Pressable>
          </SafeAreaView>
          <View style={s.video}>
            <VideoDoExercicio id={id} ajuste="contain" />
          </View>
          <SafeAreaView edges={['bottom', 'left', 'right']} style={s.rodape}>
            <Text style={s.dica}>Toque no ✕ para voltar</Text>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

/** Selinho de "tela cheia" por cima do vídeo/foto (só mostra que dá para ampliar). */
function Selo({ pequeno }: { pequeno?: boolean }) {
  const t = pequeno ? 18 : 34;
  return (
    <View pointerEvents="none" style={[s.selo, pequeno ? s.seloPequeno : s.seloGrande, { width: t, height: t, borderRadius: t / 2 }]}>
      <Icone nome="telaCheia" tamanho={pequeno ? 11 : 18} cor="#FFFFFF" espessura={pequeno ? 2.6 : 2.2} />
    </View>
  );
}

/**
 * Deixa o vídeo/foto tocável: um toque abre o exercício em tela cheia.
 * `selo`: 'grande' (vídeo grande), 'pequeno' (foto pequena de lista) ou false.
 */
export function ToqueTelaCheia({ id, children, style, selo = 'grande' }: {
  id: string; children: ReactNode; style?: StyleProp<ViewStyle>; selo?: 'grande' | 'pequeno' | false;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Pressable onPress={() => setAberto(true)} style={style} accessibilityRole="button"
        accessibilityLabel={`Ver ${porId(id)?.nome ?? 'exercício'} em tela cheia`}>
        {children}
        {selo ? <Selo pequeno={selo === 'pequeno'} /> : null}
      </Pressable>
      {aberto && <JanelaTelaCheia id={id} onFechar={() => setAberto(false)} />}
    </>
  );
}

/** Botão redondo de "tela cheia" (para cartões onde o toque já faz outra coisa, como marcar). */
export function BotaoTelaCheia({ id, style }: { id: string; style?: StyleProp<ViewStyle> }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Pressable onPress={() => setAberto(true)} hitSlop={8}
        style={({ pressed }) => [s.botao, style, pressed && { opacity: 0.75 }]}
        accessibilityRole="button" accessibilityLabel={`Ver ${porId(id)?.nome ?? 'exercício'} em tela cheia`}>
        <Icone nome="telaCheia" tamanho={18} cor="#FFFFFF" espessura={2.2} />
      </Pressable>
      {aberto && <JanelaTelaCheia id={id} onFechar={() => setAberto(false)} />}
    </>
  );
}

const s = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#000' },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 18, paddingRight: 8, paddingVertical: 6, backgroundColor: '#000' },
  nome: { flex: 1, fontFamily: fontes.semi, fontSize: 17, lineHeight: 22, color: cores.textoClaro },
  fechar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  video: { flex: 1, position: 'relative' },
  rodape: { alignItems: 'center', paddingTop: 8, paddingBottom: 10, backgroundColor: '#000' },
  dica: { fontFamily: fontes.media, fontSize: 13, color: 'rgba(255,255,255,0.6)', paddingBottom: 4 },
  selo: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(22,22,29,0.62)' },
  seloGrande: { top: 10, right: 10 },
  seloPequeno: { right: 3, bottom: 3 },
  botao: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(22,22,29,0.66)' },
});
