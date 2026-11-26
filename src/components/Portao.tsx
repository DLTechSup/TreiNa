import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Icone } from '@/components/Icone';
import { MarcaTreiNa } from '@/components/pecas';
import { cores, fontes, raio } from '@/constants/tema';
import { useConta } from '@/db/nuvem';
import { ehComputadorLocal, useAcesso, type Acesso } from '@/lib/acesso';

const PONTOS = [
  'Exercícios de academia com vídeo e dica de execução',
  'Monte o treino da semana: dia, músculo, séries, carga e descanso',
  'Timer de descanso com alarme e "volta em 10 segundos"',
  'Histórico, sequência de dias e evolução de carga',
];

function LogoGoogle() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

/** Só mostra o app para quem entrou com uma conta Google liberada. Os outros veem só a tela de entrada. */
function dentroDeOutroSite() {
  try {
    return typeof window !== 'undefined' && window.top !== window.self;
  } catch {
    return true;
  }
}

export function Portao({ children }: { children: ReactNode }) {
  const { estado, tentarDeNovo, entrarNaPrevia } = useAcesso();
  // Proteção contra "clickjacking": se alguém colocar o TreiNa dentro de outro site, ele não aparece
  const [emMoldura] = useState(dentroDeOutroSite);
  useEffect(() => {
    if (!emMoldura) return;
    try {
      if (window.top) window.top.location.href = window.location.href;
    } catch {
      /* o outro site bloqueou: o TreiNa simplesmente não aparece */
    }
  }, [emMoldura]);
  if (emMoldura) return null;
  if (estado === 'liberado' || estado === 'previa') return <>{children}</>;
  if (estado === 'carregando' || estado === 'conferindo') {
    return (
      <View style={[s.tela, { alignItems: 'center', justifyContent: 'center', gap: 14 }]}>
        <MarcaTreiNa tamanho={64} />
        <ActivityIndicator color={cores.lima} />
      </View>
    );
  }
  return <TelaEntrada estado={estado} tentarDeNovo={tentarDeNovo} entrarNaPrevia={entrarNaPrevia} />;
}

/** Erro que o Google/Supabase devolve no endereço (ex.: conta não cadastrada). */
function erroNoEndereco() {
  const loc = globalThis.location;
  if (!loc) return null;
  const params = new URLSearchParams(`${loc.search.slice(1)}&${loc.hash.slice(1)}`);
  return params.get('error_description') || params.get('error');
}

