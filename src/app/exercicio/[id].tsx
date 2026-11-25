import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';

import { Icone } from '@/components/Icone';
import { Botao, BotaoIcone, Miniatura, TopoVoltar } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { porId, variacoes } from '@/data';
import { videos } from '@/data/midia';
import { NOMES_DIAS, novoId, useDados } from '@/db/banco';

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
  const { favoritos, alternarFavorito, semana, salvarDia } = useDados();
  const [escolherDia, setEscolherDia] = useState(false);
  const [adicionado, setAdicionado] = useState<string | null>(null);
  const adicionarNoDia = async (dia: number) => {
    const d = semana[dia - 1];
    const tempo = e.medida === 'tempo';
    await salvarDia({
      ...d,
      nome: d.nome || e.grupo,
      grupos: d.grupos.includes(e.grupo) ? d.grupos : [...d.grupos, e.grupo],
      itens: [...d.itens, { id: novoId(), exercicio_id: e.id, series: 3, repeticoes: tempo ? '30 s' : '12', carga: null, descanso: 60 }],
    });
    setEscolherDia(false);
    setAdicionado(NOMES_DIAS[dia]);
  };
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
        titulo={e.grupo}
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
          <View style={s.ficha}>
            <Info rotulo="Músculo trabalhado" valor={e.grupo} />
            <Info rotulo="Aparelho / equipamento" valor={e.equipamento} />
            <Info rotulo="Movimento" valor={e.padrao} />
            {e.secundarios.length > 0 && <Info rotulo="Também trabalha" valor={e.secundarios.join(', ')} />}
            {e.foco ? <Info rotulo="Foco feminino" valor={e.foco} /> : null}
          </View>
          <Botao texto={adicionado ? `Adicionado ao treino de ${adicionado.toLowerCase()} ✓` : '+ Adicionar ao meu treino'}
            tipo={adicionado ? 'contorno' : 'principal'} onPress={() => setEscolherDia(true)} />
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
            <View style={s.gradeVar}>
              {lista.slice(0, 6).map((v) => (
                <Pressable key={v.id} style={({ pressed }) => [s.variacao, pressed && { opacity: 0.7 }]}
                  onPress={() => router.push({ pathname: '/exercicio/[id]', params: { id: v.id } })}>
                  <Miniatura id={v.id} tamanho={96} raioBorda={12} />
                  <Text style={s.variacaoNome} numberOfLines={2}>{v.nome}</Text>
                  <Text style={s.variacaoInfo} numberOfLines={1}>{v.equipamento}</Text>
                </Pressable>
              ))}
            </View>
            {lista.length > 6 && (
              <Text style={s.verTodas} onPress={() => router.navigate({ pathname: '/biblioteca', params: { grupo: e.grupo } })}>
                Ver todos os exercícios de {e.grupo}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={escolherDia} transparent animationType="slide" onRequestClose={() => setEscolherDia(false)}>
        <Pressable style={s.modalFundo} onPress={() => setEscolherDia(false)}>
          <Pressable style={s.modalPainel} onPress={() => {}}>
            <Text style={s.subtitulo}>Em qual dia?</Text>
            <Text style={s.cinza}>Entra com 3 séries de 12 e 60 s de descanso. Depois você ajusta no dia.</Text>
            {semana.map((d) => (
              <Pressable key={d.dia} onPress={() => adicionarNoDia(d.dia)} style={({ pressed }) => [s.diaLinha, pressed && { backgroundColor: cores.lilas }]}>
                <Text style={s.diaNome}>{NOMES_DIAS[d.dia]}</Text>
                <Text style={s.cinza} numberOfLines={1}>{d.itens.length ? `${d.nome} · ${d.itens.length} exerc.` : 'descanso'}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={s.info}>
      <Text style={s.infoRotulo}>{rotulo}</Text>
      <Text style={s.infoValor}>{valor}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  ficha: { backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: 16, paddingHorizontal: 14 },
  info: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: cores.borda },
  infoRotulo: { fontFamily: fontes.regular, fontSize: 13, color: cores.texto2 },
  infoValor: { flex: 1, textAlign: 'right', fontFamily: fontes.semi, fontSize: 13, color: cores.texto },
  gradeVar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  verTodas: { fontFamily: fontes.semi, fontSize: 13, color: cores.roxo, paddingVertical: 4 },
  modalFundo: { flex: 1, backgroundColor: 'rgba(22,22,29,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalPainel: { width: '100%', maxWidth: 560, backgroundColor: cores.cartao, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28, gap: 6 },
  diaLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10 },
  diaNome: { fontFamily: fontes.semi, fontSize: 15, color: cores.texto },
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
