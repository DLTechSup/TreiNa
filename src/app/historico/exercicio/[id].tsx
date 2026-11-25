import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { Botao, Miniatura, TopoVoltar } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { porId } from '@/data';
import { useDados } from '@/db/banco';
import { evolucaoExercicio, recordes, type PontoEvolucao } from '@/db/historico';
import { useSQLiteContext } from '@/db/sqlite';
import { dataCurta, dataLonga, kg } from '@/lib/datas';

export default function EvolucaoExercicio() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { versaoHistorico } = useDados();
  const e = porId(id);
  const [pontos, setPontos] = useState<PontoEvolucao[] | null>(null);

  useEffect(() => { evolucaoExercicio(db, id).then(setPontos); }, [db, id, versaoHistorico]);

  const r = pontos ? recordes(pontos) : null;
  const comCarga = (pontos ?? []).filter((p) => p.maior_carga != null && p.maior_carga > 0);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <TopoVoltar titulo="Evolução" />
      <ScrollView contentContainerStyle={s.conteudo}>
        <View style={s.topo}>
          <Miniatura id={id} tamanho={64} raioBorda={14} />
          <View style={{ flex: 1 }}>
            <Text style={s.nome}>{e?.nome ?? id}</Text>
            <Text style={s.cinza}>{e?.grupo} · {e?.equipamento}</Text>
          </View>
        </View>

        <Text style={s.secao}>Recordes pessoais</Text>
        <View style={s.recordes}>
          <Recorde titulo="Maior carga" valor={r?.carga ? kg(r.carga.valor) : '—'} detalhe={r?.carga ? `${r.carga.reps ?? '—'} reps · ${dataCurta(r.carga.data)}` : 'sem carga registrada'} destaque />
          <Recorde titulo={e?.medida === 'tempo' ? 'Maior tempo' : 'Mais repetições'} valor={r?.reps ? `${r.reps.valor}${e?.medida === 'tempo' ? ' s' : ''}` : '—'} detalhe={r?.reps ? dataCurta(r.reps.data) : ''} />
          <Recorde titulo="Maior volume num treino" valor={r?.volume ? kg(r.volume.valor) : '—'} detalhe={r?.volume ? dataCurta(r.volume.data) : ''} />
        </View>

        <Text style={s.secao}>Evolução de carga</Text>
        {comCarga.length >= 2 ? (
          <Grafico pontos={comCarga} />
        ) : (
          <Text style={s.cinza}>
            {comCarga.length === 1 ? 'Faça este exercício mais uma vez com carga para ver o gráfico.' : 'Registre a carga (kg) durante o treino para acompanhar a evolução.'}
          </Text>
        )}

        <Text style={s.secao}>Treino a treino</Text>
        {(pontos ?? []).slice().reverse().map((p) => (
          <View key={p.sessao_id} style={s.linha}>
            <View style={{ flex: 1 }}>
              <Text style={s.linhaData}>{dataLonga(p.data)}</Text>
              <Text style={s.cinzaPeq}>{p.series} séries{p.volume ? ` · volume ${kg(p.volume)}` : ''}</Text>
            </View>
            <Text style={s.linhaValor}>
              {p.maior_carga != null ? `${kg(p.maior_carga)} × ${p.reps_na_maior ?? '—'}` : `${p.maior_reps ?? '—'} ${e?.medida === 'tempo' ? 's' : 'reps'}`}
            </Text>
          </View>
        ))}

        <Botao texto="Ver como fazer o exercício" tipo="contorno" onPress={() => router.push({ pathname: '/exercicio/[id]', params: { id } })} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Recorde({ titulo, valor, detalhe, destaque }: { titulo: string; valor: string; detalhe: string; destaque?: boolean }) {
  return (
    <View style={[s.recorde, destaque && { backgroundColor: cores.escuro, borderColor: cores.escuro }]}>
      <Text style={[s.recTitulo, destaque && { color: cores.textoClaro2 }]}>{titulo}</Text>
      <Text style={[s.recValor, destaque && { color: cores.lima }]} numberOfLines={1}>{valor}</Text>
      {detalhe ? <Text style={[s.cinzaPeq, destaque && { color: cores.textoClaro2 }]}>{detalhe}</Text> : null}
    </View>
  );
}

/** Linha simples da maior carga de cada treino. */
function Grafico({ pontos }: { pontos: PontoEvolucao[] }) {
  const L = 320, A = 180, mx = 34, my = 18;
  const valores = pontos.map((p) => p.maior_carga as number);
  const min = Math.min(...valores), max = Math.max(...valores);
  const faixa = max - min || 1;
  const x = (i: number) => mx + (i * (L - mx - 12)) / Math.max(1, pontos.length - 1);
  const y = (v: number) => my + (1 - (v - min) / faixa) * (A - my * 2 - 10);
  const pts = pontos.map((p, i) => `${x(i)},${y(p.maior_carga as number)}`).join(' ');
  return (
    <View style={s.grafico}>
      <Svg width="100%" height={A} viewBox={`0 0 ${L} ${A}`}>
        <Line x1={mx} y1={y(max)} x2={L - 8} y2={y(max)} stroke={cores.borda} strokeDasharray="4 4" />
        <Line x1={mx} y1={y(min)} x2={L - 8} y2={y(min)} stroke={cores.borda} strokeDasharray="4 4" />
        <SvgText x={2} y={y(max) + 4} fontSize={10} fill={cores.texto2}>{String(max).replace('.', ',')}</SvgText>
        <SvgText x={2} y={y(min) + 4} fontSize={10} fill={cores.texto2}>{String(min).replace('.', ',')}</SvgText>
        <Polyline points={pts} fill="none" stroke={cores.roxo} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {pontos.map((p, i) => (
          <Circle key={p.sessao_id} cx={x(i)} cy={y(p.maior_carga as number)} r={i === pontos.length - 1 ? 5 : 3.5}
            fill={p.maior_carga === max ? cores.lima : cores.roxo} stroke={cores.cartao} strokeWidth={1.5} />
        ))}
        <SvgText x={mx} y={A - 2} fontSize={10} fill={cores.texto2}>{dataCurta(pontos[0].data)}</SvgText>
        <SvgText x={L - 8} y={A - 2} fontSize={10} fill={cores.texto2} textAnchor="end">{dataCurta(pontos[pontos.length - 1].data)}</SvgText>
      </Svg>
      <Text style={s.cinzaPeq}>Maior carga (kg) de cada treino. Em verde, o recorde.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  conteudo: { padding: 20, gap: 14, paddingBottom: 40 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nome: { fontFamily: fontes.titulo, fontSize: 20, color: cores.texto },
  cinza: { fontFamily: fontes.regular, fontSize: 13, color: cores.texto2 },
  cinzaPeq: { fontFamily: fontes.regular, fontSize: 11, color: cores.texto2, marginTop: 2 },
  secao: { fontFamily: fontes.titulo, fontSize: 17, color: cores.texto, marginTop: 6 },
  recordes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recorde: { flexGrow: 1, flexBasis: '30%', backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.m, padding: 12 },
  recTitulo: { fontFamily: fontes.media, fontSize: 11, color: cores.texto2 },
  recValor: { fontFamily: fontes.titulo, fontSize: 20, color: cores.texto, marginTop: 2 },
  grafico: { backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.g, padding: 12, gap: 6 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.m, padding: 12 },
  linhaData: { fontFamily: fontes.semi, fontSize: 13, color: cores.texto },
  linhaValor: { fontFamily: fontes.titulo, fontSize: 15, color: cores.roxo },
});
