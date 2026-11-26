import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { Icone } from '@/components/Icone';
import { BarraProgresso, Confirmar, Contador } from '@/components/pecas';
import { Botao, Miniatura } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { porId } from '@/data';
import { VideoDoExercicio } from '@/components/Midia';
import { repsAlvo, segundosAlvo } from '@/data/planos';
import { NOMES_DIAS, gravarMeta, lerMeta, useDados, type ItemPlano, type SerieFeita } from '@/db/banco';
import { maioresCargas, ultimaCarga, ultimaNota } from '@/db/historico';
import { useSQLiteContext } from '@/db/sqlite';
import { chaveDia, dataCurta, descanso as txtDescanso, duracao, kg, relogio } from '@/lib/datas';
import { prepararSons, tocar, vibrar } from '@/lib/som';

/*
 * Modo treino.
 * - Sem contagem obrigatória: a pessoa toca em "Começar" em cada exercício e o relógio só registra o tempo.
 * - "Próxima série" a cada série; na última, "Concluir exercício" e o próximo exercício do dia aparece.
 * - Timer de descanso é opcional (chave liga/desliga). Ligado: faixa pequena com a contagem;
 *   ao acabar toca o alarme e avisa "volta em 10 segundos".
 */

const AVISO_S = 10;

export default function Executar() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { dia: param } = useLocalSearchParams<{ dia: string }>();
  const dia = Math.min(7, Math.max(1, Number(param) || 1));
  const { semana, registrarSessao, salvarObservacao } = useDados();

  // O treino do dia fica "congelado" ao abrir a tela
  const [itens] = useState<ItemPlano[]>(() => semana[dia - 1]?.itens ?? []);
  const [nomeTreino] = useState(() => semana[dia - 1]?.nome || `Treino de ${NOMES_DIAS[dia].toLowerCase()}`);

  const [fase, setFase] = useState<'inicio' | 'treino' | 'fim'>('inicio');
  const [ex, setEx] = useState(0);
  const [serie, setSerie] = useState(1);
  const [comecou, setComecou] = useState(false);
  const [inicioEx, setInicioEx] = useState(0);
  const [tempos, setTempos] = useState<Record<number, number>>({}); // segundos gastos em cada exercício
  const [reps, setReps] = useState<(number | null)[]>(() => itens.map((i) => repsAlvo(i.repeticoes)));
  const [cargas, setCargas] = useState<(number | null)[]>(() => itens.map((i) => i.carga));
  const [feitas, setFeitas] = useState<SerieFeita[]>([]);
  // Observação de cada exercício (começa com a que está no plano)
  const [notasIniciais] = useState<string[]>(() => itens.map((i) => i.observacao ?? ''));
  const [notas, setNotas] = useState<string[]>(() => itens.map((i) => i.observacao ?? ''));
  const [notasAnteriores, setNotasAnteriores] = useState<({ texto: string; data: string } | null)[]>([]);
  const [usarDescanso, setUsarDescanso] = useState(false);
  const [descanso, setDescanso] = useState<{ ate: number; total: number } | null>(null);
  const [aviso, setAviso] = useState<number>(0); // fim do "volta em 10 s"
  const [cronometro, setCronometro] = useState(0); // fim de uma série com tempo (opcional)
  const [agora, setAgora] = useState(Date.now());
  const [inicio, setInicio] = useState(0);
  const [encerrar, setEncerrar] = useState(false);
  const [lista, setLista] = useState(false);
  const [recordesAntes, setRecordesAntes] = useState<Map<string, number>>(new Map());
  const [salvo, setSalvo] = useState<{ duracao: number } | null>(null);
  const ultimoBip = useRef(-1);
  const rolagem = useRef<ScrollViewInstance>(null);
  // Vídeo se ajusta à altura do celular: depois de "Começar", diminui para os controles caberem na tela
  const tela = useWindowDimensions();

  // Carga sugerida (a do plano ou a última usada) e preferência do timer de descanso
  useEffect(() => {
    (async () => {
      setUsarDescanso((await lerMeta(db, 'usar_descanso')) === '1');
      setCargas(await Promise.all(itens.map(async (i) => i.carga ?? (await ultimaCarga(db, i.exercicio_id))?.carga ?? null)));
      setRecordesAntes(await maioresCargas(db, [...new Set(itens.map((i) => i.exercicio_id))]));
      setNotasAnteriores(await Promise.all(itens.map((i) => ultimaNota(db, i.exercicio_id))));
    })();
  }, [db, itens]);

  const mudarDescanso = (v: boolean) => {
    setUsarDescanso(v);
    if (!v) { setDescanso(null); setAviso(0); }
    gravarMeta(db, 'usar_descanso', v ? '1' : '0').catch(() => {});
  };

  // Relógio (só atualiza a tela; não limita nada)
  useEffect(() => {
    if (fase !== 'treino') return;
    const t = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(t);
  }, [fase]);

  // Tela acesa durante o treino
  useEffect(() => {
    activateKeepAwakeAsync('treino').catch(() => {});
    return () => { Promise.resolve(deactivateKeepAwake('treino')).catch(() => {}); };
  }, []);

  // Botão voltar do Android: pergunta antes de sair
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (fase !== 'treino') return false;
      setEncerrar(true);
      return true;
    });
    return () => sub.remove();
  }, [fase]);

  // Descanso → alarme → "volta em 10 s"
  useEffect(() => {
    if (descanso && agora >= descanso.ate) {
      setDescanso(null);
      tocar('alarme');
      vibrar(true);
      ultimoBip.current = -1;
      setAviso(Date.now() + AVISO_S * 1000);
    } else if (aviso) {
      const seg = Math.ceil((aviso - agora) / 1000);
      if (seg <= 0) { setAviso(0); tocar('valendo'); vibrar(); }
      else if (seg <= 3 && seg !== ultimoBip.current) { ultimoBip.current = seg; tocar('bip'); }
    }
    if (cronometro && agora >= cronometro) { setCronometro(0); tocar('bip'); vibrar(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agora]);

  const item = itens[ex];
  const exercicio = item ? porId(item.exercicio_id) : undefined;
  const totalSeries = useMemo(() => itens.reduce((n, i) => n + i.series, 0), [itens]);
  const tempoSerie = item ? segundosAlvo(item.repeticoes) : null;
  const ultimaSerie = item ? serie >= item.series : false;
  const larguraVideo = Math.min(tela.width, 560) - 32;
  const alturaVideo = Math.round(Math.max(130, Math.min(larguraVideo * 0.75, tela.height * (comecou ? 0.26 : 0.36))));

  const iniciarTreino = () => {
    prepararSons();
    const t = Date.now();
    setInicio(t);
    setAgora(t);
    setFase('treino');
  };

  const comecarExercicio = () => {
    prepararSons();
    setComecou(true);
    setInicioEx(Date.now());
    setAgora(Date.now());
  };

  const guardarTempoExercicio = () => {
    if (comecou && inicioEx) setTempos((t) => ({ ...t, [ex]: (t[ex] ?? 0) + Math.round((Date.now() - inicioEx) / 1000) }));
  };

  const guardarNota = (i: number) => {
    const it = itens[i];
    if (it && (notas[i] ?? '').trim() !== (it.observacao ?? '').trim()) salvarObservacao(it.id, notas[i] ?? '').catch(() => {});
  };
  // Observações que mudaram neste treino (vão para o histórico do dia)
  const notasDoTreino = () => itens
    .map((it, i) => ({ exercicio_id: it.exercicio_id, ordem: i, texto: (notas[i] ?? '').trim(), mudou: (notas[i] ?? '').trim() !== (notasIniciais[i] ?? '').trim() }))
    .filter((n) => n.mudou && n.texto)
    .map(({ exercicio_id, ordem, texto }) => ({ exercicio_id, ordem, texto }));

  const terminar = async (todas: SerieFeita[]) => {
    guardarTempoExercicio();
    guardarNota(ex);
    setFase('fim');
    setDescanso(null); setAviso(0); setCronometro(0);
    if (!todas.length) { setSalvo({ duracao: 0 }); return; }
    const fim = Date.now();
    const dur = Math.round((fim - (inicio || fim)) / 1000);
    await registrarSessao({
      data: chaveDia(new Date(inicio || fim)), dia_semana: dia, nome: nomeTreino,
      iniciado_em: new Date(inicio || fim).toISOString(), concluido_em: new Date(fim).toISOString(), duracao_s: dur, series: todas,
      notas: notasDoTreino(),
    });
    tocar('fim');
    setSalvo({ duracao: dur });
  };

  const irParaExercicio = (i: number, todas: SerieFeita[]) => {
    guardarTempoExercicio();
    guardarNota(ex);
    setDescanso(null); setAviso(0); setCronometro(0);
    setEx(i);
    setSerie(Math.min(itens[i].series, todas.filter((f) => f.ordem === i).length + 1));
    setComecou(false);
    setInicioEx(0);
    rolagem.current?.scrollTo({ y: 0, animated: false }); // novo exercício começa do topo (vídeo)
  };

  const proximaSerie = () => {
    if (!item) return;
    const nova: SerieFeita = {
      exercicio_id: item.exercicio_id, ordem: ex, serie,
      repeticoes: tempoSerie != null ? tempoSerie : reps[ex], carga: cargas[ex], feito_em: new Date().toISOString(),
    };
    const todas = [...feitas, nova];
    setFeitas(todas);
    setCronometro(0);
    setAviso(0);
    if (!ultimaSerie) {
      setSerie(serie + 1);
      if (usarDescanso && item.descanso > 0) {
        setDescanso({ ate: Date.now() + item.descanso * 1000, total: item.descanso });
        setAgora(Date.now());
      }
      vibrar();
      return;
    }
    // Acabou o exercício: vai para o próximo (ou termina o treino)
    if (ex + 1 < itens.length) { irParaExercicio(ex + 1, todas); vibrar(); }
    else terminar(todas);
  };

  const pularExercicio = () => {
    setLista(false);
    if (ex + 1 < itens.length) irParaExercicio(ex + 1, feitas);
    else terminar(feitas);
  };

  const sair = () => (router.canGoBack() ? router.back() : router.replace('/treinos'));

  /* ---------------- telas ---------------- */

  if (!itens.length) {
    return (
      <SafeAreaView style={[s.tela, s.centro]}>
        <Text style={s.grande}>Sem exercícios em {NOMES_DIAS[dia].toLowerCase()}</Text>
        <Text style={s.claro}>Monte o treino deste dia primeiro.</Text>
        <Botao texto="Montar o treino" tipo="lima" style={{ alignSelf: 'stretch' }} onPress={() => router.replace({ pathname: '/treino/dia/[dia]', params: { dia: String(dia) } })} />
        <Botao texto="Voltar" tipo="contorno" corTexto={cores.textoClaro} style={{ borderColor: cores.escuro3, alignSelf: 'stretch' }} onPress={sair} />
      </SafeAreaView>
    );
  }

  const chaveDescanso = (
    <View style={s.chave}>
      <View style={{ flex: 1 }}>
        <Text style={s.chaveTitulo}>Timer de descanso</Text>
        <Text style={s.chaveTexto}>Conta o descanso entre as séries e toca um alarme no fim (volta em 10 s).</Text>
      </View>
      <Switch value={usarDescanso} onValueChange={mudarDescanso} trackColor={{ true: cores.roxo, false: cores.escuro3 }}
        thumbColor={usarDescanso ? cores.lima : '#FFFFFF'} accessibilityLabel="Timer de descanso" />
    </View>
  );

  return (
    <SafeAreaView style={s.tela}>
      {fase === 'inicio' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.inicio}>
          <Pressable onPress={sair} style={s.botaoRedondo} accessibilityLabel="Voltar">
            <Icone nome="voltar" tamanho={22} cor={cores.textoClaro} />
          </Pressable>
          <Text style={s.selo}>{NOMES_DIAS[dia].toUpperCase()}</Text>
          <Text style={s.grande}>{nomeTreino}</Text>
          <Text style={s.claro}>{itens.length} exercícios · {totalSeries} séries</Text>
          <View style={s.cartaoLista}>
            {itens.map((it, i) => (
              <View key={it.id} style={s.linhaLista}>
                <Miniatura id={it.exercicio_id} tamanho={44} />
                <View style={{ flex: 1 }}>
                  <Text style={s.linhaNome} numberOfLines={1}>{i + 1}. {porId(it.exercicio_id)?.nome}</Text>
                  <Text style={s.linhaInfo}>{it.series} × {it.repeticoes}{cargas[i] != null ? ` · ${kg(cargas[i])}` : ''} · descanso {txtDescanso(it.descanso)}</Text>
                  {it.observacao ? <Text style={s.linhaNota} numberOfLines={2}>📝 {it.observacao}</Text> : null}
                </View>
              </View>
            ))}
          </View>
          {chaveDescanso}
        </ScrollView>
      )}
      {fase === 'inicio' && (
        <View style={s.rodape}>
          <Botao texto="▶  Iniciar treino" tipo="lima" onPress={iniciarTreino} />
        </View>
      )}

      {fase === 'treino' && item && (
        <>
          <View style={s.topo}>
            <Pressable onPress={() => setEncerrar(true)} style={s.botaoRedondo} accessibilityLabel="Encerrar treino" hitSlop={6}>
              <Icone nome="fechar" tamanho={20} cor={cores.textoClaro} />
            </Pressable>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={s.topoLinha}>
                <Text style={s.topoTexto} numberOfLines={1}>{nomeTreino}</Text>
                <Text style={s.relogioTotal}>⏱ {relogio((agora - inicio) / 1000)}</Text>
              </View>
              <BarraProgresso valor={feitas.length / Math.max(1, totalSeries)} cor={cores.lima} fundo={cores.escuro3} />
            </View>
            <Pressable onPress={() => setLista(true)} style={s.botaoRedondo} accessibilityLabel="Ver lista de exercícios" hitSlop={6}>
              <Text style={s.topoLista}>☰</Text>
            </Pressable>
          </View>

          <ScrollView ref={rolagem} style={{ flex: 1 }} contentContainerStyle={s.serie}>
            <View style={[s.videoCaixa, { height: alturaVideo }]}>
              <VideoDoExercicio key={item.exercicio_id} id={item.exercicio_id} />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={s.contagem}>EXERCÍCIO {ex + 1} DE {itens.length}</Text>
              <Text style={s.medio}>{exercicio?.nome}</Text>
              <Text style={s.claro}>{item.series} × {item.repeticoes}{exercicio ? ` · ${exercicio.equipamento} · ${exercicio.grupo}` : ''}</Text>
            </View>

            {/* Bolinhas das séries */}
            <View style={s.bolinhas}>
              {Array.from({ length: item.series }, (_, i) => {
                const feita = feitas.some((f) => f.ordem === ex && f.serie === i + 1);
                const atual = comecou && i + 1 === serie && !feita;
                return (
                  <View key={i} style={[s.bolinha, feita && s.bolinhaFeita, atual && s.bolinhaAtual]}>
                    {feita ? <Icone nome="check" tamanho={14} cor={cores.texto} espessura={3} /> : <Text style={[s.bolinhaTexto, atual && { color: cores.textoClaro }]}>{i + 1}</Text>}
                  </View>
                );
              })}
            </View>

            {!comecou ? (
              <>
                <View style={s.linhaAcoes}>
                  <Text onPress={pularExercicio} style={s.acaoTexto}>Pular exercício</Text>
                  <Text onPress={() => router.push({ pathname: '/exercicio/[id]', params: { id: item.exercicio_id } })} style={s.acaoTexto}>Como fazer</Text>
                </View>
              </>
            ) : (
              <>
                <View style={s.linhaSerie}>
                  <Text style={s.serieTitulo}>Série {serie} de {item.series}</Text>
                  <Text style={s.relogioEx}>⏱ {relogio((agora - inicioEx) / 1000)}</Text>
                </View>

                {descanso && (
                  <View style={s.faixaDescanso}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={s.faixaTexto}>Descanso · {relogio((descanso.ate - agora) / 1000)}</Text>
                      <BarraProgresso valor={(descanso.ate - agora) / 1000 / descanso.total} cor={cores.lima} fundo={cores.escuro3} altura={4} />
                    </View>
                    <Pressable onPress={() => setDescanso((d) => (d ? { ...d, ate: d.ate + 15000, total: d.total + 15 } : d))} style={s.faixaBotao}>
                      <Text style={s.faixaBotaoTexto}>+15 s</Text>
                    </Pressable>
                    <Pressable onPress={() => setDescanso(null)} style={s.faixaBotao}>
                      <Text style={s.faixaBotaoTexto}>Pular</Text>
                    </Pressable>
                  </View>
                )}
                {aviso > 0 && (
                  <Pressable onPress={() => setAviso(0)} style={[s.faixaDescanso, { backgroundColor: cores.roxo }]}>
                    <Text style={[s.faixaTexto, { flex: 1 }]}>⏰ Descanso acabou · volta em {Math.max(0, Math.ceil((aviso - agora) / 1000))} s</Text>
                    <Text style={s.faixaBotaoTexto}>OK</Text>
                  </Pressable>
                )}

                <View style={s.ajustes}>
                  {tempoSerie == null && (
                    <Contador rotulo="Repetições" valor={reps[ex]} min={0} max={100} largura={44}
                      onMudar={(v) => setReps((l) => l.map((x, i) => (i === ex ? v : x)))} />
                  )}
                  <Contador rotulo="Carga (kg)" valor={cargas[ex]} min={0} max={500} passo={2.5} decimal largura={50}
                    onMudar={(v) => setCargas((l) => l.map((x, i) => (i === ex ? v : x)))} />
                  {tempoSerie != null && (
                    <Pressable onPress={() => { setCronometro(cronometro ? 0 : Date.now() + tempoSerie * 1000); setAgora(Date.now()); }} style={s.cronoBotao}>
                      <Text style={s.cronoTexto}>
                        {cronometro ? `⏱ ${relogio((cronometro - agora) / 1000)} · parar` : `⏱ Cronômetro ${tempoSerie >= 60 ? `${Math.round(tempoSerie / 60)} min` : `${tempoSerie} s`} (opcional)`}
                      </Text>
                    </Pressable>
                  )}
                </View>

                <View style={s.linhaAcoes}>
                  <Text onPress={pularExercicio} style={s.acaoTexto}>Pular exercício</Text>
                  <Text onPress={() => router.push({ pathname: '/exercicio/[id]', params: { id: item.exercicio_id } })} style={s.acaoTexto}>Como fazer</Text>
                </View>
              </>
            )}

            {/* Observação: para anotar a progressão de carga (fica salva no exercício e no histórico) */}
            <View style={s.notaCaixa}>
              <Text style={s.notaRotulo}>📝 Observação</Text>
              <TextInput value={notas[ex] ?? ''} onChangeText={(t) => setNotas((l) => l.map((x, i) => (i === ex ? t : x)))}
                onBlur={() => guardarNota(ex)} multiline maxLength={300} style={s.notaInput}
                placeholder="Ex.: 10 kg fácil, subir para 12 kg na próxima" placeholderTextColor={cores.textoClaro2}
                accessibilityLabel="Observação do exercício" />
              {notasAnteriores[ex] && notasAnteriores[ex]!.texto.trim() !== (notas[ex] ?? '').trim() ? (
                <Text style={s.notaAntes}>Na última vez ({dataCurta(notasAnteriores[ex]!.data)}): {notasAnteriores[ex]!.texto}</Text>
              ) : null}
            </View>

            {ex + 1 < itens.length && <Text style={s.aSeguir}>A seguir: {porId(itens[ex + 1].exercicio_id)?.nome}</Text>}
            {chaveDescanso}
          </ScrollView>

          {/* Botão principal sempre visível embaixo (fácil de alcançar com o polegar) */}
          <View style={s.rodape}>
            {!comecou ? (
              <Botao texto="▶  Começar exercício" tipo="lima" onPress={comecarExercicio} />
            ) : (
              <Botao texto={ultimaSerie ? (ex + 1 < itens.length ? '✓  Concluir exercício' : '✓  Concluir último exercício') : '✓  Próxima série'}
                tipo="lima" onPress={proximaSerie} />
            )}
          </View>
        </>
      )}

      {fase === 'fim' && (
        <Resumo feitas={feitas} itens={itens} tempos={tempos} duracaoS={salvo?.duracao ?? null} recordesAntes={recordesAntes} nome={nomeTreino}
          onHistorico={() => router.replace('/historico')} onInicio={() => router.replace('/')} />
      )}

      <Modal visible={lista} transparent animationType="slide" onRequestClose={() => setLista(false)}>
        <Pressable style={s.modalFundo} onPress={() => setLista(false)}>
          <Pressable style={s.modalPainel} onPress={() => {}}>
            <Text style={s.modalTitulo}>Exercícios de hoje</Text>
            <ScrollView>
              {itens.map((it, i) => {
                const feitasEx = feitas.filter((f) => f.ordem === i).length;
                const atual = i === ex;
                return (
                  <Pressable key={it.id} onPress={() => { setLista(false); irParaExercicio(i, feitas); }} style={[s.modalLinha, atual && { backgroundColor: cores.lilas }]}>
                    <Miniatura id={it.exercicio_id} tamanho={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.modalNome} numberOfLines={1}>{i + 1}. {porId(it.exercicio_id)?.nome}</Text>
                      <Text style={s.modalInfo}>{feitasEx}/{it.series} séries{atual ? ' · agora' : ''}</Text>
                    </View>
                    {feitasEx >= it.series && <Icone nome="check" tamanho={18} cor="#2E9E4F" espessura={3} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Botao texto="Fechar" tipo="contorno" onPress={() => setLista(false)} />
          </Pressable>
        </Pressable>
      </Modal>

      <Confirmar visivel={encerrar} titulo="Encerrar o treino?"
        texto={feitas.length ? `As ${feitas.length} séries feitas serão salvas no histórico.` : 'Nenhuma série foi feita ainda, então nada será salvo.'}
        confirmar={feitas.length ? 'Encerrar e salvar' : 'Sair do treino'} cancelar="Continuar treinando"
        onCancelar={() => setEncerrar(false)}
        onConfirmar={() => { setEncerrar(false); if (feitas.length) terminar(feitas); else { guardarNota(ex); sair(); } }} />
    </SafeAreaView>
  );
}

function Resumo({
  feitas, itens, tempos, duracaoS, recordesAntes, nome, onHistorico, onInicio,
}: {
  feitas: SerieFeita[]; itens: ItemPlano[]; tempos: Record<number, number>; duracaoS: number | null; recordesAntes: Map<string, number>; nome: string;
  onHistorico: () => void; onInicio: () => void;
}) {
  const volume = feitas.reduce((n, f) => n + (f.carga ?? 0) * (f.repeticoes ?? 0), 0);
  const exercicios = new Set(feitas.map((f) => f.exercicio_id));
  const recordes: { id: string; nova: number; antes: number }[] = [];
  for (const id of exercicios) {
    const max = Math.max(...feitas.filter((f) => f.exercicio_id === id && f.carga != null).map((f) => f.carga as number), 0);
    const antes = recordesAntes.get(id);
    if (antes != null && max > antes) recordes.push({ id, nova: max, antes });
  }
  return (
    <ScrollView contentContainerStyle={s.inicio}>
      <View style={s.trofeu}><Icone nome="check" tamanho={40} cor={cores.texto} espessura={3} /></View>
      <Text style={[s.grande, { textAlign: 'center' }]}>{feitas.length ? 'Treino concluído!' : 'Treino encerrado'}</Text>
      <Text style={[s.claro, { textAlign: 'center' }]}>
        {feitas.length ? (duracaoS == null ? 'Salvando no histórico…' : `${nome} · salvo no histórico ✓`) : 'Nenhuma série feita, nada foi salvo.'}
      </Text>
      {feitas.length > 0 && (
        <View style={s.numeros}>
          <Num valor={duracao(duracaoS)} rotulo="tempo total" />
          <Num valor={`${exercicios.size}/${itens.length}`} rotulo="exercícios" />
          <Num valor={String(feitas.length)} rotulo="séries" />
          <Num valor={volume ? kg(volume) : '—'} rotulo="volume" />
        </View>
      )}
      {recordes.length > 0 && (
        <View style={s.recordes}>
          <Text style={s.recordeTitulo}>🏆 Recorde pessoal de carga!</Text>
          {recordes.map((r) => <Text key={r.id} style={s.recordeLinha}>{porId(r.id)?.nome}: {kg(r.nova)} (antes {kg(r.antes)})</Text>)}
        </View>
      )}
      {Object.keys(tempos).length > 0 && (
        <View style={s.cartaoLista}>
          <Text style={[s.linhaNome, { padding: 6 }]}>Tempo por exercício</Text>
          {itens.map((it, i) => (tempos[i] ? (
            <View key={it.id} style={s.tempoLinha}>
              <Text style={s.linhaInfo} numberOfLines={1}>{i + 1}. {porId(it.exercicio_id)?.nome}</Text>
              <Text style={s.tempoValor}>{duracao(tempos[i])}</Text>
            </View>
          ) : null))}
        </View>
      )}
      <Botao texto="Ver no histórico" tipo="lima" onPress={onHistorico} />
      <Botao texto="Voltar ao início" tipo="contorno" corTexto={cores.textoClaro} style={{ borderColor: cores.escuro3 }} onPress={onInicio} />
    </ScrollView>
  );
}

function Num({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={s.num}>
      <Text style={s.numValor} numberOfLines={1}>{valor}</Text>
      <Text style={s.numRotulo}>{rotulo}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.escuro },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  inicio: { padding: 20, gap: 14, paddingBottom: 40 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  topoLinha: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  botaoRedondo: { width: 40, height: 40, borderRadius: 20, backgroundColor: cores.escuro2, alignItems: 'center', justifyContent: 'center' },
  topoTexto: { flex: 1, fontFamily: fontes.semi, fontSize: 12, color: cores.textoClaro2 },
  relogioTotal: { fontFamily: fontes.semi, fontSize: 12, color: cores.textoClaro2 },
  topoLista: { color: cores.textoClaro, fontSize: 18 },
  selo: { alignSelf: 'flex-start', backgroundColor: cores.escuro3, color: cores.lima, fontFamily: fontes.negrito, fontSize: 11, letterSpacing: 1, paddingHorizontal: 12, paddingVertical: 5, borderRadius: raio.pill, overflow: 'hidden' },
  grande: { fontFamily: fontes.titulo, fontSize: 28, color: cores.textoClaro, letterSpacing: -0.4 },
  medio: { fontFamily: fontes.titulo, fontSize: 21, color: cores.textoClaro, letterSpacing: -0.2 },
  claro: { fontFamily: fontes.regular, fontSize: 13, color: cores.textoClaro2, lineHeight: 19 },
  cartaoLista: { backgroundColor: cores.escuro2, borderRadius: raio.g, padding: 8 },
  linhaLista: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6 },
  linhaNome: { fontFamily: fontes.semi, fontSize: 14, color: cores.textoClaro },
  linhaInfo: { flex: 1, fontFamily: fontes.regular, fontSize: 12, color: cores.textoClaro2, marginTop: 2 },
  notaCaixa: { backgroundColor: cores.escuro2, borderRadius: raio.m, padding: 12, gap: 6 },
  notaRotulo: { fontFamily: fontes.semi, fontSize: 13, color: cores.lima },
  notaInput: { minHeight: 44, borderRadius: 10, backgroundColor: cores.escuro, borderWidth: 1, borderColor: cores.escuro3, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fontes.media, fontSize: 16, color: cores.textoClaro, textAlignVertical: 'top' },
  notaAntes: { fontFamily: fontes.regular, fontSize: 12, color: cores.textoClaro2, lineHeight: 17 },
  linhaNota: { fontFamily: fontes.media, fontSize: 12, color: cores.lima, marginTop: 3, lineHeight: 16 },
  chave: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: cores.escuro2, borderRadius: raio.m, padding: 14 },
  chaveTitulo: { fontFamily: fontes.semi, fontSize: 14, color: cores.textoClaro },
  chaveTexto: { fontFamily: fontes.regular, fontSize: 12, color: cores.textoClaro2, marginTop: 2, lineHeight: 17 },
  serie: { padding: 16, gap: 12, paddingBottom: 24 },
  videoCaixa: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: raio.g, overflow: 'hidden' },
  rodape: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderColor: cores.escuro2, backgroundColor: cores.escuro },
  contagem: { fontFamily: fontes.negrito, fontSize: 11, color: cores.lima, letterSpacing: 0.6 },
  bolinhas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bolinha: { width: 32, height: 32, borderRadius: 16, backgroundColor: cores.escuro2, alignItems: 'center', justifyContent: 'center' },
  bolinhaFeita: { backgroundColor: cores.lima },
  bolinhaAtual: { backgroundColor: cores.roxo },
  bolinhaTexto: { fontFamily: fontes.semi, fontSize: 13, color: cores.textoClaro2 },
  linhaSerie: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  serieTitulo: { fontFamily: fontes.titulo, fontSize: 18, color: cores.textoClaro },
  relogioEx: { fontFamily: fontes.semi, fontSize: 13, color: cores.textoClaro2 },
  faixaDescanso: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: cores.escuro2, borderRadius: raio.m, paddingVertical: 10, paddingHorizontal: 12 },
  faixaTexto: { fontFamily: fontes.semi, fontSize: 14, color: cores.textoClaro },
  faixaBotao: { paddingHorizontal: 10, height: 32, borderRadius: 8, backgroundColor: cores.escuro3, justifyContent: 'center' },
  faixaBotaoTexto: { fontFamily: fontes.semi, fontSize: 12, color: cores.lima },
  ajustes: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', backgroundColor: cores.cartao, borderRadius: raio.g, padding: 12 },
  cronoBotao: { height: 42, paddingHorizontal: 12, borderRadius: 12, backgroundColor: cores.lilas, justifyContent: 'center' },
  cronoTexto: { fontFamily: fontes.semi, fontSize: 13, color: cores.roxoEscuro },
  linhaAcoes: { flexDirection: 'row', justifyContent: 'space-around' },
  acaoTexto: { fontFamily: fontes.semi, fontSize: 14, color: cores.textoClaro2, padding: 8 },
  aSeguir: { fontFamily: fontes.regular, fontSize: 12, color: cores.textoClaro2, textAlign: 'center' },
  modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalPainel: { width: '100%', maxWidth: 560, maxHeight: '80%', backgroundColor: cores.cartao, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, gap: 10 },
  modalTitulo: { fontFamily: fontes.titulo, fontSize: 18, color: cores.texto },
  modalLinha: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12 },
  modalNome: { fontFamily: fontes.semi, fontSize: 14, color: cores.texto },
  modalInfo: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2 },
  trofeu: { alignSelf: 'center', width: 84, height: 84, borderRadius: 42, backgroundColor: cores.lima, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  numeros: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  num: { flexGrow: 1, flexBasis: '45%', backgroundColor: cores.escuro2, borderRadius: raio.m, padding: 14, gap: 2 },
  numValor: { fontFamily: fontes.titulo, fontSize: 22, color: cores.textoClaro },
  numRotulo: { fontFamily: fontes.regular, fontSize: 12, color: cores.textoClaro2 },
  recordes: { backgroundColor: cores.lima, borderRadius: raio.g, padding: 14, gap: 4 },
  recordeTitulo: { fontFamily: fontes.negrito, fontSize: 15, color: cores.texto },
  recordeLinha: { fontFamily: fontes.media, fontSize: 13, color: cores.texto },
  tempoLinha: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, paddingVertical: 4 },
  tempoValor: { fontFamily: fontes.semi, fontSize: 13, color: cores.lima },
});
