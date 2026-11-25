import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Icone } from '@/components/Icone';
import { Numero, Segmentado } from '@/components/pecas';
import { Botao, Miniatura, Titulo } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { porId } from '@/data';
import { useDados } from '@/db/banco';
import {
  datasComTreino, exerciciosFeitos, resumoDoAno, sequencias, sessoesEntre, todasSessoes,
  type ResumoExercicio, type ResumoSessao,
} from '@/db/historico';
import { useSQLiteContext } from '@/db/sqlite';
import { MESES, MESES_CURTOS, chaveDia, dataCurta, dataLonga, duracao, kg } from '@/lib/datas';

type Aba = 'dias' | 'mes' | 'ano' | 'exercicios';
const dois = (n: number) => String(n).padStart(2, '0');

export default function Historico() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { versaoHistorico } = useDados();
  const hoje = new Date();
  const [aba, setAba] = useState<Aba>('dias');
  const [mes, setMes] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [ano, setAno] = useState(hoje.getFullYear());
  const [diaEscolhido, setDiaEscolhido] = useState<string | null>(null);

  const [seq, setSeq] = useState({ atual: 0, melhor: 0, total: 0 });
  const [todas, setTodas] = useState<ResumoSessao[]>([]);
  const [doMes, setDoMes] = useState<ResumoSessao[]>([]);
  const [diasMes, setDiasMes] = useState<Set<string>>(new Set());
  const [meses, setMeses] = useState<{ treinos: number; segundos: number }[]>([]);
  const [exs, setExs] = useState<ResumoExercicio[]>([]);
  const [carregado, setCarregado] = useState(false);

  const inicioMes = `${mes.ano}-${dois(mes.mes + 1)}-01`;
  const fimMes = `${mes.ano}-${dois(mes.mes + 1)}-31`;

  useEffect(() => {
    (async () => {
      setSeq(await sequencias(db, chaveDia(new Date())));
      setTodas(await todasSessoes(db));
      setExs(await exerciciosFeitos(db));
      setCarregado(true);
    })();
  }, [db, versaoHistorico]);

  useEffect(() => {
    (async () => {
      setDoMes(await sessoesEntre(db, inicioMes, fimMes));
      setDiasMes(await datasComTreino(db, inicioMes, fimMes));
    })();
  }, [db, versaoHistorico, inicioMes, fimMes]);

  useEffect(() => { resumoDoAno(db, ano).then(setMeses); }, [db, versaoHistorico, ano]);

  // Agrupa por dia para a aba "Dia a dia"
  const porDia = useMemo(() => {
    const m = new Map<string, ResumoSessao[]>();
    todas.forEach((x) => { if (!m.has(x.data)) m.set(x.data, []); m.get(x.data)!.push(x); });
    return [...m.entries()];
  }, [todas]);

  const mesAtual = mes.ano === hoje.getFullYear() && mes.mes === hoje.getMonth();
  const treinosMes = doMes.length;
  const tempoMes = doMes.reduce((n, x) => n + (x.duracao_s ?? 0), 0);

  if (carregado && !todas.length) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.conteudo}>
          <Titulo>Histórico</Titulo>
          <View style={s.vazio}>
            <Icone nome="historico" tamanho={36} cor={cores.roxo} />
            <Text style={s.vazioTitulo}>Seu histórico começa no primeiro treino</Text>
            <Text style={s.vazioTexto}>
              Aqui aparecem os dias que você treinou, o calendário do mês, cada exercício com as cargas, a sua sequência de dias e a evolução e os recordes de carga.
            </Text>
            <Botao texto="Ir para os treinos" onPress={() => router.navigate('/treinos')} style={{ alignSelf: 'stretch' }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const sessoesDoDia = diaEscolhido ? doMes.filter((x) => x.data === diaEscolhido) : [];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.conteudo}>
        <Titulo>Histórico</Titulo>

        <View style={s.numeros}>
          <Numero valor={`${seq.atual} ${seq.atual === 1 ? 'dia' : 'dias'}`} rotulo={`sequência atual · recorde ${seq.melhor}`} escuro />
          <Numero valor={String(seq.total)} rotulo="dias treinados no total" />
        </View>

        <Segmentado<Aba> valor={aba} onMudar={setAba} opcoes={[
          { valor: 'dias', texto: 'Dia a dia' }, { valor: 'mes', texto: 'Mês' }, { valor: 'ano', texto: 'Ano' }, { valor: 'exercicios', texto: 'Recordes' },
        ]} />

        {aba === 'dias' && porDia.map(([data, lista]) => (
          <View key={data} style={{ gap: 8 }}>
            <Text style={s.dataTitulo}>{dataLonga(data)}</Text>
            {lista.map((x) => <CartaoSessao key={x.id} sessao={x} onPress={() => router.push({ pathname: '/historico/[id]', params: { id: x.id } })} />)}
          </View>
        ))}

        {aba === 'mes' && (
          <View style={{ gap: 14 }}>
            <View style={s.nav}>
              <Pressable onPress={() => { setDiaEscolhido(null); setMes((m) => (m.mes ? { ...m, mes: m.mes - 1 } : { ano: m.ano - 1, mes: 11 })); }} style={s.navBotao} accessibilityLabel="Mês anterior">
                <Icone nome="voltar" tamanho={18} />
              </Pressable>
              <Text style={s.navTitulo}>{MESES[mes.mes][0].toUpperCase() + MESES[mes.mes].slice(1)} de {mes.ano}</Text>
              <Pressable disabled={mesAtual} onPress={() => { setDiaEscolhido(null); setMes((m) => (m.mes < 11 ? { ...m, mes: m.mes + 1 } : { ano: m.ano + 1, mes: 0 })); }}
                style={[s.navBotao, mesAtual && { opacity: 0.3 }]} accessibilityLabel="Próximo mês">
                <Icone nome="seta" tamanho={18} />
              </Pressable>
            </View>
            <Calendario ano={mes.ano} mes={mes.mes} marcados={diasMes} escolhido={diaEscolhido} onEscolher={(d) => setDiaEscolhido(d === diaEscolhido ? null : d)} />
            <View style={s.numeros}>
              <Numero valor={String(treinosMes)} rotulo="treinos no mês" />
              <Numero valor={duracao(tempoMes)} rotulo="tempo treinando" />
            </View>
            {(diaEscolhido ? sessoesDoDia : doMes).map((x) => (
              <CartaoSessao key={x.id} sessao={x} mostrarData onPress={() => router.push({ pathname: '/historico/[id]', params: { id: x.id } })} />
            ))}
            {!doMes.length && <Text style={s.cinza}>Nenhum treino neste mês.</Text>}
          </View>
        )}

        {aba === 'ano' && (
          <View style={{ gap: 14 }}>
            <View style={s.nav}>
              <Pressable onPress={() => setAno((a) => a - 1)} style={s.navBotao} accessibilityLabel="Ano anterior"><Icone nome="voltar" tamanho={18} /></Pressable>
              <Text style={s.navTitulo}>{ano}</Text>
              <Pressable disabled={ano >= hoje.getFullYear()} onPress={() => setAno((a) => a + 1)} style={[s.navBotao, ano >= hoje.getFullYear() && { opacity: 0.3 }]} accessibilityLabel="Próximo ano">
                <Icone nome="seta" tamanho={18} />
              </Pressable>
            </View>
            <View style={s.numeros}>
              <Numero valor={String(meses.reduce((n, m) => n + m.treinos, 0))} rotulo={`treinos em ${ano}`} />
              <Numero valor={duracao(meses.reduce((n, m) => n + m.segundos, 0))} rotulo="tempo treinando" />
            </View>
            <View style={s.grafico}>
              {meses.map((m, i) => {
                const max = Math.max(1, ...meses.map((x) => x.treinos));
                return (
                  <Pressable key={i} style={s.barraCol} onPress={() => { setMes({ ano, mes: i }); setAba('mes'); }}>
                    <Text style={s.barraValor}>{m.treinos || ''}</Text>
                    <View style={[s.barra, { height: 4 + (m.treinos / max) * 120, backgroundColor: m.treinos ? cores.roxo : cores.cinza }]} />
                    <Text style={s.barraMes}>{MESES_CURTOS[i]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={s.cinza}>Toque num mês para ver o calendário dele.</Text>
          </View>
        )}

        {aba === 'exercicios' && (
          <View style={{ gap: 8 }}>
            <Text style={s.cinza}>Toque num exercício para ver a evolução de carga e os recordes pessoais.</Text>
            {exs.map((x) => {
              const e = porId(x.exercicio_id);
              return (
                <Pressable key={x.exercicio_id} onPress={() => router.push({ pathname: '/historico/exercicio/[id]', params: { id: x.exercicio_id } })}
                  style={({ pressed }) => [s.exLinha, pressed && { opacity: 0.85 }]}>
                  <Miniatura id={x.exercicio_id} tamanho={48} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.exNome} numberOfLines={1}>{e?.nome ?? x.exercicio_id}</Text>
                    <Text style={s.exInfo}>{x.sessoes} {x.sessoes === 1 ? 'treino' : 'treinos'} · último em {dataCurta(x.ultima_data)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.exRecorde}>{x.maior_carga ? kg(x.maior_carga) : `${x.maior_reps ?? '—'} reps`}</Text>
                    <Text style={s.exInfo}>recorde</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CartaoSessao({ sessao: x, onPress, mostrarData }: { sessao: ResumoSessao; onPress: () => void; mostrarData?: boolean }) {
  const hora = new Date(x.iniciado_em);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.sessao, pressed && { opacity: 0.85 }]} accessibilityRole="button">
      <View style={s.sessaoIcone}><Icone nome="check" tamanho={18} cor={cores.texto} espessura={3} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.sessaoNome} numberOfLines={1}>{x.nome || 'Treino'}</Text>
        <Text style={s.sessaoInfo}>
          {mostrarData ? `${dataCurta(x.data)} · ` : ''}{dois(hora.getHours())}:{dois(hora.getMinutes())} · {duracao(x.duracao_s)} · {x.exercicios} exerc. · {x.series} séries{x.volume ? ` · ${kg(x.volume)}` : ''}
        </Text>
      </View>
      <Icone nome="seta" tamanho={18} cor={cores.texto3} />
    </Pressable>
  );
}

function Calendario({
  ano, mes, marcados, escolhido, onEscolher,
}: { ano: number; mes: number; marcados: Set<string>; escolhido: string | null; onEscolher: (d: string) => void }) {
  const primeiro = new Date(ano, mes, 1).getDay(); // 0 = domingo
  const dias = new Date(ano, mes + 1, 0).getDate();
  const hoje = chaveDia(new Date());
  const celulas: (number | null)[] = [...Array(primeiro).fill(null), ...Array.from({ length: dias }, (_, i) => i + 1)];
  while (celulas.length % 7) celulas.push(null);
  return (
    <View style={s.cal}>
      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((l, i) => <Text key={i} style={s.calSemana}>{l}</Text>)}
      {celulas.map((d, i) => {
        if (!d) return <View key={i} style={s.calCelula} />;
        const chave = `${ano}-${dois(mes + 1)}-${dois(d)}`;
        const treinou = marcados.has(chave);
        const ativo = escolhido === chave;
        return (
          <Pressable key={i} style={s.calCelula} onPress={() => treinou && onEscolher(chave)} disabled={!treinou}>
            <View style={[s.calDia, treinou && s.calTreino, ativo && s.calAtivo, chave === hoje && !treinou && s.calHoje]}>
              <Text style={[s.calNum, treinou && { fontFamily: fontes.negrito, color: cores.texto }, ativo && { color: cores.textoClaro }]}>{d}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  conteudo: { padding: 20, gap: 16, paddingBottom: 40 },
  numeros: { flexDirection: 'row', gap: 8 },
  dataTitulo: { fontFamily: fontes.negrito, fontSize: 13, color: cores.texto2, marginTop: 4 },
  sessao: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.m, padding: 12 },
  sessaoIcone: { width: 36, height: 36, borderRadius: 18, backgroundColor: cores.lima, alignItems: 'center', justifyContent: 'center' },
  sessaoNome: { fontFamily: fontes.semi, fontSize: 15, color: cores.texto },
  sessaoInfo: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBotao: { width: 40, height: 40, borderRadius: 12, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, alignItems: 'center', justifyContent: 'center' },
  navTitulo: { fontFamily: fontes.titulo, fontSize: 18, color: cores.texto },
  cal: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: cores.cartao, borderRadius: raio.g, borderWidth: 1, borderColor: cores.borda, padding: 8 },
  calSemana: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: fontes.semi, fontSize: 11, color: cores.texto3, paddingVertical: 6 },
  calCelula: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calDia: { width: '82%', height: '82%', borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  calTreino: { backgroundColor: cores.lima },
  calAtivo: { backgroundColor: cores.roxo },
  calHoje: { borderWidth: 1.5, borderColor: cores.roxo },
  calNum: { fontFamily: fontes.media, fontSize: 13, color: cores.texto2 },
  grafico: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', backgroundColor: cores.cartao, borderRadius: raio.g, borderWidth: 1, borderColor: cores.borda, padding: 12, height: 190 },
  barraCol: { alignItems: 'center', gap: 4, flex: 1 },
  barra: { width: '60%', borderRadius: 6 },
  barraValor: { fontFamily: fontes.semi, fontSize: 10, color: cores.texto2 },
  barraMes: { fontFamily: fontes.media, fontSize: 9, color: cores.texto2 },
  exLinha: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.m, padding: 10 },
  exNome: { fontFamily: fontes.semi, fontSize: 14, color: cores.texto },
  exInfo: { fontFamily: fontes.regular, fontSize: 11, color: cores.texto2, marginTop: 2 },
  exRecorde: { fontFamily: fontes.titulo, fontSize: 16, color: cores.roxo },
  cinza: { fontFamily: fontes.regular, fontSize: 13, color: cores.texto2 },
  vazio: { alignItems: 'center', gap: 12, padding: 24, backgroundColor: cores.cartao, borderRadius: raio.g, borderWidth: 1, borderColor: cores.borda },
  vazioTitulo: { fontFamily: fontes.titulo, fontSize: 18, color: cores.texto, textAlign: 'center' },
  vazioTexto: { fontFamily: fontes.regular, fontSize: 13, color: cores.texto2, textAlign: 'center', lineHeight: 19 },
});
