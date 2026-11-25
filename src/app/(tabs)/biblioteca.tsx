import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { Icone } from '@/components/Icone';
import { Chip, LinhaExercicio, Titulo } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { emSecoes, equipamentos, exercicios, filtrar, grupos, totalFocoFeminino } from '@/data';
import { useDados } from '@/db/banco';

// Filtros especiais que aparecem junto dos grupos musculares
const FAVORITOS = 'Favoritos';
const FOCO = 'Foco feminino';

export default function Biblioteca() {
  const params = useLocalSearchParams<{ grupo?: string; foco?: string }>();
  const { favoritos, alternarFavorito } = useDados();
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState<string | undefined>(params.grupo);
  const [foco, setFoco] = useState<string | undefined>(params.foco);
  const [equipamento, setEquipamento] = useState<string | undefined>();

  // Quando outra tela abre a biblioteca já filtrada (ex.: "Glúteos" no Início)
  useEffect(() => {
    if (params.grupo) { setGrupo(params.grupo); setFoco(undefined); setBusca(''); }
  }, [params.grupo]);
  useEffect(() => {
    if (params.foco) { setGrupo(FOCO); setFoco(params.foco); setBusca(''); }
  }, [params.foco]);

  const secoes = useMemo(() => {
    const ehFavoritos = grupo === FAVORITOS;
    const ehFoco = grupo === FOCO;
    const lista = filtrar({
      busca,
      equipamento,
      grupo: ehFavoritos || ehFoco ? undefined : grupo,
      foco: ehFoco ? foco ?? 'todos' : undefined,
      ids: ehFavoritos ? favoritos : undefined,
    });
    if (busca.trim()) return lista.length ? [{ titulo: 'Resultados', data: lista }] : [];
    if (ehFoco) return emSecoes(lista, 'foco');
    if (grupo && !ehFavoritos) return emSecoes(lista, 'padrao');
    return emSecoes(lista, 'grupo');
  }, [busca, grupo, foco, equipamento, favoritos]);

  const total = secoes.reduce((n, s) => n + s.data.length, 0);
  const escolherGrupo = (g?: string) => { setGrupo(g); setFoco(undefined); };
  const grupoMuscular = grupos.find((g) => g.nome === grupo);
  const porVariacao = !!grupoMuscular && !busca;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <View style={s.cabecalho}>
        <View>
          <Titulo>Biblioteca</Titulo>
          <Text style={s.sub}>{exercicios.length} exercícios com vídeo · {grupos.length} grupos musculares</Text>
        </View>

        <View style={s.busca}>
          <Icone nome="busca" tamanho={18} cor={cores.texto2} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar exercício (ex.: supino, glúteo)"
            placeholderTextColor={cores.texto3}
            style={s.buscaInput}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Buscar exercício"
          />
          {busca.length > 0 && (
            <Pressable onPress={() => setBusca('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Limpar busca">
              <Icone nome="fechar" tamanho={18} cor={cores.texto2} />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipsFaixa}>
          <Chip texto="Todos" ativo={!grupo} escuro onPress={() => escolherGrupo(undefined)} />
          {/* o grupo escolhido aparece logo depois de "Todos", para ficar sempre à vista */}
          {grupoMuscular && (
            <Chip texto={grupoMuscular.nome} contagem={grupoMuscular.total} ativo escuro onPress={() => escolherGrupo(undefined)} />
          )}
          <Chip texto={FAVORITOS} contagem={favoritos.size} ativo={grupo === FAVORITOS} escuro onPress={() => escolherGrupo(FAVORITOS)} />
          <Chip texto={FOCO} contagem={totalFocoFeminino} ativo={grupo === FOCO} escuro onPress={() => escolherGrupo(FOCO)} />
          {grupos.filter((g) => g.nome !== grupo).map((g) => (
            <Chip key={g.nome} texto={g.nome} contagem={g.total} escuro onPress={() => escolherGrupo(g.nome)} />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipsFaixa}>
          <Chip texto="Todo equipamento" ativo={!equipamento} onPress={() => setEquipamento(undefined)} />
          {equipamentos.slice(0, 12).map((e) => (
            <Chip key={e.nome} texto={e.nome} ativo={equipamento === e.nome} onPress={() => setEquipamento(equipamento === e.nome ? undefined : e.nome)} />
          ))}
        </ScrollView>
      </View>

      <SectionList
        sections={secoes}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <LinhaExercicio exercicio={item} favorito={favoritos.has(item.id)} onFavorito={alternarFavorito}
            detalhe={porVariacao ? item.equipamento : `${item.grupo} · ${item.equipamento}`} />
        )}
        renderSectionHeader={({ section }) => (
          <View style={s.secao}>
            <Text style={s.secaoTitulo} numberOfLines={1}>{section.titulo}</Text>
            <Text style={s.secaoTotal}>
              {section.data.length} {porVariacao ? (section.data.length === 1 ? 'variação' : 'variações') : section.data.length === 1 ? 'exercício' : 'exercícios'}
            </Text>
          </View>
        )}
        stickySectionHeadersEnabled
        initialNumToRender={14}
        maxToRenderPerBatch={20}
        windowSize={9}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={total > 0 ? <Text style={s.total}>{total} {total === 1 ? 'exercício' : 'exercícios'}</Text> : undefined}
        ListEmptyComponent={
          <View style={s.vazio}>
            <Icone nome={grupo === FAVORITOS ? 'estrela' : 'busca'} tamanho={28} cor={cores.texto2} />
            <Text style={s.vazioTexto}>
              {grupo === FAVORITOS && !busca
                ? 'Você ainda não tem favoritos. Toque na estrela de um exercício para guardá-lo aqui.'
                : 'Nenhum exercício encontrado com esses filtros.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  cabecalho: { paddingHorizontal: 20, paddingTop: 12, gap: 10, paddingBottom: 6 },
  sub: { fontFamily: fontes.regular, fontSize: 13, color: cores.texto2, marginTop: 2 },
  busca: {
    height: 46, borderRadius: 12, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda,
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12,
  },
  buscaInput: { flex: 1, fontFamily: fontes.regular, fontSize: 15, color: cores.texto, paddingVertical: 0 },
  chipsFaixa: { marginHorizontal: -20, flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: 20 },
  total: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2, paddingHorizontal: 20, paddingVertical: 6 },
  secao: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8,
    backgroundColor: cores.fundo, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8,
  },
  secaoTitulo: { flex: 1, fontFamily: fontes.negrito, fontSize: 15, color: cores.texto },
  secaoTotal: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2 },
  vazio: { alignItems: 'center', gap: 10, padding: 40 },
  vazioTexto: { fontFamily: fontes.regular, fontSize: 14, color: cores.texto2, textAlign: 'center', lineHeight: 20 },
});
