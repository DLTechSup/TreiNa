import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { Icone } from '@/components/Icone';
import { Botao, Chip, LinhaExercicio, Titulo } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { emSecoes, exercicios, filtrar, focos, grupos } from '@/data';
import { useDados } from '@/db/banco';

const NOME_FOCO: Record<string, string> = { Glúteo: 'Glúteo', Perna: 'Pernas', Posterior: 'Posterior de coxa', Ombro: 'Ombros' };

type Filtro = { grupo?: string; aparelho?: string; favoritos?: boolean; foco?: string };

export default function Biblioteca() {
  const params = useLocalSearchParams<{ grupo?: string; foco?: string }>();
  const { favoritos, alternarFavorito } = useDados();
  const [busca, setBusca] = useState('');
  const [f, setF] = useState<Filtro>({ grupo: params.grupo });
  const [painel, setPainel] = useState(false);

  // Outras telas abrem a biblioteca já filtrada (ex.: "Pernas" no Início, foco feminino)
  useEffect(() => { if (params.grupo) { setF({ grupo: params.grupo }); setBusca(''); } }, [params.grupo]);
  useEffect(() => { if (params.foco) { setF({ foco: params.foco }); setBusca(''); } }, [params.foco]);

  const lista = useMemo(
    () => filtrar({
      busca, grupo: f.grupo, equipamento: f.aparelho, foco: f.foco,
      ids: f.favoritos ? favoritos : undefined,
    }),
    [busca, f, favoritos],
  );
  const secoes = useMemo(() => {
    if (busca.trim()) return lista.length ? [{ titulo: 'Resultados', data: lista }] : [];
    if (f.foco) return emSecoes(lista, 'foco');
    if (f.grupo) return emSecoes(lista, 'padrao');
    return emSecoes(lista, 'grupo');
  }, [lista, busca, f]);

  const ativos: { texto: string; limpar: () => void }[] = [];
  if (f.grupo) ativos.push({ texto: f.grupo, limpar: () => setF((x) => ({ ...x, grupo: undefined })) });
  if (f.aparelho) ativos.push({ texto: f.aparelho, limpar: () => setF((x) => ({ ...x, aparelho: undefined })) });
  if (f.favoritos) ativos.push({ texto: 'Favoritos', limpar: () => setF((x) => ({ ...x, favoritos: undefined })) });
  if (f.foco) ativos.push({ texto: f.foco === 'todos' ? 'Foco feminino' : `Foco: ${NOME_FOCO[f.foco] ?? f.foco}`, limpar: () => setF((x) => ({ ...x, foco: undefined })) });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <View style={s.cabecalho}>
        <View>
          <Titulo>Biblioteca</Titulo>
          <Text style={s.sub}>{exercicios.length} exercícios de academia com vídeo</Text>
        </View>

        <View style={s.linhaBusca}>
          <View style={s.busca}>
            <Icone nome="busca" tamanho={18} cor={cores.texto2} />
            <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar (ex.: supino, leg press)" placeholderTextColor={cores.texto3}
              style={s.buscaInput} autoCorrect={false} returnKeyType="search" accessibilityLabel="Buscar exercício" />
            {busca.length > 0 && (
              <Pressable onPress={() => setBusca('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Limpar busca">
                <Icone nome="fechar" tamanho={18} cor={cores.texto2} />
              </Pressable>
            )}
          </View>
          <Pressable onPress={() => setPainel(true)} style={[s.filtrosBotao, ativos.length > 0 && { backgroundColor: cores.escuro, borderColor: cores.escuro }]}
            accessibilityRole="button" accessibilityLabel="Filtros">
            <Text style={[s.filtrosTexto, ativos.length > 0 && { color: cores.textoClaro }]}>Filtros{ativos.length ? ` · ${ativos.length}` : ''}</Text>
          </Pressable>
        </View>

        {/* Grupos musculares: atalho rápido (quebra em linhas, funciona no PC e no celular) */}
        {!ativos.length && !busca && (
          <View style={s.atalhos}>
            {grupos.map((g) => (
              <Pressable key={g.nome} onPress={() => setF({ grupo: g.nome })} style={({ pressed }) => [s.atalho, pressed && { opacity: 0.7 }]}>
                <Text style={s.atalhoTexto}>{g.nome}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setF({ favoritos: true })} style={[s.atalho, s.atalhoRoxo]}>
              <Text style={[s.atalhoTexto, { color: cores.roxoEscuro }]}>★ Favoritos</Text>
            </Pressable>
          </View>
        )}

        {ativos.length > 0 && (
          <View style={s.ativos}>
            {ativos.map((a) => (
              <Pressable key={a.texto} onPress={a.limpar} style={s.ativo} accessibilityLabel={`Tirar filtro ${a.texto}`}>
                <Text style={s.ativoTexto}>{a.texto}</Text>
                <Icone nome="fechar" tamanho={14} cor={cores.textoClaro} />
              </Pressable>
            ))}
            <Text onPress={() => setF({})} style={s.limparTudo}>Limpar</Text>
          </View>
        )}
      </View>

      <SectionList
        sections={secoes}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <LinhaExercicio exercicio={item} favorito={favoritos.has(item.id)} onFavorito={alternarFavorito}
            detalhe={`${item.grupo} · ${item.equipamento}`} />
        )}
        renderSectionHeader={({ section }) => (
          <View style={s.secao}>
            <Text style={s.secaoTitulo} numberOfLines={1}>{section.titulo}</Text>
            <Text style={s.secaoTotal}>{section.data.length} {section.data.length === 1 ? 'exercício' : 'exercícios'}</Text>
          </View>
        )}
        stickySectionHeadersEnabled
        initialNumToRender={14}
        maxToRenderPerBatch={20}
        windowSize={9}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={s.vazio}>
            <Icone nome={f.favoritos ? 'estrela' : 'busca'} tamanho={28} cor={cores.texto2} />
            <Text style={s.vazioTexto}>
              {f.favoritos && !busca
                ? 'Você ainda não tem favoritos. Toque na estrela de um exercício para guardá-lo aqui.'
                : 'Nenhum exercício encontrado com esses filtros.'}
            </Text>
          </View>
        }
      />

      <PainelFiltros visivel={painel} filtro={f} favoritos={favoritos.size} busca={busca}
        onFechar={() => setPainel(false)} onAplicar={(novo) => { setF(novo); setPainel(false); }} />
    </SafeAreaView>
  );
}

