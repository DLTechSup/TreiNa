import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Icone } from '@/components/Icone';
import { Botao, TopoVoltar } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { recomendar } from '@/data/planos';
import { SIGLAS_DIAS, useDados } from '@/db/banco';

export default function Planos() {
  const router = useRouter();
  const { perfil } = useDados();
  const lista = recomendar(perfil);
  const melhor = lista[0]?.pontos ?? 0;
  const resumo = [perfil.objetivo, perfil.nivel, perfil.dias_semana ? `${perfil.dias_semana} dias por semana` : null].filter(Boolean).join(' · ');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <TopoVoltar titulo="Planos sugeridos" />
      <ScrollView contentContainerStyle={s.conteudo}>
        <View style={{ gap: 4 }}>
          <Text style={s.titulo}>Escolha um plano pronto</Text>
          <Text style={s.sub}>
            {resumo ? `Organizados para você: ${resumo}.` : 'Preencha o objetivo no Perfil para ver os planos mais indicados primeiro.'}
            {' '}Ao aceitar, os treinos entram na sua semana e você pode mudar o que quiser depois.
          </Text>
        </View>

        {lista.map(({ plano, pontos }, i) => (
          <Pressable key={plano.id} onPress={() => router.push({ pathname: '/treino/plano/[id]', params: { id: plano.id } })}
            style={({ pressed }) => [s.cartao, i === 0 && melhor > 0 && s.cartaoTop, pressed && { opacity: 0.85 }]} accessibilityRole="button">
            {i === 0 && melhor > 0 && <Text style={s.selo}>MAIS INDICADO PARA VOCÊ</Text>}
            {i > 0 && pontos >= melhor - 1 && melhor > 0 && <Text style={[s.selo, s.seloClaro]}>TAMBÉM COMBINA COM VOCÊ</Text>}
            <View style={s.linha}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.nome}>{plano.nome}</Text>
                <Text style={s.desc} numberOfLines={3}>{plano.descricao}</Text>
              </View>
              <Icone nome="seta" tamanho={20} cor={cores.texto3} />
            </View>
            <View style={s.tags}>
              <Text style={s.tag}>{plano.dias.length} dias</Text>
              <Text style={s.tag}>{plano.nivel}</Text>
              {plano.objetivos.slice(0, 2).map((o) => <Text key={o} style={s.tag}>{o}</Text>)}
            </View>
            <View style={s.semana}>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const tem = plano.dias.some((x) => x.dia === d);
                return (
                  <View key={d} style={[s.diaBola, tem && s.diaBolaAtiva]}>
                    <Text style={[s.diaTexto, tem && { color: cores.textoClaro }]}>{SIGLAS_DIAS[d].slice(0, 1)}</Text>
                  </View>
                );
              })}
            </View>
          </Pressable>
        ))}

        <View style={s.proprio}>
          <Text style={s.nome}>Prefere montar o seu?</Text>
          <Text style={s.desc}>Escolha os dias, os grupos musculares e os exercícios um por um.</Text>
          <Botao texto="Montar meu treino do zero" tipo="contorno" onPress={() => router.push({ pathname: '/treino/dia/[dia]', params: { dia: '1' } })} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  conteudo: { padding: 20, gap: 14, paddingBottom: 40 },
  titulo: { fontFamily: fontes.titulo, fontSize: 24, color: cores.texto },
  sub: { fontFamily: fontes.regular, fontSize: 13, color: cores.texto2, lineHeight: 19 },
  cartao: { backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.g, padding: 16, gap: 12 },
  cartaoTop: { borderColor: cores.roxo, borderWidth: 2, padding: 15 },
  selo: { alignSelf: 'flex-start', backgroundColor: cores.roxo, color: cores.textoClaro, fontFamily: fontes.negrito, fontSize: 10, letterSpacing: 0.6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: raio.pill, overflow: 'hidden' },
  seloClaro: { backgroundColor: cores.lilas, color: cores.roxoEscuro },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nome: { fontFamily: fontes.titulo, fontSize: 18, color: cores.texto },
  desc: { fontFamily: fontes.regular, fontSize: 13, color: cores.texto2, lineHeight: 18 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { fontFamily: fontes.semi, fontSize: 11, color: cores.texto, backgroundColor: cores.cinza, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  semana: { flexDirection: 'row', gap: 6 },
  diaBola: { width: 28, height: 28, borderRadius: 14, backgroundColor: cores.cinza, alignItems: 'center', justifyContent: 'center' },
  diaBolaAtiva: { backgroundColor: cores.escuro },
  diaTexto: { fontFamily: fontes.semi, fontSize: 11, color: cores.texto2 },
  proprio: { gap: 8, padding: 16, borderRadius: raio.g, borderWidth: 1, borderStyle: 'dashed', borderColor: cores.borda },
});
