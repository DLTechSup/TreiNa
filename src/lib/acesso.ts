/*
 * Acesso ao app: só entra quem estiver logado com uma conta Google LIBERADA
 * (lista de e-mails no Supabase, tabela "acesso_liberado").
 *
 * - Sem internet (academia): vale a última confirmação feita neste aparelho.
 * - Prévia no computador (localhost): dá para entrar sem conta, só para olhar.
 */
import { useEffect, useState } from 'react';

import { useConta } from '@/db/nuvem';
import { nuvemConfigurada, supabase } from '@/lib/supabase';

export type Acesso = 'carregando' | 'sem-login' | 'conferindo' | 'liberado' | 'negado' | 'sem-internet' | 'previa';

const chave = (uid: string) => `treina_acesso_${uid}`;
function ler(guardado: 'local' | 'sessao', k: string) {
  try {
    const s = guardado === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
    return s ? s.getItem(k) : null;
  } catch {
    return null;
  }
}
function gravar(guardado: 'local' | 'sessao', k: string, v: string | null) {
  try {
    const s = guardado === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
    if (!s) return;
    if (v == null) s.removeItem(k);
    else s.setItem(k, v);
  } catch {
    /* navegador sem armazenamento: só não lembra */
  }
}

/** Prévia só no computador (localhost), nunca no site publicado. */
export function ehComputadorLocal() {
  const host = globalThis.location?.hostname ?? '';
  return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host);
}

export function useAcesso() {
  const conta = useConta();
  const [estado, setEstado] = useState<Acesso>('carregando');
  const [tentativa, setTentativa] = useState(0);
  const [previa, setPrevia] = useState(() => ehComputadorLocal() && ler('sessao', 'treina_previa') === '1');
  const uid = conta.usuario?.id;

  useEffect(() => {
    if (!nuvemConfigurada || !supabase) {
      setEstado('liberado');
      return;
    }
    if (previa) {
      setEstado('previa');
      return;
    }
    if (!conta.pronto) {
      setEstado('carregando');
      return;
    }
    if (!uid) {
      setEstado('sem-login');
      return;
    }
    let vivo = true;
    const jaLiberado = ler('local', chave(uid)) === '1';
    setEstado(jaLiberado ? 'liberado' : 'conferindo');
    supabase.rpc('treina_tem_acesso').then(({ data, error }) => {
      if (!vivo) return;
      if (error) {
        // Lista de acesso ainda não criada no Supabase: o app continua aberto como antes
        if (error.code === 'PGRST202') {
          setEstado('liberado');
          return;
        }
        if (!jaLiberado) setEstado('sem-internet'); // sem internet e nunca conferido neste aparelho
        return;
      }
      if (data === true) {
        gravar('local', chave(uid), '1');
        setEstado('liberado');
      } else {
        gravar('local', chave(uid), null);
        setEstado('negado');
      }
    });
    return () => { vivo = false; };
  }, [conta.pronto, uid, previa, tentativa]);

  return {
    estado,
    tentarDeNovo: () => setTentativa((t) => t + 1),
    entrarNaPrevia: () => {
      gravar('sessao', 'treina_previa', '1');
      setPrevia(true);
    },
  };
}
