import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { Icone } from '@/components/Icone';
import { MarcaTreiNa } from '@/components/pecas';
import { cores, fontes, raio } from '@/constants/tema';
import { exercicios } from '@/data';
import { useDados } from '@/db/banco';
import { useConta } from '@/db/nuvem';

const PONTOS = [
  `${exercicios.length} exercícios de academia com vídeo e dica de execução`,
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

/** Primeira tela: entrar com Google (para guardar os treinos) ou seguir sem conta. */
export default function BoasVindas() {
  const router = useRouter();
  const { perfil, pronto } = useDados();
  const conta = useConta();
  const conferindo = !!conta.usuario && !conta.sincronizado;

  // Depois do login: se a nuvem trouxe o perfil, vai direto para o app; senão, cadastro
  useEffect(() => {
    if (!conta.usuario || !conta.sincronizado || !pronto) return;
    router.replace(perfil.nome ? '/' : '/cadastro');
  }, [conta.usuario, conta.sincronizado, pronto, perfil.nome, router]);

  if (pronto && perfil.nome && !conta.usuario) return <Redirect href="/" />;

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
          {conta.configurada && (
            <Pressable onPress={conta.entrar} disabled={conta.entrando || conferindo} accessibilityRole="button"
              style={({ pressed }) => [s.google, (pressed || conta.entrando) && { opacity: 0.8 }]}>
              {conta.entrando || conferindo ? <ActivityIndicator color={cores.texto} /> : <LogoGoogle />}
              <Text style={s.googleTexto}>{conferindo ? 'Buscando seus treinos…' : conta.entrando ? 'Abrindo o Google…' : 'Entrar com Google'}</Text>
            </Pressable>
          )}
          {conta.configurada && (
            <View style={s.aviso}>
              <Text style={s.avisoTexto}>
                🔒 A conta Google serve <Text style={{ fontFamily: fontes.negrito, color: cores.textoClaro }}>só para guardar os seus dados de treino</Text> (perfil, treinos e histórico) e trazer tudo de volta se você trocar de celular. Nada é publicado nem compartilhado.
              </Text>
            </View>
          )}
          {conta.mensagem ? <Text style={s.erro}>{conta.mensagem}</Text> : null}
          <Pressable onPress={() => router.push('/cadastro')} style={s.semConta} accessibilityRole="button" disabled={conferindo}>
            <Text style={s.semContaTexto}>{conta.configurada ? 'Continuar sem conta' : 'Começar'}</Text>
          </Pressable>
          {conta.configurada && <Text style={s.rodape}>Sem conta, os dados ficam só neste aparelho. Dá para entrar com o Google depois, no Perfil.</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
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
