import { useEffect } from 'react';
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

import { BancoProvider } from '@/db/banco';
import { ContaProvider } from '@/db/nuvem';
import { cores } from '@/constants/tema';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontesProntas] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontesProntas) SplashScreen.hideAsync();
  }, [fontesProntas]);

  if (!fontesProntas) return null;

  return (
    <BancoProvider>
      <ContaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="exercicio/[id]" />
          <Stack.Screen name="mulher" />
          <Stack.Screen name="login" options={{ animation: 'none' }} />
        </Stack>
      </ContaProvider>
    </BancoProvider>
  );
}
