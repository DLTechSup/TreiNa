import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Confirmar } from '@/components/pecas';
import { Botao, Miniatura, TopoVoltar } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { porId } from '@/data';
import { minutosEstimados, planoParaSemana, planoPorId } from '@/data/planos';
import { NOMES_DIAS, useDados } from '@/db/banco';
import { descanso } from '@/lib/datas';

export default function VerPlano() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const plano = planoPorId(id);
  const { semana, aplicarSemana } = useDados();
  const [confirmar, setConfirmar] = useState(false);
  const [aplicando, setAplicando] = useState(false);

  if (!plano) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <TopoVoltar titulo="Plano" />
        <Text style={{ padding: 20, fontFamily: fontes.regular }}>Plano não encontrado.</Text>
      </SafeAreaView>
    );
  }

  const temSemana = semana.some((d) => d.itens.length);
  const aplicar = async () => {
    setAplicando(true);
    await aplicarSemana(planoParaSemana(plano));
    setConfirmar(false);
    router.dismissTo('/treinos');
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <TopoVoltar titulo="Plano sugerido" />
      <ScrollView contentContainerStyle={s.conteudo}>
        <View style={s.hero}>
          <Text style={s.nome}>{plano.nome}</Text>
          <Text style={s.desc}>{plano.descricao}</Text>
          <Text style={s.info}>{plano.dias.length} dias por semana · {plano.nivel} · {plano.dias.map((d) => NOMES_DIAS[d.dia]).join(', ')}</Text>
        </View>

        {plano.dias.map((d) => (
          <View key={d.dia} style={s.dia}>
            <View style={s.diaTopo}>
              <Text style={s.diaSigla}>{NOMES_DIAS[d.dia].toUpperCase()}</Text>
              <Text style={s.diaMin}>~{minutosEstimados(d.itens)} min</Text>
            </View>
            <Text style={s.diaNome}>{d.nome}</Text>
            <Text style={s.diaGrupos}>{d.grupos.join(' · ')}</Text>
            {d.itens.map((it, i) => {
              const e = porId(it.id);
              return (
                <View key={`${it.id}-${i}`} style={s.item}>
                  <Miniatura id={it.id} tamanho={44} telaCheia />
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemNome} numberOfLines={2}>{e?.nome}</Text>
                    <Text style={s.itemInfo}>{it.series} × {it.repeticoes} · descanso {descanso(it.descanso)} · {e?.equipamento}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={s.rodape}>
        <Botao texto={aplicando ? 'Aplicando…' : 'Usar este plano na minha semana'} desativado={aplicando}
          onPress={() => (temSemana ? setConfirmar(true) : aplicar())} />
        <Botao texto="Não, quero montar o meu" tipo="contorno" onPress={() => router.push({ pathname: '/treino/dia/[dia]', params: { dia: '1' } })} />
      </View>

      <Confirmar visivel={confirmar} titulo="Trocar a sua semana por este plano?"
        texto="Os treinos que você montou serão substituídos. O histórico de treinos já feitos continua guardado."
        confirmar="Sim, usar este plano" onCancelar={() => setConfirmar(false)} onConfirmar={aplicar} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  conteudo: { padding: 20, gap: 14, paddingBottom: 24 },
  hero: { backgroundColor: cores.escuro, borderRadius: raio.g, padding: 18, gap: 8 },
  nome: { fontFamily: fontes.titulo, fontSize: 22, color: cores.textoClaro },
  desc: { fontFamily: fontes.regular, fontSize: 13, color: cores.textoClaro2, lineHeight: 19 },
  info: { fontFamily: fontes.semi, fontSize: 12, color: cores.lima },
  dia: { backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.g, padding: 14, gap: 8 },
  diaTopo: { flexDirection: 'row', justifyContent: 'space-between' },
  diaSigla: { fontFamily: fontes.negrito, fontSize: 11, color: cores.roxo, letterSpacing: 0.6 },
  diaMin: { fontFamily: fontes.media, fontSize: 12, color: cores.texto2 },
  diaNome: { fontFamily: fontes.titulo, fontSize: 17, color: cores.texto },
  diaGrupos: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2, marginTop: -4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: cores.borda },
  itemNome: { fontFamily: fontes.semi, fontSize: 13, color: cores.texto },
  itemInfo: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2, marginTop: 2 },
  rodape: { padding: 16, paddingBottom: 20, gap: 8, borderTopWidth: 1, borderColor: cores.borda, backgroundColor: cores.fundo },
});
