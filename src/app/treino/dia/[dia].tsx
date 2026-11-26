import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Icone } from '@/components/Icone';
import { Confirmar, Contador } from '@/components/pecas';
import { SeletorExercicios } from '@/components/SeletorExercicios';
import { Botao, Chip, Miniatura, TopoVoltar } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { grupos as todosGrupos, porId } from '@/data';
import { gruposDe, minutosEstimados } from '@/data/planos';
import { NOMES_DIAS, SIGLAS_DIAS, novoId, useDados, type ItemPlano } from '@/db/banco';
import { descanso as txtDescanso } from '@/lib/datas';

const DESCANSOS = [30, 45, 60, 90, 120, 180];

/** Nome automático a partir dos grupos: "Pernas e Glúteos", "Peitoral, Tríceps e Ombros". */
function nomeAuto(g: string[]) {
  if (!g.length) return '';
  if (g.length === 1) return g[0];
  return `${g.slice(0, -1).join(', ')} e ${g[g.length - 1]}`;
}

export default function EditarDia() {
  const router = useRouter();
  const { dia: param } = useLocalSearchParams<{ dia: string }>();
  const dia = Math.min(7, Math.max(1, Number(param) || 1));
  const { semana, salvarDia, pronto } = useDados();

  const [nome, setNome] = useState('');
  const [grupos, setGrupos] = useState<string[]>([]);
  const [itens, setItens] = useState<ItemPlano[]>([]);
  const [seletor, setSeletor] = useState(false);
  const [limpar, setLimpar] = useState(false);
  const [salvo, setSalvo] = useState(true);
  const carregadoDia = useRef(0);

  // Carrega o dia uma vez (e de novo ao trocar de dia)
  useEffect(() => {
    if (!pronto || carregadoDia.current === dia) return;
    const d = semana[dia - 1];
    setNome(d.nome);
    setGrupos(d.grupos);
    setItens(d.itens);
    setSalvo(true);
    carregadoDia.current = dia;
  }, [pronto, dia, semana]);

  // Salva sozinho meio segundo depois de cada mudança
  const nomeFinal = nome.trim() || nomeAuto(grupos.length ? grupos : gruposDe(itens.map((i) => i.exercicio_id)));
  const salvarAgora = async () => {
    const g = [...grupos, ...gruposDe(itens.map((i) => i.exercicio_id)).filter((x) => !grupos.includes(x))];
    await salvarDia({ dia, nome: itens.length ? nomeFinal : nome.trim(), grupos: g, itens });
    setSalvo(true);
  };
  const salvarRef = useRef(salvarAgora);
  useEffect(() => { salvarRef.current = salvarAgora; });
  useEffect(() => {
    if (carregadoDia.current !== dia || salvo) return;
    const t = setTimeout(() => { salvarRef.current(); }, 500);
    return () => clearTimeout(t);
  }, [nome, grupos, itens, salvo, dia]);

  const mudou = () => setSalvo(false);
  const atualizar = (id: string, parcial: Partial<ItemPlano>) => {
    setItens((l) => l.map((i) => (i.id === id ? { ...i, ...parcial } : i)));
    mudou();
  };
  const mover = (i: number, d: -1 | 1) => {
    setItens((l) => {
      const n = [...l];
      const j = i + d;
      if (j < 0 || j >= n.length) return l;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
    mudou();
  };
  const remover = (id: string) => { setItens((l) => l.filter((i) => i.id !== id)); mudou(); };
  const alternarGrupo = (g: string) => { setGrupos((l) => (l.includes(g) ? l.filter((x) => x !== g) : [...l, g])); mudou(); };

  const adicionar = (ids: string[]) => {
    setItens((l) => [
      ...l,
      ...ids.map((exercicio_id) => {
        const tempo = porId(exercicio_id)?.medida === 'tempo';
        return { id: novoId(), exercicio_id, series: 3, repeticoes: tempo ? '30 s' : '12', carga: null, descanso: 60 };
      }),
    ]);
    mudou();
    setSeletor(false);
  };

  const jaNoDia = useMemo(() => new Set(itens.map((i) => i.exercicio_id)), [itens]);
  const proximo = dia < 7 ? dia + 1 : 1;
  const garantirSalvo = async () => { if (!salvo) await salvarAgora(); };
  const irPara = async (d: number) => {
    await garantirSalvo();
    router.replace({ pathname: '/treino/dia/[dia]', params: { dia: String(d) } });
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <TopoVoltar titulo={`Treino de ${NOMES_DIAS[dia].toLowerCase()}`} direita={
        <Text style={[s.salvo, !salvo && { color: cores.texto3 }]}>{salvo ? 'Salvo ✓' : 'Salvando…'}</Text>
      } />
      <View style={s.dias}>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => {
          const tem = semana[d - 1].itens.length > 0 || (d === dia && itens.length > 0);
          return (
            <Pressable key={d} onPress={() => d !== dia && irPara(d)} style={[s.diaChip, d === dia && s.diaChipAtivo]}>
              <Text style={[s.diaChipTexto, d === dia && { color: cores.textoClaro }]}>{SIGLAS_DIAS[d]}</Text>
              <View style={[s.pontinho, { backgroundColor: tem ? (d === dia ? cores.lima : cores.roxo) : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.conteudo} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 6 }}>
            <Text style={s.rotulo}>Nome do treino</Text>
            <TextInput value={nome} onChangeText={(t) => { setNome(t); mudou(); }} placeholder={nomeAuto(grupos) || 'Ex.: Pernas e glúteo'}
              placeholderTextColor={cores.texto3} style={s.input} />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={s.rotulo}>Grupos musculares do dia <Text style={s.cinza}>· filtram a lista de exercícios</Text></Text>
            <View style={s.grupos}>
              {todosGrupos.map((g) => <Chip key={g.nome} texto={g.nome} ativo={grupos.includes(g.nome)} onPress={() => alternarGrupo(g.nome)} />)}
            </View>
          </View>

          <View style={s.linhaTitulo}>
            <Text style={s.secao}>Exercícios {itens.length ? `(${itens.length})` : ''}</Text>
            {itens.length > 0 && <Text style={s.cinza}>~{minutosEstimados(itens)} min</Text>}
          </View>

          {itens.length === 0 && (
            <View style={s.vazio}>
              <Icone nome="treinos" tamanho={28} cor={cores.texto3} />
              <Text style={s.vazioTexto}>
                {grupos.length ? `Agora adicione os exercícios de ${grupos.join(', ')}.` : 'Escolha os grupos acima e adicione os exercícios.'}
                {'\n'}Sem exercícios, este dia fica como descanso.
              </Text>
            </View>
          )}

          {itens.map((it, i) => {
            const e = porId(it.exercicio_id);
            return (
              <View key={it.id} style={s.item}>
                <View style={s.itemTopo}>
                  <Miniatura id={it.exercicio_id} tamanho={52} telaCheia />
                  <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/exercicio/[id]', params: { id: it.exercicio_id } })}>
                    <Text style={s.itemNome} numberOfLines={2}>{i + 1}. {e?.nome ?? it.exercicio_id}</Text>
                    <Text style={s.itemInfo} numberOfLines={1}>{e?.grupo} · {e?.equipamento}</Text>
                  </Pressable>
                  <View style={s.acoesSetas}>
                    <Pressable onPress={() => mover(i, -1)} style={[s.acao, i === 0 && { opacity: 0.35 }]} hitSlop={2} accessibilityLabel="Subir"><Text style={s.acaoTexto}>↑</Text></Pressable>
                    <Pressable onPress={() => mover(i, 1)} style={[s.acao, i === itens.length - 1 && { opacity: 0.35 }]} hitSlop={2} accessibilityLabel="Descer"><Text style={s.acaoTexto}>↓</Text></Pressable>
                  </View>
                  <Pressable onPress={() => remover(it.id)} style={[s.acao, { alignSelf: 'flex-start' }]} hitSlop={4} accessibilityLabel="Remover"><Icone nome="fechar" tamanho={16} cor="#C2410C" /></Pressable>
                </View>
                <View style={s.controles}>
                  <Contador rotulo="Séries" valor={it.series} min={1} max={12} largura={34} onMudar={(v) => atualizar(it.id, { series: v ?? 1 })} />
                  <View style={{ gap: 4, flex: 1, minWidth: 92 }}>
                    <Text style={s.rotuloPeq}>{e?.medida === 'tempo' ? 'Tempo / reps' : 'Repetições'}</Text>
                    <TextInput value={it.repeticoes} onChangeText={(t) => atualizar(it.id, { repeticoes: t })} style={s.inputPeq}
                      placeholder="12" placeholderTextColor={cores.texto3} />
                  </View>
                  <Contador rotulo="Carga (kg)" valor={it.carga} min={0} max={500} passo={2.5} decimal largura={46}
                    onMudar={(v) => atualizar(it.id, { carga: v })} />
                </View>
                <View style={{ gap: 6 }}>
                  <Text style={s.rotuloPeq}>Descanso entre as séries: <Text style={{ color: cores.texto }}>{txtDescanso(it.descanso)}</Text></Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {DESCANSOS.map((d) => (
                      <Pressable key={d} onPress={() => atualizar(it.id, { descanso: d })} style={[s.desc, it.descanso === d && s.descAtivo]}>
                        <Text style={[s.descTexto, it.descanso === d && { color: cores.textoClaro }]}>{d < 60 ? `${d}s` : d % 60 ? `${Math.floor(d / 60)}m${d % 60}` : `${d / 60} min`}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={s.rotuloPeq}>Observação</Text>
                  <TextInput value={it.observacao ?? ''} onChangeText={(t) => atualizar(it.id, { observacao: t })} style={s.inputObs}
                    placeholder="Ex.: subir para 12 kg quando fizer 12 reps" placeholderTextColor={cores.texto3} multiline maxLength={300} />
                </View>
              </View>
            );
          })}

          <Botao texto="+ Adicionar exercícios" tipo="contorno" onPress={() => setSeletor(true)} />

          <View style={{ gap: 10, marginTop: 8 }}>
            <Botao texto={`Pronto, ir para ${NOMES_DIAS[proximo].toLowerCase()}`} onPress={() => irPara(proximo)} />
            {itens.length > 0 && (
              <Botao texto="Começar este treino agora" tipo="lima" onPress={async () => { await garantirSalvo(); router.push({ pathname: '/treino/executar', params: { dia: String(dia) } }); }} />
            )}
            <Botao texto="Concluir e voltar" tipo="contorno" onPress={async () => { await garantirSalvo(); if (router.canGoBack()) router.back(); else router.replace('/treinos'); }} />
            {(itens.length > 0 || nome) && (
              <Text onPress={() => setLimpar(true)} style={s.limpar}>Deixar {NOMES_DIAS[dia].toLowerCase()} como descanso</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SeletorExercicios visivel={seletor} gruposDoDia={grupos} jaNoDia={jaNoDia} onFechar={() => setSeletor(false)} onAdicionar={adicionar} />
      <Confirmar visivel={limpar} titulo={`Deixar ${NOMES_DIAS[dia].toLowerCase()} como descanso?`}
        texto="Os exercícios deste dia serão removidos. O histórico de treinos feitos continua guardado." confirmar="Sim, limpar o dia" perigo
        onCancelar={() => setLimpar(false)}
        onConfirmar={() => { setItens([]); setNome(''); setGrupos([]); mudou(); setLimpar(false); }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  salvo: { width: 70, textAlign: 'right', fontFamily: fontes.semi, fontSize: 12, color: '#2E9E4F' },
  dias: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingBottom: 6 },
  diaChip: { flex: 1, height: 52, borderRadius: 14, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, alignItems: 'center', justifyContent: 'center', gap: 4 },
  diaChipAtivo: { backgroundColor: cores.escuro, borderColor: cores.escuro },
  diaChipTexto: { fontFamily: fontes.semi, fontSize: 13, color: cores.texto },
  pontinho: { width: 6, height: 6, borderRadius: 3 },
  conteudo: { padding: 20, gap: 16, paddingBottom: 48 },
  rotulo: { fontFamily: fontes.negrito, fontSize: 13, color: cores.texto },
  rotuloPeq: { fontFamily: fontes.media, fontSize: 11, color: cores.texto2 },
  cinza: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2 },
  input: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.cartao, paddingHorizontal: 12, fontFamily: fontes.media, fontSize: 16, color: cores.texto },
  inputObs: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.fundo, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fontes.media, fontSize: 16, color: cores.texto, textAlignVertical: 'top' },
  inputPeq: { height: 42, borderRadius: 12, borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.fundo, paddingHorizontal: 10, fontFamily: fontes.negrito, fontSize: 16, color: cores.texto, textAlign: 'center' },
  grupos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linhaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  secao: { fontFamily: fontes.titulo, fontSize: 17, color: cores.texto },
  vazio: { alignItems: 'center', gap: 8, padding: 20, borderRadius: raio.g, borderWidth: 1, borderStyle: 'dashed', borderColor: cores.borda },
  vazioTexto: { textAlign: 'center', fontFamily: fontes.regular, fontSize: 13, color: cores.texto2, lineHeight: 19 },
  item: { backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.g, padding: 12, gap: 12 },
  itemTopo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemNome: { fontFamily: fontes.semi, fontSize: 14, color: cores.texto, lineHeight: 18 },
  itemInfo: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2, marginTop: 2 },
  acoesSetas: { gap: 4 },
  acao: { width: 30, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo },
  acaoTexto: { fontFamily: fontes.negrito, fontSize: 15, color: cores.texto },
  controles: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' },
  desc: { height: 32, paddingHorizontal: 12, borderRadius: raio.pill, backgroundColor: cores.fundo, borderWidth: 1, borderColor: cores.borda, justifyContent: 'center' },
  descAtivo: { backgroundColor: cores.roxo, borderColor: cores.roxo },
  descTexto: { fontFamily: fontes.semi, fontSize: 12, color: cores.texto },
  limpar: { textAlign: 'center', fontFamily: fontes.semi, fontSize: 13, color: '#C2410C', padding: 8 },
});
