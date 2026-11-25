import './polyfills';
import { AppState, Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/*
 * Conexão com o Supabase (login com Google + backup na nuvem).
 * Os dois valores vêm do arquivo .env na raiz do projeto:
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
 * A chave "publishable" pode ir dentro do app: quem protege os dados são as regras (RLS) do SQL.
 */
const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const chave = (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim();

export const nuvemConfigurada = /^https:\/\/[^\s]+$/.test(url) && chave.length > 20 && !/COLE/i.test(url + chave);

export const supabase: SupabaseClient | null = nuvemConfigurada
  ? createClient(url, chave, {
      auth: {
        // No celular a sessão fica no localStorage do expo-sqlite; no site, no localStorage do navegador.
        ...(Platform.OS === 'web' ? {} : { storage: localStorage }),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
      },
    })
  : null;

// No celular, só renova o login enquanto o app está aberto na tela.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Endereço para onde o Google devolve a pessoa depois do login. */
export function enderecoRetorno(criarUrl: (caminho: string) => string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
    return `${window.location.origin}${base}/login`;
  }
  return criarUrl('login'); // treina://login (APK) ou exp://.../--/login (Expo Go)
}
