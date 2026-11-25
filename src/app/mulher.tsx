import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Icone } from '@/components/Icone';
import { Botao, Logo, Miniatura, TopoVoltar } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { focos, porId, programas } from '@/data';

const NOME_FOCO: Record<string, string> = { Glúteo: 'Glúteo', Perna: 'Pernas', Posterior: 'Posterior', Ombro: 'Ombros' };

export default function TreinaMulher() {
  const router = useRouter();
  const [indice] = useState(0);
  const plano = programas[indice];
  const totalEx = plano.dias.reduce((n, d) => n + d.exercicios.length, 0);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <TopoVoltar titulo="TreiNa Mulher" />
      <ScrollView contentContainerStyle={s.conteudo}>
        <View style={s.hero}>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Logo claro tamanho={18} /><Text style={s.heroMarca}>Mulher</Text>
            </View>
            <Text style={s.heroTitulo}>Glúteo, pernas e ombros com volume</Text>
            <Text style={s.heroTexto}>{plano.dias.length} dias por semana · {totalEx} exercícios · {plano.local}</Text>
          </View>
          <Miniatura id="elevacao-pelvica-com-barra" tamanho={96} raioBorda={14} />
        </View>

        <Botao texto="Usar este plano na minha semana" onPress={() => router.push({ pathname: '/treino/plano/[id]', params: { id: `treina-mulher-${indice + 1}` } })} />

        <View style={{ gap: 8 }}>
          <Text style={s.secao}>Foco do plano</Text>
          <View style={s.focos}>
            {focos.map((f) => (
              <Pressable key={f.nome} style={({ pressed }) => [s.foco, pressed && { opacity: 0.7 }]}
                onPress={() => router.navigate({ pathname: '/biblioteca', params: { foco: f.nome } })}>
                <Text style={s.focoNome}>{NOME_FOCO[f.nome]}</Text>
                <Text style={s.focoTotal}>{f.total} exerc.</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {plano.dias.map((d) => (
          <View key={d.dia} style={s.dia}>
            <View style={s.diaTopo}>
              <Text style={s.diaSigla}>{d.dia.toUpperCase()}</Text>
              <Text style={s.diaTitulo}>{d.titulo}</Text>
            </View>
            {d.exercicios.map((it, i) => {
              const e = porId(it.id);
              if (!e) return null;
              return (
                <Pressable key={`${it.id}-${i}`} style={({ pressed }) => [s.item, pressed && { backgroundColor: '#FAFAF7' }]}
                  onPress={() => router.push({ pathname: '/exercicio/[id]', params: { id: it.id } })}>
                  <Miniatura id={it.id} tamanho={48} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemNome} numberOfLines={2}>{e.nome}</Text>
                    <Text style={s.itemInfo}>{it.series} × {it.repeticoes} · descanso {it.descanso} s</Text>
                  </View>
                  <Icone nome="seta" tamanho={16} cor={cores.texto2} />
                </Pressable>
              );
            })}
          </View>
        ))}

        <View style={s.dica}>
          <Icone nome="info" tamanho={18} cor={cores.roxoEscuro} />
          <Text style={s.dicaTexto}>
            <Text style={{ fontFamily: fontes.negrito }}>Ombro com volume: </Text>
            a elevação lateral aparece várias vezes na semana. É ela que dá a “largura” do ombro. Quando completar todas as séries
            no topo das repetições, suba a carga (1–2 kg no ombro, 2–5 kg em glúteo e perna).
          </Text>
        </View>
        <Botao texto="Usar este plano na minha semana" tipo="contorno" onPress={() => router.push({ pathname: '/treino/plano/[id]', params: { id: `treina-mulher-${indice + 1}` } })} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  conteudo: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  hero: { backgroundColor: cores.escuro, borderRadius: raio.g, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroMarca: { fontFamily: fontes.titulo, fontSize: 18, color: cores.textoClaro },
  heroTitulo: { fontFamily: fontes.titulo, fontSize: 20, color: cores.textoClaro, letterSpacing: -0.3, lineHeight: 24 },
  heroTexto: { fontFamily: fontes.regular, fontSize: 12, color: cores.textoClaro2 },
  alternador: { flexDirection: 'row', backgroundColor: cores.cinza, borderRadius: 12, padding: 3, gap: 3 },
  opcao: { flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  opcaoAtiva: { backgroundColor: cores.cartao },
  opcaoTexto: { fontFamily: fontes.media, fontSize: 13, color: '#3F3F4A' },
  opcaoTextoAtivo: { fontFamily: fontes.semi, color: cores.texto },
  secao: { fontFamily: fontes.negrito, fontSize: 13, color: cores.texto },
  focos: { flexDirection: 'row', gap: 6 },
  foco: { flex: 1, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  focoNome: { fontFamily: fontes.negrito, fontSize: 13, color: cores.texto },
  focoTotal: { fontFamily: fontes.regular, fontSize: 11, color: cores.texto2, marginTop: 2 },
  dia: { backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: 16, overflow: 'hidden' },
  diaTopo: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#FAFAF7', borderBottomWidth: 1, borderColor: cores.borda },
  diaSigla: { fontFamily: fontes.negrito, fontSize: 12, color: cores.roxo, width: 36 },
  diaTitulo: { fontFamily: fontes.semi, fontSize: 15, color: cores.texto },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: cores.borda },
  itemNome: { fontFamily: fontes.semi, fontSize: 14, color: cores.texto },
  itemInfo: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2, marginTop: 2 },
  dica: { flexDirection: 'row', gap: 10, backgroundColor: cores.lilas, borderRadius: 14, padding: 12, alignItems: 'flex-start' },
  dicaTexto: { flex: 1, fontFamily: fontes.regular, fontSize: 13, color: '#2A1A8C', lineHeight: 19 },
  nota: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2, textAlign: 'center' },
});
