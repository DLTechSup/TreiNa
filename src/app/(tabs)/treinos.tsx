import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Icone } from '@/components/Icone';
import { Secao } from '@/components/pecas';
import { Botao, Miniatura, Titulo } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { minutosEstimados, recomendar } from '@/data/planos';
import { NOMES_DIAS, SIGLAS_DIAS, diaDaSemana, useDados } from '@/db/banco';
import { datasComTreino } from '@/db/historico';
import { useSQLiteContext } from '@/db/sqlite';
import { chaveDia } from '@/lib/datas';

/** Datas (AAAA-MM-DD) de segunda a domingo da semana atual. */
function semanaAtual() {
  const hoje = new Date();
  const seg = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (diaDaSemana(hoje) - 1));
  return [0, 1, 2, 3, 4, 5, 6].map((i) => chaveDia(new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + i)));
}

export default function Treinos() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { semana, perfil, versaoHistorico } = useDados();
  const hoje = diaDaSemana(new Date());
  const [feitos, setFeitos] = useState<Set<number>>(new Set());

  useEffect(() => {
    const datas = semanaAtual();
    datasComTreino(db, datas[0], datas[6]).then((set) => {
      setFeitos(new Set(datas.map((d, i) => (set.has(d) ? i + 1 : 0)).filter(Boolean)));
    });
  }, [db, versaoHistorico]);

  const vazia = semana.every((d) => !d.itens.length);
  const diaHoje = semana[hoje - 1];
  const sugestao = recomendar(perfil)[0]?.plano;
  const totalTreinos = semana.filter((d) => d.itens.length).length;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.conteudo}>
        <View>
          <Titulo>Treinos</Titulo>
          <Text style={s.sub}>
            {vazia ? 'Monte sua semana dia por dia' : `${totalTreinos} treino${totalTreinos === 1 ? '' : 's'} por semana · ${feitos.size} feito${feitos.size === 1 ? '' : 's'} nesta semana`}
          </Text>
        </View>

        {vazia ? (
          <View style={s.cartaoEscuro}>
            <Text style={s.selo}>COMECE AQUI</Text>
            <Text style={s.escuroTitulo}>Monte o treino da sua semana</Text>
            <Text style={s.escuroTexto}>
              Escolha um plano pronto para o seu objetivo ou monte do zero: em cada dia você escolhe os grupos musculares e os exercícios, com séries, repetições, carga e descanso.
            </Text>
            <Botao texto="Ver planos para mim" tipo="lima" onPress={() => router.push('/treino/planos')} />
            <Botao texto="Montar do zero (começar pela segunda)" tipo="contorno" corTexto={cores.textoClaro} style={{ borderColor: cores.escuro3 }}
              onPress={() => router.push({ pathname: '/treino/dia/[dia]', params: { dia: '1' } })} />
          </View>
        ) : diaHoje.itens.length ? (
          <View style={s.cartaoEscuro}>
            <Text style={s.selo}>HOJE · {NOMES_DIAS[hoje].toUpperCase()}</Text>
            <Text style={s.escuroTitulo}>{diaHoje.nome || 'Treino do dia'}</Text>
            <Text style={s.escuroTexto}>
              {diaHoje.itens.length} exercícios · ~{minutosEstimados(diaHoje.itens)} min{diaHoje.grupos.length ? ` · ${diaHoje.grupos.join(', ')}` : ''}
              {feitos.has(hoje) ? '\nVocê já treinou hoje. Quer repetir?' : ''}
            </Text>
            <Botao texto={feitos.has(hoje) ? 'Treinar de novo' : 'Começar o treino'} tipo="lima"
              onPress={() => router.push({ pathname: '/treino/executar', params: { dia: String(hoje) } })} />
          </View>
        ) : null}

        {!vazia && (
          <Secao titulo="Sua semana" acao={{ texto: 'Trocar plano', onPress: () => router.push('/treino/planos') }}>
            {semana.map((d) => {
              const ehHoje = d.dia === hoje;
              const temTreino = d.itens.length > 0;
              return (
                <Pressable key={d.dia} onPress={() => router.push({ pathname: '/treino/dia/[dia]', params: { dia: String(d.dia) } })}
                  style={({ pressed }) => [s.dia, ehHoje && s.diaHoje, pressed && { opacity: 0.85 }]} accessibilityRole="button"
                  accessibilityLabel={`${NOMES_DIAS[d.dia]}: ${temTreino ? d.nome : 'descanso'}`}>
                  <View style={[s.sigla, ehHoje && { backgroundColor: cores.roxo }, feitos.has(d.dia) && { backgroundColor: cores.lima }]}>
                    {feitos.has(d.dia)
                      ? <Icone nome="check" tamanho={18} cor={cores.texto} espessura={3} />
                      : <Text style={[s.siglaTexto, ehHoje && { color: cores.textoClaro }]}>{SIGLAS_DIAS[d.dia]}</Text>}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.diaNome} numberOfLines={1}>{temTreino ? d.nome || 'Treino' : 'Descanso'}</Text>
                    <Text style={s.diaInfo} numberOfLines={1}>
                      {temTreino ? `${d.itens.length} exercícios · ~${minutosEstimados(d.itens)} min · ${d.grupos.join(', ')}` : 'Toque para montar um treino neste dia'}
                    </Text>
                  </View>
                  {temTreino ? (
                    <Pressable onPress={() => router.push({ pathname: '/treino/executar', params: { dia: String(d.dia) } })}
                      style={s.play} hitSlop={6} accessibilityLabel={`Começar treino de ${NOMES_DIAS[d.dia]}`}>
                      <Text style={s.playTexto}>▶</Text>
                    </Pressable>
                  ) : (
                    <Icone nome="seta" tamanho={18} cor={cores.texto3} />
                  )}
                </Pressable>
              );
            })}
          </Secao>
        )}

        <Secao titulo="Planos prontos">
          {sugestao && (
            <Pressable onPress={() => router.push('/treino/planos')} style={({ pressed }) => [s.plano, pressed && { opacity: 0.85 }]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.planoSelo}>RECOMENDADO PARA VOCÊ</Text>
                <Text style={s.planoNome}>{sugestao.nome}</Text>
                <Text style={s.planoInfo}>{sugestao.dias.length} dias · {sugestao.local} · {sugestao.nivel}</Text>
              </View>
              <Icone nome="seta" tamanho={20} cor={cores.roxoEscuro} />
            </Pressable>
          )}
          <Pressable onPress={() => router.push('/mulher')} style={({ pressed }) => [s.mulher, pressed && { opacity: 0.85 }]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.planoSelo}>TREINA MULHER</Text>
              <Text style={s.planoNome}>Glúteo, pernas e ombros com volume</Text>
              <Text style={s.planoInfo}>2 planos prontos · academia ou em casa</Text>
            </View>
            <Miniatura id="elevacao-pelvica-com-barra" tamanho={64} raioBorda={12} />
          </Pressable>
          <Botao texto="Ver todos os planos" tipo="contorno" onPress={() => router.push('/treino/planos')} />
        </Secao>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  conteudo: { padding: 20, gap: 18, paddingBottom: 40 },
  sub: { fontFamily: fontes.regular, fontSize: 13, color: cores.texto2, marginTop: 2 },
  cartaoEscuro: { backgroundColor: cores.escuro, borderRadius: raio.g, padding: 18, gap: 10 },
  selo: { alignSelf: 'flex-start', backgroundColor: cores.lilas, color: cores.roxoEscuro, fontFamily: fontes.negrito, fontSize: 11, letterSpacing: 0.6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: raio.pill, overflow: 'hidden' },
  escuroTitulo: { fontFamily: fontes.titulo, fontSize: 22, color: cores.textoClaro, letterSpacing: -0.3 },
  escuroTexto: { fontFamily: fontes.regular, fontSize: 13, color: cores.textoClaro2, lineHeight: 19, marginBottom: 4 },
  dia: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.m, padding: 12 },
  diaHoje: { borderColor: cores.roxo, borderWidth: 2, padding: 11 },
  sigla: { width: 44, height: 44, borderRadius: 22, backgroundColor: cores.cinza, alignItems: 'center', justifyContent: 'center' },
  siglaTexto: { fontFamily: fontes.negrito, fontSize: 13, color: cores.texto },
  diaNome: { fontFamily: fontes.semi, fontSize: 15, color: cores.texto },
  diaInfo: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2 },
  play: { width: 40, height: 40, borderRadius: 20, backgroundColor: cores.roxo, alignItems: 'center', justifyContent: 'center' },
  playTexto: { color: cores.textoClaro, fontSize: 14, marginLeft: 2 },
  plano: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.g, padding: 16 },
  mulher: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: cores.lilas, borderRadius: raio.g, padding: 16 },
  planoSelo: { fontFamily: fontes.negrito, fontSize: 11, color: cores.roxoEscuro, letterSpacing: 0.6 },
  planoNome: { fontFamily: fontes.titulo, fontSize: 17, color: cores.texto },
  planoInfo: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2 },
});
