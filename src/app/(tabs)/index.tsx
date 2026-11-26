import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { CartaoVideos } from '@/components/CartaoVideos';
import { Icone } from '@/components/Icone';
import { MarcaTreiNa, Numero, Secao } from '@/components/pecas';
import { Botao, Miniatura, Titulo } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { grupos, porId } from '@/data';
import { minutosEstimados } from '@/data/planos';
import { NOMES_DIAS, SIGLAS_DIAS, diaDaSemana, useDados } from '@/db/banco';
import { datasComTreino, sequencias, todasSessoes } from '@/db/historico';
import { useSQLiteContext } from '@/db/sqlite';
import { MESES, SEMANA_LONGA, chaveDia, dataCurta } from '@/lib/datas';

function saudacao(d: Date) {
  const h = d.getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Inicio() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { perfil, favoritos, semana, versaoHistorico } = useDados();
  const hoje = new Date();
  const dHoje = diaDaSemana(hoje);
  const primeiroNome = perfil.nome.split(' ')[0];
  const favs = [...favoritos].map(porId).filter(Boolean).slice(0, 8);
  const treinoHoje = semana[dHoje - 1];
  const vazia = semana.every((d) => !d.itens.length);

  const [seq, setSeq] = useState(0);
  const [noMes, setNoMes] = useState(0);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [feitosSemana, setFeitosSemana] = useState<Set<number>>(new Set());

  useEffect(() => {
    (async () => {
      const h = new Date();
      setSeq((await sequencias(db, chaveDia(h))).atual);
      const ini = chaveDia(new Date(h.getFullYear(), h.getMonth(), 1));
      setNoMes((await datasComTreino(db, ini, chaveDia(h))).size);
      setUltimo((await todasSessoes(db, 1))[0]?.data ?? null);
      const seg = new Date(h.getFullYear(), h.getMonth(), h.getDate() - (diaDaSemana(h) - 1));
      const datas = [0, 1, 2, 3, 4, 5, 6].map((i) => chaveDia(new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + i)));
      const feitos = await datasComTreino(db, datas[0], datas[6]);
      setFeitosSemana(new Set(datas.map((d, i) => (feitos.has(d) ? i + 1 : 0)).filter(Boolean)));
    })();
  }, [db, versaoHistorico]);

  // Próximo dia com treino (para quando hoje é descanso)
  const proximo = [1, 2, 3, 4, 5, 6, 7].map((n) => ((dHoje - 1 + n) % 7) + 1).find((d) => semana[d - 1].itens.length);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.conteudo}>
        <View style={s.topo}>
          <View style={s.marca}>
            <MarcaTreiNa tamanho={34} />
            <Text style={s.marcaTexto}>Trei<Text style={{ color: cores.roxo }}>Na</Text></Text>
          </View>
          <Pressable onPress={() => router.navigate('/perfil')} accessibilityRole="button" accessibilityLabel="Abrir perfil" style={s.avatar}>
            <Text style={s.avatarTexto}>{(primeiroNome[0] ?? 'T').toUpperCase()}</Text>
          </Pressable>
        </View>

        <View>
          <Text style={s.data}>{SEMANA_LONGA[hoje.getDay()]}, {hoje.getDate()} de {MESES[hoje.getMonth()]}</Text>
          <Titulo style={{ fontSize: 28 }}>{saudacao(hoje)}{primeiroNome ? `, ${primeiroNome}` : '!'}</Titulo>
        </View>

        {/* Atualização de vídeos (some quando todos estiverem no celular) */}
        <CartaoVideos />

        {/* Treino de hoje */}
        <View style={s.cartaoEscuro}>
          {vazia ? (
            <>
              <Text style={s.selo}>SEU TREINO</Text>
              <Text style={s.escuroTitulo}>Monte o treino da sua semana</Text>
              <Text style={s.escuroTexto}>Escolha um plano pronto para o seu objetivo ou monte dia por dia, com os exercícios, séries, carga e descanso.</Text>
              <Botao texto="Ver planos para mim" tipo="lima" onPress={() => router.push('/treino/planos')} />
              <Botao texto="Montar do zero" tipo="contorno" corTexto={cores.textoClaro} style={{ borderColor: cores.escuro3 }}
                onPress={() => router.push({ pathname: '/treino/dia/[dia]', params: { dia: '1' } })} />
            </>
          ) : treinoHoje.itens.length ? (
            <>
              <Text style={s.selo}>TREINO DE HOJE{feitosSemana.has(dHoje) ? ' · FEITO ✓' : ''}</Text>
              <Text style={s.escuroTitulo}>{treinoHoje.nome || 'Treino do dia'}</Text>
              <Text style={s.escuroTexto}>{treinoHoje.itens.length} exercícios · ~{minutosEstimados(treinoHoje.itens)} min · {treinoHoje.grupos.join(', ')}</Text>
              <View style={s.miniaturas}>
                {treinoHoje.itens.slice(0, 5).map((it) => <Miniatura key={it.id} id={it.exercicio_id} tamanho={48} raioBorda={10} />)}
                {treinoHoje.itens.length > 5 && <View style={s.mais}><Text style={s.maisTexto}>+{treinoHoje.itens.length - 5}</Text></View>}
              </View>
              <Botao texto={feitosSemana.has(dHoje) ? 'Treinar de novo' : '▶  Começar o treino'} tipo="lima"
                onPress={() => router.push({ pathname: '/treino/executar', params: { dia: String(dHoje) } })} />
            </>
          ) : (
            <>
              <Text style={s.selo}>HOJE É DESCANSO</Text>
              <Text style={s.escuroTitulo}>Recupere bem 💤</Text>
              <Text style={s.escuroTexto}>
                {proximo ? `Próximo treino: ${NOMES_DIAS[proximo].toLowerCase()} — ${semana[proximo - 1].nome}.` : ''} Quer treinar mesmo assim? Escolha um dia da semana.
              </Text>
              <Botao texto="Ver minha semana" tipo="lima" onPress={() => router.navigate('/treinos')} />
            </>
          )}
        </View>

        {/* Semana */}
        {!vazia && (
          <Pressable onPress={() => router.navigate('/treinos')} style={s.semana} accessibilityRole="button" accessibilityLabel="Ver a semana">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => {
              const tem = semana[d - 1].itens.length > 0;
              const feito = feitosSemana.has(d);
              return (
                <View key={d} style={s.semanaDia}>
                  <Text style={[s.semanaSigla, d === dHoje && { color: cores.roxo, fontFamily: fontes.negrito }]}>{SIGLAS_DIAS[d]}</Text>
                  <View style={[s.semanaBola, tem && s.semanaBolaTreino, feito && s.semanaBolaFeito, d === dHoje && !feito && s.semanaHoje]}>
                    {feito ? <Icone nome="check" tamanho={14} cor={cores.texto} espessura={3} /> : tem ? <View style={s.semanaPonto} /> : null}
                  </View>
                </View>
              );
            })}
          </Pressable>
        )}

        <View style={s.numeros}>
          <Numero valor={`${seq}`} rotulo={seq === 1 ? 'dia seguido' : 'dias seguidos'} />
          <Numero valor={`${noMes}`} rotulo="treinos no mês" />
          <Numero valor={ultimo ? (ultimo === chaveDia(hoje) ? 'Hoje' : dataCurta(ultimo)) : '—'} rotulo="último treino" />
        </View>

        <Secao titulo="Grupos musculares" acao={{ texto: 'Biblioteca', onPress: () => router.navigate('/biblioteca') }}>
          <View style={s.grade}>
            {grupos.map((g) => (
              <Pressable key={g.nome} style={({ pressed }) => [s.grupo, pressed && { opacity: 0.7 }]}
                onPress={() => router.navigate({ pathname: '/biblioteca', params: { grupo: g.nome } })}>
                <Text style={s.grupoNome} numberOfLines={1}>{g.nome}</Text>
                <Text style={s.grupoTotal}>{g.total} exercícios</Text>
              </Pressable>
            ))}
          </View>
        </Secao>

        <Secao titulo="Seus favoritos">
          {favs.length === 0 ? (
            <View style={s.vazio}>
              <Icone nome="estrela" tamanho={20} cor={cores.texto2} />
              <Text style={s.vazioTexto}>Toque na estrela de um exercício na Biblioteca para guardá-lo aqui.</Text>
            </View>
          ) : (
            <View style={s.favs}>
              {favs.map((e) => (
                <Pressable key={e!.id} style={s.fav} onPress={() => router.push({ pathname: '/exercicio/[id]', params: { id: e!.id } })}>
                  <Miniatura id={e!.id} tamanho={96} raioBorda={14} />
                  <Text style={s.favNome} numberOfLines={2}>{e!.nome}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Secao>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  conteudo: { padding: 20, gap: 18, paddingBottom: 32 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  marcaTexto: { fontFamily: fontes.titulo, fontSize: 22, color: cores.texto, letterSpacing: -0.4 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: cores.roxo, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { color: cores.textoClaro, fontFamily: fontes.negrito, fontSize: 17 },
  data: { fontFamily: fontes.regular, fontSize: 13, color: cores.texto2 },
  cartaoEscuro: { backgroundColor: cores.escuro, borderRadius: raio.g, padding: 18, gap: 10 },
  selo: { alignSelf: 'flex-start', backgroundColor: cores.lilas, color: cores.roxoEscuro, fontFamily: fontes.negrito, fontSize: 11, letterSpacing: 0.6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: raio.pill, overflow: 'hidden' },
  escuroTitulo: { fontFamily: fontes.titulo, fontSize: 22, color: cores.textoClaro, letterSpacing: -0.3 },
  escuroTexto: { fontFamily: fontes.regular, fontSize: 13, color: cores.textoClaro2, lineHeight: 19, marginBottom: 2 },
  miniaturas: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  mais: { width: 48, height: 48, borderRadius: 10, backgroundColor: cores.escuro2, alignItems: 'center', justifyContent: 'center' },
  maisTexto: { fontFamily: fontes.semi, color: cores.textoClaro },
  semana: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.g, paddingVertical: 12, paddingHorizontal: 10 },
  semanaDia: { alignItems: 'center', gap: 6, flex: 1 },
  semanaSigla: { fontFamily: fontes.media, fontSize: 12, color: cores.texto2 },
  semanaBola: { width: 30, height: 30, borderRadius: 15, backgroundColor: cores.cinza, alignItems: 'center', justifyContent: 'center' },
  semanaBolaTreino: { backgroundColor: cores.lilas },
  semanaBolaFeito: { backgroundColor: cores.lima },
  semanaPonto: { width: 8, height: 8, borderRadius: 4, backgroundColor: cores.roxo },
  semanaHoje: { borderWidth: 2, borderColor: cores.roxo },
  numeros: { flexDirection: 'row', gap: 8 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grupo: { width: '48.5%', backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.m, paddingVertical: 12, paddingHorizontal: 14 },
  grupoNome: { fontFamily: fontes.semi, fontSize: 15, color: cores.texto },
  grupoTotal: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2, marginTop: 2 },
  vazio: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.g },
  vazioTexto: { flex: 1, fontFamily: fontes.regular, fontSize: 13, color: cores.texto2 },
  favs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fav: { width: 96, gap: 6 },
  favNome: { fontFamily: fontes.semi, fontSize: 12, color: cores.texto },
});
