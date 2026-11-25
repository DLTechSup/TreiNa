import { useEffect, useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';

import { Icone } from '@/components/Icone';
import { BotaoIcone, Miniatura, TopoVoltar } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { nomeMedida, porId, variacoes } from '@/data';
import { videos } from '@/data/midia';
import { useDados } from '@/db/banco';

export default function FichaExercicio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const e = porId(id);
  if (!e) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <TopoVoltar />
        <Text style={[s.texto, { padding: 20 }]}>Exercício não encontrado.</Text>
      </SafeAreaView>
    );
  }
  return <Ficha key={e.id} id={e.id} />;
}

function Ficha({ id }: { id: string }) {
  const router = useRouter();
  const e = porId(id)!;
  const { favoritos, alternarFavorito } = useDados();
  const favorito = favoritos.has(e.id);
  const lista = useMemo(() => variacoes(e), [e]);

  // Vídeo em loop, sem som, começando sozinho (como um GIF)
  const player = useVideoPlayer(videos[e.id], (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  // No site o vídeo só existe depois que a tela aparece: manda tocar de novo (no iPhone, em linha e sem som).
  useEffect(() => {
    if (Platform.OS === 'web') player.play();
  }, [player]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <TopoVoltar
        titulo={`${e.grupo} › ${e.padrao}`}
        direita={
          <BotaoIcone rotulo={favorito ? 'Remover dos favoritos' : 'Favoritar'} onPress={() => alternarFavorito(e.id)}>
            <Icone nome="estrela" tamanho={20} cor={favorito ? cores.roxo : cores.texto} preenchido={favorito} />
          </BotaoIcone>
        }
      />
      <ScrollView contentContainerStyle={s.conteudo}>
        <View style={s.video}>
          <VideoView player={player} style={s.videoView} contentFit="contain" nativeControls={false} playsInline />
          <Text style={s.selo}>{e.medida === 'tempo' ? 'POSIÇÃO / TEMPO' : 'EM LOOP'}</Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={s.nome}>{e.nome}</Text>
          <View style={s.tags}>
            <Text style={[s.tag, s.tagRoxa]}>{e.grupo}</Text>
            <Text style={s.tag}>{e.equipamento}</Text>
            <Text style={s.tag}>{e.tipo} · {nomeMedida(e)}</Text>
            {e.foco ? <Text style={[s.tag, s.tagLima]}>Foco feminino: {e.foco}</Text> : null}
          </View>
          {e.secundarios.length > 0 && (
            <Text style={s.texto}><Text style={s.negrito}>Também trabalha: </Text>{e.secundarios.join(', ')}</Text>
          )}
        </View>

        <View style={s.cartao}>
          <Text style={s.subtitulo}>Como fazer</Text>
          {e.passos.map((p, i) => (
            <View key={i} style={s.passo}>
              <Text style={s.passoNum}>{i + 1}</Text>
              <Text style={[s.texto, { flex: 1 }]}>{p}</Text>
            </View>
          ))}
          {!!e.erro && (
            <View style={s.erro}>
              <Icone nome="alerta" tamanho={16} cor={cores.alertaTexto} />
              <Text style={s.erroTexto}><Text style={s.negrito}>Erro comum: </Text>{e.erro}</Text>
            </View>
          )}
        </View>

        {lista.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={s.subtitulo}>
              Variações deste exercício <Text style={s.cinza}>· {lista.length}</Text>
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {lista.slice(0, 20).map((v) => (
                <Pressable key={v.id} style={({ pressed }) => [s.variacao, pressed && { opacity: 0.7 }]}
                  onPress={() => router.push({ pathname: '/exercicio/[id]', params: { id: v.id } })}>
                  <Miniatura id={v.id} tamanho={112} raioBorda={12} />
                  <Text style={s.variacaoNome} numberOfLines={2}>{v.nome}</Text>
                  <Text style={s.variacaoInfo} numberOfLines={1}>{v.equipamento}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  conteudo: { paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  video: {
    backgroundColor: '#FFFFFF', borderRadius: raio.g, borderWidth: 1, borderColor: cores.borda,
    aspectRatio: 1, maxHeight: 360, alignSelf: 'stretch', overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  videoView: { width: '100%', height: '100%', backgroundColor: '#FFFFFF' },
  selo: {
    position: 'absolute', left: 12, top: 12, backgroundColor: cores.escuro, color: cores.lima, overflow: 'hidden',
    fontFamily: fontes.negrito, fontSize: 11, letterSpacing: 0.4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  nome: { fontFamily: fontes.titulo, fontSize: 23, color: cores.texto, letterSpacing: -0.3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    fontFamily: fontes.media, fontSize: 12, color: cores.texto, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: raio.pill, overflow: 'hidden',
  },
  tagRoxa: { backgroundColor: cores.lilas, borderColor: cores.lilas, color: cores.roxoEscuro, fontFamily: fontes.semi },
  tagLima: { backgroundColor: cores.lima, borderColor: cores.lima, fontFamily: fontes.semi },
  texto: { fontFamily: fontes.regular, fontSize: 14, color: cores.texto, lineHeight: 20 },
  negrito: { fontFamily: fontes.negrito },
  cinza: { fontFamily: fontes.regular, color: cores.texto2 },
  cartao: { backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: 16, padding: 14, gap: 10 },
  subtitulo: { fontFamily: fontes.negrito, fontSize: 16, color: cores.texto },
  passo: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  passoNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: cores.escuro, color: cores.lima, textAlign: 'center',
    lineHeight: 24, fontFamily: fontes.negrito, fontSize: 12, overflow: 'hidden',
  },
  erro: { flexDirection: 'row', gap: 8, backgroundColor: cores.alertaFundo, borderRadius: 10, padding: 10, alignItems: 'flex-start' },
  erroTexto: { flex: 1, fontFamily: fontes.regular, fontSize: 13, color: cores.alertaTexto, lineHeight: 18 },
  variacao: { width: 112, gap: 4 },
  variacaoNome: { fontFamily: fontes.semi, fontSize: 12, color: cores.texto, lineHeight: 16 },
  variacaoInfo: { fontFamily: fontes.regular, fontSize: 11, color: cores.texto2 },
});
