import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icone, type NomeIcone } from './Icone';
import { Botao, Titulo } from './ui';
import { cores, fontes, raio } from '@/constants/tema';

type Props = {
  titulo: string;
  icone: NomeIcone;
  chamada: string;
  itens: string[];
  botao?: { texto: string; onPress: () => void };
};

/** Tela das abas que ganham conteúdo na próxima fase (Treinos e Histórico). */
export function EmBreve({ titulo, icone, chamada, itens, botao }: Props) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.conteudo}>
        <Titulo>{titulo}</Titulo>
        <View style={s.cartao}>
          <View style={s.icone}><Icone nome={icone} tamanho={28} cor={cores.lima} /></View>
          <Text style={s.chamada}>{chamada}</Text>
          {itens.map((t) => (
            <View key={t} style={s.item}>
              <Icone nome="check" tamanho={16} cor={cores.lima} espessura={3} />
              <Text style={s.itemTexto}>{t}</Text>
            </View>
          ))}
          <Text style={s.selo}>CHEGA NA PRÓXIMA VERSÃO</Text>
        </View>
        {botao && <Botao texto={botao.texto} onPress={botao.onPress} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  conteudo: { padding: 20, gap: 16 },
  cartao: { backgroundColor: cores.escuro, borderRadius: raio.g, padding: 20, gap: 12 },
  icone: { width: 52, height: 52, borderRadius: 14, backgroundColor: cores.escuro2, alignItems: 'center', justifyContent: 'center' },
  chamada: { fontFamily: fontes.titulo, fontSize: 20, color: cores.textoClaro, lineHeight: 26 },
  item: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  itemTexto: { flex: 1, fontFamily: fontes.regular, fontSize: 14, color: cores.textoClaro2, lineHeight: 20 },
  selo: {
    alignSelf: 'flex-start', marginTop: 4, backgroundColor: cores.lima, color: cores.escuro, overflow: 'hidden',
    fontFamily: fontes.negrito, fontSize: 11, letterSpacing: 0.5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
});