function PainelFiltros({
  visivel, filtro, favoritos, busca, onFechar, onAplicar,
}: { visivel: boolean; filtro: Filtro; favoritos: number; busca: string; onFechar: () => void; onAplicar: (f: Filtro) => void }) {
  const [f, setF] = useState<Filtro>(filtro);
  const [aberto, setAberto] = useState(false);
  if (visivel && !aberto) { setAberto(true); setF(filtro); } else if (!visivel && aberto) setAberto(false);

  // Aparelhos que existem para o grupo escolhido (com a quantidade), para não mostrar filtro vazio
  const aparelhos = useMemo(() => {
    const base = filtrar({ grupo: f.grupo, foco: f.foco });
    const m = new Map<string, number>();
    base.forEach((e) => m.set(e.equipamento, (m.get(e.equipamento) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [f.grupo, f.foco]);
  const total = filtrar({ busca, grupo: f.grupo, equipamento: f.aparelho, foco: f.foco }).length;

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <Pressable style={s.fundo} onPress={onFechar}>
        <Pressable style={s.painel} onPress={() => {}}>
          <View style={s.painelTopo}>
            <Text style={s.painelTitulo}>Filtrar exercícios</Text>
            <Pressable onPress={onFechar} hitSlop={10} accessibilityLabel="Fechar"><Icone nome="fechar" tamanho={22} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 8 }}>
            <View style={{ gap: 8 }}>
              <Text style={s.painelRotulo}>Grupo muscular</Text>
              <View style={s.wrap}>
                <Chip texto="Todos" ativo={!f.grupo} escuro onPress={() => setF({ ...f, grupo: undefined, aparelho: undefined })} />
                {grupos.map((g) => (
                  <Chip key={g.nome} texto={g.nome} contagem={g.total} escuro ativo={f.grupo === g.nome}
                    onPress={() => setF({ ...f, grupo: f.grupo === g.nome ? undefined : g.nome, aparelho: undefined })} />
                ))}
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Text style={s.painelRotulo}>Aparelho / equipamento{f.grupo ? ` em ${f.grupo}` : ''}</Text>
              <View style={s.wrap}>
                <Chip texto="Todos" ativo={!f.aparelho} onPress={() => setF({ ...f, aparelho: undefined })} />
                {aparelhos.map(([nome, n]) => (
                  <Chip key={nome} texto={nome} contagem={n} ativo={f.aparelho === nome} onPress={() => setF({ ...f, aparelho: f.aparelho === nome ? undefined : nome })} />
                ))}
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Text style={s.painelRotulo}>Atalhos</Text>
              <View style={s.wrap}>
                <Chip texto="★ Favoritos" contagem={favoritos} ativo={!!f.favoritos} onPress={() => setF({ ...f, favoritos: f.favoritos ? undefined : true })} />
                <Chip texto="Foco feminino" ativo={f.foco === 'todos'} onPress={() => setF({ ...f, foco: f.foco === 'todos' ? undefined : 'todos' })} />
                {focos.map((x) => (
                  <Chip key={x.nome} texto={NOME_FOCO[x.nome]} contagem={x.total} ativo={f.foco === x.nome}
                    onPress={() => setF({ ...f, foco: f.foco === x.nome ? undefined : x.nome })} />
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Botao texto="Limpar" tipo="contorno" style={{ flex: 1 }} onPress={() => onAplicar({})} />
            <Botao texto={`Ver ${total} exercício${total === 1 ? '' : 's'}`} style={{ flex: 2 }} onPress={() => onAplicar(f)} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  cabecalho: { paddingHorizontal: 20, paddingTop: 12, gap: 12, paddingBottom: 8 },
  sub: { fontFamily: fontes.regular, fontSize: 13, color: cores.texto2, marginTop: 2 },
  linhaBusca: { flexDirection: 'row', gap: 8 },
  busca: { flex: 1, height: 46, borderRadius: 12, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  buscaInput: { flex: 1, fontFamily: fontes.regular, fontSize: 15, color: cores.texto, paddingVertical: 0, minWidth: 0 },
  filtrosBotao: { height: 46, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.cartao, justifyContent: 'center' },
  filtrosTexto: { fontFamily: fontes.semi, fontSize: 14, color: cores.texto },
  atalhos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  atalho: { paddingHorizontal: 12, height: 32, borderRadius: raio.pill, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, justifyContent: 'center' },
  atalhoRoxo: { backgroundColor: cores.lilas, borderColor: cores.lilas },
  atalhoTexto: { fontFamily: fontes.media, fontSize: 13, color: cores.texto },
  ativos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  ativo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 10, height: 32, borderRadius: raio.pill, backgroundColor: cores.roxo },
  ativoTexto: { fontFamily: fontes.semi, fontSize: 13, color: cores.textoClaro },
  limparTudo: { fontFamily: fontes.semi, fontSize: 13, color: cores.roxo, padding: 6 },
  secao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, backgroundColor: cores.fundo, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  secaoTitulo: { flex: 1, fontFamily: fontes.negrito, fontSize: 15, color: cores.texto },
  secaoTotal: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2 },
  vazio: { alignItems: 'center', gap: 10, padding: 40 },
  vazioTexto: { fontFamily: fontes.regular, fontSize: 14, color: cores.texto2, textAlign: 'center', lineHeight: 20 },
  fundo: { flex: 1, backgroundColor: 'rgba(22,22,29,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  painel: { width: '100%', maxWidth: 560, maxHeight: '86%', backgroundColor: cores.fundo, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28, gap: 14 },
  painelTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  painelTitulo: { fontFamily: fontes.titulo, fontSize: 20, color: cores.texto },
  painelRotulo: { fontFamily: fontes.negrito, fontSize: 13, color: cores.texto },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
