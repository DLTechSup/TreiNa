import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BarraProgresso } from '@/components/pecas';
import { Botao } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { totalBytesVideos } from '@/data';
import { useEstadoVideos, useVideosDisponiveis } from '@/lib/midiaPrivada';

export const megas = (b: number) => `${Math.round(b / 1e6)} MB`;
export const porcento = (feito: number, total: number) => `${total ? Math.floor((feito / total) * 100) : 0}%`;

/**
 * Aviso da atualização (Início) e situação dela (Perfil, com `sempre`).
 * Por dentro, a atualização guarda os vídeos dos exercícios no celular; na tela aparece só como "atualização".
 */
export function CartaoVideos({ sempre }: { sempre?: boolean }) {
  const router = useRouter();
  const { total, guardados, verificado, atualizando } = useEstadoVideos();
  const disponivel = useVideosDisponiveis();
  if (!total || !verificado) return null;
  const completo = guardados >= total;
  if (completo && !sempre) return null;
  // Só oferece a atualização quando ela já está pronta no servidor para esta conta
  if (!completo && !atualizando && !disponivel) return null;

  if (completo) {
    return (
      <Pressable onPress={() => router.push('/atualizacao')} style={s.linha} accessibilityRole="button">
        <Text style={s.ok}>✓</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.linhaTitulo}>TreiNa atualizado</Text>
          <Text style={s.linhaTexto}>Atualização completa instalada</Text>
        </View>
        <Text style={s.seta}>›</Text>
      </Pressable>
    );
  }

  if (atualizando) {
    return (
      <Pressable onPress={() => router.push('/atualizacao')} style={s.cartao} accessibilityRole="button">
        <Text style={s.selo}>ATUALIZANDO</Text>
        <Text style={s.titulo}>Atualizando… {porcento(guardados, total)}</Text>
        <BarraProgresso valor={guardados / total} cor={cores.lima} fundo={cores.escuro3} />
        <Text style={s.texto}>Deixe o app aberto até terminar.</Text>
      </Pressable>
    );
  }

  return (
    <View style={s.cartao}>
      <Text style={s.selo}>ATUALIZAÇÃO</Text>
      <Text style={s.titulo}>{guardados ? 'Termine a atualização do TreiNa' : 'Atualização disponível'}</Text>
      <Text style={s.texto}>
        Uma atualização do TreiNa está pronta ({megas(totalBytesVideos)}). Ela é feita uma vez só. Use o Wi-Fi.
      </Text>
      {guardados > 0 && <BarraProgresso valor={guardados / total} cor={cores.lima} fundo={cores.escuro3} />}
      <Botao texto={guardados ? `Continuar (${porcento(guardados, total)})` : 'Atualizar'} tipo="lima" onPress={() => router.push('/atualizacao')} />
    </View>
  );
}

const s = StyleSheet.create({
  cartao: { backgroundColor: cores.escuro, borderRadius: raio.g, padding: 18, gap: 10 },
  selo: { alignSelf: 'flex-start', backgroundColor: cores.escuro3, color: cores.lima, fontFamily: fontes.negrito, fontSize: 11, letterSpacing: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: raio.pill, overflow: 'hidden' },
  titulo: { fontFamily: fontes.titulo, fontSize: 19, color: cores.textoClaro },
  texto: { fontFamily: fontes.regular, fontSize: 13, color: cores.textoClaro2, lineHeight: 19 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: cores.cartao, borderRadius: raio.m, borderWidth: 1, borderColor: cores.borda, padding: 14 },
  ok: { width: 32, height: 32, borderRadius: 16, backgroundColor: cores.lima, textAlign: 'center', lineHeight: 32, fontFamily: fontes.negrito, color: cores.texto, overflow: 'hidden' },
  linhaTitulo: { fontFamily: fontes.semi, fontSize: 14, color: cores.texto },
  linhaTexto: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2, marginTop: 2 },
  seta: { fontSize: 22, color: cores.texto2 },
});
