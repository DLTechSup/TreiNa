import { useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View, type ListViewToken } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Icone } from './Icone';
import { FaixaRolavel } from './pecas';
import { Botao, Chip } from './ui';
import { cores, fontes, raio } from '@/constants/tema';
import { filtrar, grupos, type Exercicio } from '@/data';
import { MiniaturaExercicio, VideoDoExercicio } from './Midia';

type Props = {
  visivel: boolean;
  /** Grupos escolhidos para o dia: aparecem primeiro e já filtram a lista. */
  gruposDoDia: string[];
  jaNoDia: Set<string>;
  onFechar: () => void;
  onAdicionar: (ids: string[]) => void;
};

/** Tela cheia para escolher exercícios da biblioteca e colocar no dia do treino. */
export function SeletorExercicios({ visivel, gruposDoDia, jaNoDia, onFechar, onAdicionar }: Props) {
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState<string | undefined>(undefined);
  const [equip, setEquip] = useState<string | undefined>(undefined);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [aberto, setAberto] = useState(false);

  // Ao abrir: começa filtrando pelo primeiro grupo do dia
  if (visivel && !aberto) {
    setAberto(true);
    setGrupo(gruposDoDia[0]);
    setMarcados([]);
    setBusca('');
    setEquip(undefined);
  } else if (!visivel && aberto) {
    setAberto(false);
  }

  // Buscando por nome: procura em toda a biblioteca (sem os filtros de grupo e aparelho)
  const lista = useMemo(() => (busca.trim() ? filtrar({ busca }) : filtrar({ grupo, equipamento: equip })), [busca, grupo, equip]);
  const aparelhos = useMemo(() => {
    const m = new Map<string, number>();
    filtrar({ grupo }).forEach((e) => m.set(e.equipamento, (m.get(e.equipamento) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [grupo]);
  const ordemGrupos = useMemo(
    () => [...gruposDoDia, ...grupos.map((g) => g.nome).filter((g) => !gruposDoDia.includes(g))],
    [gruposDoDia],
  );

  // Cartões em 2 colunas, com o vídeo grande se movendo
  const tela = useWindowDimensions();
  const largCartao = Math.floor((Math.min(tela.width, 560) - 32 - 10) / 2);
  // Só os cartões que estão aparecendo na tela tocam o vídeo (os outros mostram a imagem parada): fica leve no celular
  const [naTela, setNaTela] = useState<Set<string>>(new Set());
  const aoMudarNaTela = useRef(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    setNaTela(new Set(viewableItems.map((v) => (v.item as Exercicio).id)));
  }).current;
  const configNaTela = useRef({ itemVisiblePercentThreshold: 15 }).current;

  const alternar = (id: string) =>
    setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={onFechar} presentationStyle="fullScreen">
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo, alignItems: 'center' }}>
          <View style={s.coluna}>
          <View style={s.topo}>
            <Pressable onPress={onFechar} style={s.fechar} accessibilityLabel="Fechar" hitSlop={8}>
              <Icone nome="fechar" tamanho={22} />
            </Pressable>
            <Text style={s.titulo}>Adicionar exercícios</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={s.busca}>
            <Icone nome="busca" tamanho={18} cor={cores.texto2} />
            <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar exercício" placeholderTextColor={cores.texto3} style={s.buscaInput} />
            {busca ? <Pressable onPress={() => setBusca('')} hitSlop={8}><Icone nome="fechar" tamanho={16} cor={cores.texto2} /></Pressable> : null}
          </View>

          {/* Filtros compactos: uma linha para o grupo e outra para o aparelho (rolam para o lado) */}
          {!busca.trim() && (
            <View style={s.filtros}>
              <FaixaRolavel selecionado={grupo ? ordemGrupos.indexOf(grupo) + 1 : 0}>
                <Chip pequeno texto="Todos" ativo={!grupo} onPress={() => { setGrupo(undefined); setEquip(undefined); }} />
                {ordemGrupos.map((g) => (
                  <Chip pequeno key={g} texto={g} ativo={grupo === g} onPress={() => { setGrupo(grupo === g ? undefined : g); setEquip(undefined); }} />
                ))}
              </FaixaRolavel>
              <FaixaRolavel key={grupo ?? 'todos'}>
                <Chip pequeno escuro texto="Todos os aparelhos" ativo={!equip} onPress={() => setEquip(undefined)} />
                {aparelhos.map(([nome, n]) => (
                  <Chip pequeno escuro key={nome} texto={nome} contagem={n} ativo={equip === nome} onPress={() => setEquip(equip === nome ? undefined : nome)} />
                ))}
              </FaixaRolavel>
            </View>
          )}

          <FlatList
            data={lista}
            keyExtractor={(e) => e.id}
            numColumns={2}
            columnWrapperStyle={s.colunas}
            initialNumToRender={6}
            maxToRenderPerBatch={4}
            windowSize={5}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 110, gap: 10 }}
            onViewableItemsChanged={aoMudarNaTela}
            viewabilityConfig={configNaTela}
            ListHeaderComponent={
              <Text style={s.contagem}>
                {busca.trim()
                  ? `${lista.length} encontrado${lista.length === 1 ? '' : 's'} em todos os grupos`
                  : `${lista.length} exercício${lista.length === 1 ? '' : 's'}${grupo ? ` de ${grupo}` : ''}${equip ? ` · ${equip}` : ''}`}
              </Text>
            }
            ListEmptyComponent={<Text style={s.vazio}>Nenhum exercício com esses filtros.</Text>}
            renderItem={({ item }) => (
              <Cartao e={item} largura={largCartao} mexendo={naTela.has(item.id)} marcado={marcados.includes(item.id)} jaNoDia={jaNoDia.has(item.id)} onPress={() => alternar(item.id)} />
            )}
          />

          <View style={s.rodape}>
            <Botao
              texto={marcados.length ? `Adicionar ${marcados.length} exercício${marcados.length > 1 ? 's' : ''}` : 'Toque nos exercícios para marcar'}
              desativado={!marcados.length}
              onPress={() => onAdicionar(marcados)}
            />
          </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

