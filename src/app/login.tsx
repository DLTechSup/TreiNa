import { useEffect } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { cores, fontes } from '@/constants/tema';
import { trocarCodigo } from '@/db/nuvem';
import { supabase } from '@/lib/supabase';

/** Tela de passagem: o Google devolve a pessoa aqui depois do login; volta para o Perfil. */
export default function TelaLogin() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        if (Platform.OS === 'web') await supabase?.auth.getSession(); // o site troca o código sozinho
        else if (typeof code === 'string') await trocarCodigo(code);
      } finally {
        if (vivo) router.replace('/perfil');
      }
    })();
    return () => { vivo = false; };
  }, [code, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: cores.fundo }}>
      <ActivityIndicator color={cores.roxo} size="large" />
      <Text style={{ fontFamily: fontes.media, fontSize: 15, color: cores.texto2 }}>Entrando na sua conta…</Text>
    </View>
  );
}
