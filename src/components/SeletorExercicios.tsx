import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { Icone } from './Icone';
import { FaixaRolavel } from './pecas';
import { Botao, Chip } from './ui';
import { cores, fontes, raio } from '@/constants/tema';
import { filtrar, grupos, type Exercicio } from '@/data';
import { miniaturas } from '@/data/midia';

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
            initialNumToRender={14}
            windowSize={7}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 100 }}
            ListHeaderComponent={
              <Text style={s.contagem}>
                {busca.trim()
                  ? `${lista.length} encontrado${lista.length === 1 ? '' : 's'} em todos os grupos`
                  : `${lista.length} exercício${lista.length === 1 ? '' : 's'}${grupo ? ` de ${grupo}` : ''}${equip ? ` · ${equip}` : ''}`}
              </Text>
            }
            ListEmptyComponent={<Text style={s.vazio}>Nenhum exercício com esses filtros.</Text>}
            renderItem={({ item }) => (
              <Linha e={item} marcado={marcados.includes(item.id)} jaNoDia={jaNoDia.has(item.id)} onPress={() => alternar(item.id)} />
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

function Linha({ e, marcado, jaNoDia, onPress }: { e: Exercicio; marcado: boolean; jaNoDia: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.linha, marcado && { backgroundColor: cores.lilas }, pressed && { opacity: 0.8 }]}
      accessibilityRole="checkbox" accessibilityState={{ checked: marcado }} accessibilityLabel={e.nome}>
      <Image source={miniaturas[e.id]} style={s.img} contentFit="cover" />
      <View style={{ flex: 1 }}>
        <Text style={s.nome} numberOfLines={2}>{e.nome}</Text>
        <Text style={s.info} numberOfLines={1}>{e.grupo} · {e.equipamento}{jaNoDia ? ' · já está no dia' : ''}</Text>
      </View>
      <View style={[s.check, marcado && s.checkAtivo]}>
        {marcado && <Icone nome="check" tamanho={16} cor={cores.textoClaro} espessura={3} />}
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
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: cores.cartao, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: cores.borda },
  img: { width: 56, height: 56, borderRadius: 10, backgroundColor: cores.cinza },
  nome: { fontFamily: fontes.semi, fontSize: 14, color: cores.texto, lineHeight: 18 },
  info: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2, marginTop: 2 },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: cores.borda, alignItems: 'center', justifyContent: 'center' },
  checkAtivo: { backgroundColor: cores.roxo, borderColor: cores.roxo },
  vazio: { textAlign: 'center', padding: 32, fontFamily: fontes.regular, color: cores.texto2 },
  rodape: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, backgroundColor: 'rgba(245,244,240,0.96)', borderTopWidth: 1, borderColor: cores.borda },
});
