import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { cores, fontes } from '@/constants/tema';
import { useDados } from '@/db/banco';
import { trocarCodigo, useConta } from '@/db/nuvem';
import { supabase } from '@/lib/supabase';

/** Tela de passagem: o Google devolve a pessoa aqui depois do login. */
export default function TelaLogin() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { pronto, perfil } = useDados();
  const conta = useConta();
  const [tempoEsgotado, setTempoEsgotado] = useState(false);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') await supabase?.auth.getSession(); // o site troca o código sozinho
      else if (typeof code === 'string') await trocarCodigo(code);
    })();
    const t = setTimeout(() => setTempoEsgotado(true), 15000);
    return () => clearTimeout(t);
  }, [code]);

  // Espera a nuvem conferir/restaurar os dados para decidir: app direto ou cadastro
  useEffect(() => {
    if (!pronto) return;
    const pronta = (conta.usuario && conta.sincronizado) || tempoEsgotado || (!conta.usuario && tempoEsgotado);
    if (!pronta) return;
    router.replace(perfil.nome ? '/' : conta.usuario ? '/cadastro' : '/boas-vindas');
  }, [pronto, conta.usuario, conta.sincronizado, tempoEsgotado, perfil.nome, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: cores.escuro }}>
      <ActivityIndicator color={cores.lima} size="large" />
      <Text style={{ fontFamily: fontes.media, fontSize: 15, color: cores.textoClaro2 }}>
        {conta.usuario ? 'Buscando seus treinos…' : 'Entrando na sua conta…'}
      </Text>
    </View>
  );
}