function TelaEntrada({ estado, tentarDeNovo, entrarNaPrevia }: { estado: Acesso; tentarDeNovo: () => void; entrarNaPrevia: () => void }) {
  const conta = useConta();
  const [erroLogin] = useState(erroNoEndereco);
  const [previaDisponivel, setPreviaDisponivel] = useState(false);

  useEffect(() => {
    // limpa o erro do endereço para não aparecer de novo ao recarregar
    if (erroLogin && globalThis.history?.replaceState) globalThis.history.replaceState(null, '', globalThis.location.pathname);
  }, [erroLogin]);

  useEffect(() => {
    if (!ehComputadorLocal()) return;
    const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
    fetch(`${base}/_videos_locais/ok`, { cache: 'no-store' }).then((r) => setPreviaDisponivel(r.ok)).catch(() => {});
  }, []);

  const negado = estado === 'negado' || (estado === 'sem-login' && !!erroLogin);

  return (
    <SafeAreaView style={s.tela}>
      <ScrollView contentContainerStyle={s.conteudo}>
        <View style={s.marca}>
          <MarcaTreiNa tamanho={88} />
          <Text style={s.nome}>Trei<Text style={{ color: cores.lima }}>Na</Text></Text>
          <Text style={s.frase}>Seu treino de academia,{'\n'}do seu jeito.</Text>
        </View>

        <View style={s.pontos}>
          {PONTOS.map((p) => (
            <View key={p} style={s.ponto}>
              <View style={s.check}><Icone nome="check" tamanho={14} cor={cores.texto} espessura={3} /></View>
              <Text style={s.pontoTexto}>{p}</Text>
            </View>
          ))}
        </View>

        <View style={{ gap: 12 }}>
          {negado && (
            <View style={s.bloqueio}>
              <Text style={s.bloqueioTitulo}>Acesso não liberado</Text>
              <Text style={s.bloqueioTexto}>
                {estado === 'negado' && conta.usuario?.email
                  ? `A conta ${conta.usuario.email} não tem acesso ao TreiNa.`
                  : 'Esta conta Google não tem acesso ao TreiNa.'}
              </Text>
            </View>
          )}
          {estado === 'sem-internet' && (
            <View style={s.bloqueio}>
              <Text style={s.bloqueioTitulo}>Sem internet</Text>
              <Text style={s.bloqueioTexto}>Conecte à internet uma vez para confirmar o seu acesso.</Text>
            </View>
          )}

          {estado === 'sem-internet' ? (
            <Pressable onPress={tentarDeNovo} accessibilityRole="button" style={({ pressed }) => [s.google, pressed && { opacity: 0.8 }]}>
              <Text style={s.googleTexto}>Tentar de novo</Text>
            </Pressable>
          ) : estado === 'negado' ? (
            <Pressable onPress={conta.sair} accessibilityRole="button" style={({ pressed }) => [s.google, pressed && { opacity: 0.8 }]}>
              <LogoGoogle />
              <Text style={s.googleTexto}>Entrar com outra conta</Text>
            </Pressable>
          ) : (
            <Pressable onPress={conta.entrar} disabled={conta.entrando} accessibilityRole="button"
              style={({ pressed }) => [s.google, (pressed || conta.entrando) && { opacity: 0.8 }]}>
              {conta.entrando ? <ActivityIndicator color={cores.texto} /> : <LogoGoogle />}
              <Text style={s.googleTexto}>{conta.entrando ? 'Abrindo o Google…' : 'Entrar com Google'}</Text>
            </Pressable>
          )}

          <View style={s.aviso}>
            <Text style={s.avisoTexto}>
              🔒 <Text style={{ fontFamily: fontes.negrito, color: cores.textoClaro }}>Acesso restrito.</Text> Entre com a conta Google
              liberada. Ela também guarda os seus treinos para você não perder nada se trocar de celular.
            </Text>
          </View>
          {conta.mensagem && !negado ? <Text style={s.erro}>{conta.mensagem}</Text> : null}

          {previaDisponivel && (
            <Pressable onPress={entrarNaPrevia} style={s.semConta} accessibilityRole="button">
              <Text style={s.semContaTexto}>Ver a prévia sem conta (só neste computador)</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bloqueio: { backgroundColor: '#3A1D17', borderRadius: raio.m, padding: 14, gap: 4 },
  bloqueioTitulo: { fontFamily: fontes.negrito, fontSize: 15, color: '#FFB4A2' },
  bloqueioTexto: { fontFamily: fontes.media, fontSize: 13, color: cores.textoClaro, lineHeight: 19 },
  tela: { flex: 1, backgroundColor: cores.escuro },
  conteudo: { flexGrow: 1, padding: 24, gap: 28, justifyContent: 'center', paddingBottom: 32 },
  marca: { alignItems: 'center', gap: 10, marginTop: 12 },
  nome: { fontFamily: fontes.titulo, fontSize: 40, color: cores.textoClaro, letterSpacing: -1 },
  frase: { fontFamily: fontes.semi, fontSize: 18, color: cores.textoClaro2, textAlign: 'center', lineHeight: 25 },
  pontos: { gap: 12, backgroundColor: cores.escuro2, borderRadius: raio.g, padding: 16 },
  ponto: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  check: { width: 22, height: 22, borderRadius: 11, backgroundColor: cores.lima, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  pontoTexto: { flex: 1, fontFamily: fontes.media, fontSize: 14, color: cores.textoClaro, lineHeight: 20 },
  google: { height: 54, borderRadius: raio.m, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  googleTexto: { fontFamily: fontes.semi, fontSize: 16, color: '#1F1F1F' },
  aviso: { borderRadius: raio.m, borderWidth: 1, borderColor: cores.escuro3, padding: 12 },
  avisoTexto: { fontFamily: fontes.regular, fontSize: 12, color: cores.textoClaro2, lineHeight: 18 },
  erro: { fontFamily: fontes.media, fontSize: 12, color: '#FFB4A2', textAlign: 'center' },
  semConta: { height: 50, alignItems: 'center', justifyContent: 'center' },
  semContaTexto: { fontFamily: fontes.semi, fontSize: 15, color: cores.lima },
  rodape: { fontFamily: fontes.regular, fontSize: 11, color: cores.textoClaro2, textAlign: 'center', lineHeight: 16, marginTop: -6 },
});