/** Cartão do exercício: vídeo grande se movendo (para ver o movimento), nome e a bolinha para marcar. */
function Cartao({ e, largura, mexendo, marcado, jaNoDia, onPress }: {
  e: Exercicio; largura: number; mexendo: boolean; marcado: boolean; jaNoDia: boolean; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.cartao, { width: largura }, marcado && s.cartaoMarcado, pressed && { opacity: 0.85 }]}
      accessibilityRole="checkbox" accessibilityState={{ checked: marcado }} accessibilityLabel={e.nome}>
      <View style={[s.midia, { height: Math.round(largura * (e.video ? 4 / 3 : 1)) - 4 }]} pointerEvents="none">
        {/* A imagem fica por baixo: aparece enquanto o vídeo carrega (ou se o celular estiver em economia de bateria) */}
        <MiniaturaExercicio id={e.id} style={StyleSheet.absoluteFill} ajuste="contain" />
        {mexendo && <VideoDoExercicio id={e.id} ajuste={e.video ? 'cover' : 'contain'} />}
        {jaNoDia && <Text style={s.selo}>Já no dia</Text>}
      </View>
      <View style={[s.check, marcado && s.checkAtivo]} pointerEvents="none">
        {marcado && <Icone nome="check" tamanho={18} cor={cores.textoClaro} espessura={3} />}
      </View>
      <View style={s.textos}>
        <Text style={s.nome} numberOfLines={3}>{e.nome}</Text>
        <Text style={s.info} numberOfLines={1}>{e.grupo} · {e.equipamento}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  coluna: { flex: 1, width: '100%', maxWidth: 560 },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 2 },
  fechar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: fontes.titulo, fontSize: 18, color: cores.texto },
  busca: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingHorizontal: 12, height: 42, borderRadius: raio.m, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda },
  buscaInput: { flex: 1, minWidth: 0, fontFamily: fontes.media, fontSize: 16, color: cores.texto, height: 40 },
  filtros: { gap: 6, paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderColor: cores.borda },
  contagem: { fontFamily: fontes.media, fontSize: 12, color: cores.texto2, paddingHorizontal: 16, paddingVertical: 8 },
  colunas: { gap: 10, paddingHorizontal: 16 },
  cartao: { backgroundColor: cores.cartao, borderRadius: 16, borderWidth: 2, borderColor: cores.borda, overflow: 'hidden' },
  cartaoMarcado: { borderColor: cores.roxo, backgroundColor: cores.lilas },
  midia: { width: '100%', backgroundColor: '#FFFFFF' },
  selo: { position: 'absolute', left: 8, bottom: 8, backgroundColor: cores.escuro, color: cores.lima, fontFamily: fontes.semi, fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: raio.pill, overflow: 'hidden' },
  check: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: cores.borda, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
  checkAtivo: { backgroundColor: cores.roxo, borderColor: cores.roxo },
  textos: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, gap: 2 },
  nome: { fontFamily: fontes.semi, fontSize: 15, color: cores.texto, lineHeight: 19 },
  info: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2 },
  vazio: { textAlign: 'center', padding: 32, fontFamily: fontes.regular, color: cores.texto2 },
  rodape: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, backgroundColor: 'rgba(245,244,240,0.96)', borderTopWidth: 1, borderColor: cores.borda },
});
