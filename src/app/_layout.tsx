import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
// Importa só os pesos usados (o pacote completo tem 18 arquivos de fonte)
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';

import { Portao } from '@/components/Portao';
import { BancoProvider } from '@/db/banco';
import { ContaProvider } from '@/db/nuvem';
import { cores } from '@/constants/tema';
import { verificarVideos } from '@/lib/midiaPrivada';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontesProntas] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontesProntas) SplashScreen.hideAsync();
  }, [fontesProntas]);

  // Quantos vídeos dos exercícios já estão guardados no celular
  useEffect(() => { verificarVideos(); }, []);

  if (!fontesProntas) return null;

  return (
    <BancoProvider>
      <ContaProvider>
        <StatusBar style="dark" />
        {/* No computador o site fica numa coluna do tamanho de um celular, centralizada */}
        <View style={Platform.OS === 'web' ? { flex: 1, backgroundColor: '#E4E2DC' } : { flex: 1 }}>
          <View style={Platform.OS === 'web' ? { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: cores.fundo, overflow: 'hidden' } : { flex: 1 }}>
            <Portao>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="boas-vindas" options={{ animation: 'fade' }} />
              <Stack.Screen name="cadastro" />
              <Stack.Screen name="login" options={{ animation: 'none' }} />
              <Stack.Screen name="exercicio/[id]" />
              <Stack.Screen name="mulher" />
              <Stack.Screen name="treino/dia/[dia]" />
              <Stack.Screen name="treino/planos" />
              <Stack.Screen name="treino/plano/[id]" />
              <Stack.Screen name="treino/executar" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
              <Stack.Screen name="historico/[id]" />
              <Stack.Screen name="historico/exercicio/[id]" />
              <Stack.Screen name="atualizacao" />
            </Stack>
            </Portao>
          </View>
        </View>
      </ContaProvider>
    </BancoProvider>
  );
}
