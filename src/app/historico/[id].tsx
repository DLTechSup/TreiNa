import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Icone } from '@/components/Icone';
import { Confirmar, Numero } from '@/components/pecas';
import { Miniatura, TopoVoltar } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { porId } from '@/data';
import { useDados } from '@/db/banco';
import { detalheSessao, type ResumoSessao, type SerieRegistro } from '@/db/historico';
import { useSQLiteContext } from '@/db/sqlite';
import { dataLonga, duracao, kg } from '@/lib/datas';

export default function DetalheSessao() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { apagarSessao } = useDados();
  const [sessao, setSessao] = useState<(ResumoSessao & { registros: SerieRegistro[] }) | null | undefined>(undefined);
  const [apagar, setApagar] = useState(false);

  useEffect(() => { detalheSessao(db, id).then(setSessao); }, [db, id]);

  if (sessao === undefined) return <SafeAreaView style={{ flex: 1 }}><TopoVoltar titulo="Treino" /></SafeAreaView>;
  if (!sessao) return <SafeAreaView style={{ flex: 1 }}><TopoVoltar titulo="Treino" /><Text style={s.cinza}>Treino não encontrado.</Text></SafeAreaView>;

  // Agrupa as séries por exercício (na ordem do treino)
  const grupos: { exercicio_id: string; series: SerieRegistro[] }[] = [];
  sessao.registros.forEach((se) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.exercicio_id === se.exercicio_id) ultimo.series.push(se);
    else grupos.push({ exercicio_id: se.exercicio_id, series: [se] });
  });
  const hora = new Date(sessao.iniciado_em);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <TopoVoltar titulo="Treino feito" />
      <ScrollView contentContainerStyle={s.conteudo}>
        <View style={{ gap: 4 }}>
          <Text style={s.titulo}>{sessao.nome || 'Treino'}</Text>
          <Text style={s.cinza}>{dataLonga(sessao.data)} · {String(hora.getHours()).padStart(2, '0')}:{String(hora.getMinutes()).padStart(2, '0')}</Text>
        </View>
        <View style={s.numeros}>
          <Numero valor={duracao(sessao.duracao_s)} rotulo="tempo" />
          <Numero valor={String(sessao.exercicios)} rotulo="exercícios" />
          <Numero valor={String(sessao.series)} rotulo="séries" />
        </View>
        {sessao.volume > 0 && <Text style={s.cinza}>Volume total: {kg(sessao.volume)} (carga × repetições)</Text>}

        {grupos.map((g, i) => {
          const e = porId(g.exercicio_id);
          return (
            <Pressable key={`${g.exercicio_id}-${i}`} style={s.ex} onPress={() => router.push({ pathname: '/historico/exercicio/[id]', params: { id: g.exercicio_id } })}>
              <View style={s.exTopo}>
                <Miniatura id={g.exercicio_id} tamanho={48} />
                <View style={{ flex: 1 }}>
                  <Text style={s.exNome} numberOfLines={2}>{e?.nome ?? g.exercicio_id}</Text>
                  <Text style={s.cinzaPeq}>{e?.grupo} · {e?.equipamento}</Text>
                </View>
                <Icone nome="seta" tamanho={18} cor={cores.texto3} />
              </View>
              {g.series.map((se) => (
                <View key={se.serie} style={s.serie}>
                  <Text style={s.serieNum}>Série {se.serie}</Text>
                  <Text style={s.serieValor}>
                    {se.carga != null ? `${kg(se.carga)} × ` : ''}{se.repeticoes ?? '—'} {e?.medida === 'tempo' ? 's' : 'reps'}
                  </Text>
                </View>
              ))}
            </Pressable>
          );
        })}

        <Text onPress={() => setApagar(true)} style={s.apagar}>Apagar este treino do histórico</Text>
      </ScrollView>
      <Confirmar visivel={apagar} titulo="Apagar este treino?" texto="Ele sai do histórico, do calendário e dos recordes. Isso não pode ser desfeito."
        confirmar="Apagar" perigo onCancelar={() => setApagar(false)}
        onConfirmar={async () => { await apagarSessao(sessao.id); setApagar(false); router.back(); }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  conteudo: { padding: 20, gap: 14, paddingBottom: 40 },
  titulo: { fontFamily: fontes.titulo, fontSize: 24, color: cores.texto },
  cinza: { fontFamily: fontes.regular, fontSize: 13, color: cores.texto2, paddingHorizontal: 0 },
  cinzaPeq: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2, marginTop: 2 },
  numeros: { flexDirection: 'row', gap: 8 },
  ex: { backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.g, padding: 12, gap: 8 },
  exTopo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exNome: { fontFamily: fontes.semi, fontSize: 14, color: cores.texto },
  serie: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderColor: cores.borda },
  serieNum: { fontFamily: fontes.media, fontSize: 13, color: cores.texto2 },
  serieValor: { fontFamily: fontes.semi, fontSize: 13, color: cores.texto },
  apagar: { textAlign: 'center', fontFamily: fontes.semi, fontSize: 13, color: '#C2410C', padding: 12 },
});
