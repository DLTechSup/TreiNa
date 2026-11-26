import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { megas, porcento } from '@/components/CartaoVideos';
import { BarraProgresso, Confirmar } from '@/components/pecas';
import { Botao, TopoVoltar } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { totalBytesVideos } from '@/data';
import { useConta } from '@/db/nuvem';
import { apagarVideos, atualizarVideos, useEstadoVideos, verificarFonte, verificarVideos, type Fonte } from '@/lib/midiaPrivada';

/** Tela da atualização: baixa uma vez da nuvem privada e guarda no celular (os vídeos dos exercícios). */
export default function Atualizacao() {
  const { total, guardados, atualizando, erro } = useEstadoVideos();
  const { usuario, entrar, entrando } = useConta();
  const [fonte, setFonte] = useState<Fonte | null>(null);
  const [apagar, setApagar] = useState(false);
  const completo = guardados >= total;

  useEffect(() => {
    verificarVideos();
    verificarFonte().then(setFonte).catch(() => setFonte('indisponivel'));
  }, [usuario?.id]);

  // Tela acesa enquanto atualiza
  useEffect(() => {
    if (!atualizando) return;
    activateKeepAwakeAsync('atualizacao').catch(() => {});
    return () => { Promise.resolve(deactivateKeepAwake('atualizacao')).catch(() => {}); };
  }, [atualizando]);

  const pode = fonte === 'local' || fonte === 'nuvem';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
      <TopoVoltar titulo="Atualização" />
      <ScrollView contentContainerStyle={s.conteudo}>
        <View style={s.cartao}>
          <Text style={s.selo}>{completo ? 'TUDO PRONTO' : atualizando ? 'ATUALIZANDO' : 'ATUALIZAÇÃO DISPONÍVEL'}</Text>
          <Text style={s.grande}>{porcento(guardados, total)}</Text>
          <Text style={s.claro}>{completo ? 'TreiNa atualizado' : `Atualização do TreiNa · ${megas(totalBytesVideos)}`}</Text>
          <BarraProgresso valor={total ? guardados / total : 0} cor={cores.lima} fundo={cores.escuro3} altura={8} />
          {atualizando && <Text style={s.claro}>Atualizando… deixe esta tela aberta até terminar.</Text>}
          {completo && <Text style={s.claro}>Tudo pronto. Não precisa fazer de novo.</Text>}
        </View>

        {erro ? <Text style={s.erro}>{erro}</Text> : null}

        {!completo && (
          <View style={{ gap: 10 }}>
            {fonte === null && <ActivityIndicator color={cores.roxo} />}
            {fonte === 'local' && <Text style={s.nota}>Prévia no computador: a atualização vem da pasta do seu PC.</Text>}
            {fonte === 'nuvem' && <Text style={s.nota}>Conta {usuario?.email ?? ''} ✓</Text>}
            {fonte === 'sem-login' && (
              <>
                <Text style={s.nota}>Para atualizar, entre com a sua conta Google.</Text>
                <Botao texto={entrando ? 'Abrindo o Google…' : 'Entrar com Google'} onPress={entrar} desativado={entrando} />
              </>
            )}
            {fonte === 'sem-acesso' && (
              <Text style={s.nota}>A conta {usuario?.email ?? ''} não tem acesso a esta atualização.</Text>
            )}
            {fonte === 'indisponivel' && <Text style={s.nota}>A atualização não está disponível neste aparelho.</Text>}
            {pode && (
              <Botao
                texto={atualizando ? `Atualizando… ${porcento(guardados, total)}` : guardados ? `Continuar atualização (${porcento(guardados, total)})` : 'Atualizar agora'}
                tipo="lima" desativado={atualizando} onPress={atualizarVideos} />
            )}
            <Text style={s.dica}>
              Dica: use o Wi-Fi. Se parar no meio (internet caiu, fechou o app), é só tocar de novo: continua de onde parou.
              No iPhone, use o app pelo ícone da Tela de Início.
            </Text>
          </View>
        )}

        {completo && (
          <Botao texto={`Liberar espaço (${megas(totalBytesVideos)})`} tipo="contorno" onPress={() => setApagar(true)} />
        )}
      </ScrollView>

      <Confirmar visivel={apagar} titulo="Liberar espaço?"
        texto="Remove do celular o que a atualização baixou. Depois será preciso atualizar de novo."
        confirmar="Liberar espaço" perigo onCancelar={() => setApagar(false)}
        onConfirmar={() => { setApagar(false); apagarVideos(); }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  conteudo: { padding: 20, gap: 16, paddingBottom: 40 },
  cartao: { backgroundColor: cores.escuro, borderRadius: raio.g, padding: 20, gap: 10 },
  selo: { alignSelf: 'flex-start', backgroundColor: cores.escuro3, color: cores.lima, fontFamily: fontes.negrito, fontSize: 11, letterSpacing: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: raio.pill, overflow: 'hidden' },
  grande: { fontFamily: fontes.titulo, fontSize: 40, color: cores.textoClaro },
  de: { fontFamily: fontes.titulo, fontSize: 22, color: cores.textoClaro2 },
  claro: { fontFamily: fontes.regular, fontSize: 13, color: cores.textoClaro2, lineHeight: 19 },
  erro: { fontFamily: fontes.media, fontSize: 14, color: '#C2410C', backgroundColor: '#FFF1E8', borderRadius: raio.m, padding: 12, lineHeight: 20 },
  nota: { fontFamily: fontes.media, fontSize: 14, color: cores.texto, lineHeight: 20 },
  dica: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2, lineHeight: 18 },
});
