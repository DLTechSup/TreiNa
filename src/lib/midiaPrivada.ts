/*
 * Vídeos próprios dos exercícios (privados).
 *
 * Os vídeos NÃO ficam no site nem no GitHub. Eles ficam:
 *  - na nuvem privada (Supabase Storage, pasta "videos-treino"), que só abre para a conta Google liberada;
 *  - e, depois da "Atualização de vídeos" (feita uma vez), guardados no próprio celular (Cache Storage).
 * Na prévia pelo computador (localhost), a atualização busca os vídeos direto da pasta do PC.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';

import { exerciciosVideo } from '@/data';
import { supabase } from '@/lib/supabase';

export const PASTA_NUVEM = 'videos-treino';
const CACHE = 'treina-videos-v1';
const BASE = 'https://treina.local/';
const pedidoVideo = (chave: string) => new Request(`${BASE}v/${chave}`);
const pedidoMini = (chave: string) => new Request(`${BASE}m/${chave}.jpg`);
const temCache = () => typeof caches !== 'undefined' && typeof window !== 'undefined';

/* ---------------- estado da atualização ---------------- */

export type Fonte = 'local' | 'nuvem' | 'sem-login' | 'sem-acesso' | 'indisponivel';
export type EstadoVideos = {
  total: number;
  guardados: number;
  verificado: boolean;
  atualizando: boolean;
  erro: string | null;
};

let estado: EstadoVideos = { total: exerciciosVideo.length, guardados: 0, verificado: false, atualizando: false, erro: null };
const ouvintes = new Set<() => void>();
function mudar(p: Partial<EstadoVideos>) {
  estado = { ...estado, ...p };
  ouvintes.forEach((f) => f());
}
const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => { ouvintes.delete(f); };
};
export const useEstadoVideos = () => useSyncExternalStore(assinar, () => estado, () => estado);

/** Conta quantos vídeos já estão guardados no celular. */
export async function verificarVideos() {
  if (!temCache()) {
    mudar({ verificado: true });
    return;
  }
  try {
    const c = await caches.open(CACHE);
    const chaves = new Set((await c.keys()).map((r) => new URL(r.url).pathname));
    mudar({ guardados: exerciciosVideo.filter((e) => chaves.has(`/v/${e.video}`)).length, verificado: true });
  } catch {
    mudar({ verificado: true });
  }
}

/* ---------------- de onde vêm os vídeos ---------------- */

const BASE_SITE = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
function enderecoLocal() {
  if (typeof window === 'undefined') return null;
  return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)
    ? `${window.location.origin}${BASE_SITE}/_videos_locais/`
    : null;
}

/** Descobre de onde dá para atualizar: pasta do PC (prévia), nuvem privada, ou o que falta. */
export async function verificarFonte(): Promise<Fonte> {
  const local = enderecoLocal();
  if (local) {
    try {
      const r = await fetch(`${local}ok`, { cache: 'no-store' });
      if (r.ok) return 'local';
    } catch {
      /* sem a pasta local: tenta a nuvem */
    }
  }
  if (!supabase) return 'indisponivel';
  const { data } = await supabase.auth.getSession();
  if (!data.session) return 'sem-login';
  const pasta = exerciciosVideo[0]?.video?.split('/')[0] ?? '';
  const { data: lista, error } = await supabase.storage.from(PASTA_NUVEM).list(pasta, { limit: 1 });
  if (error || !lista?.length) return 'sem-acesso';
  return 'nuvem';
}

// Lembra a fonte por 1 minuto (evita perguntar ao servidor a cada vídeo)
let fonteGuardada: { quando: number; promessa: Promise<Fonte> } | null = null;
export function fonteAtual() {
  if (!fonteGuardada || Date.now() - fonteGuardada.quando > 60_000) {
    fonteGuardada = { quando: Date.now(), promessa: verificarFonte().catch(() => 'indisponivel' as Fonte) };
  }
  return fonteGuardada.promessa;
}
if (supabase) supabase.auth.onAuthStateChange(() => { fonteGuardada = null; });

const assinados = new Map<string, { url: string; ate: number }>();
/** Endereço para tocar o vídeo direto da nuvem (ou da pasta do PC na prévia), sem guardar no celular. */
async function enderecoSemGuardar(chave: string): Promise<string | null> {
  const fonte = await fonteAtual();
  if (fonte === 'local') return enderecoLocal() + chave;
  if (fonte !== 'nuvem' || !supabase) return null;
  const ja = assinados.get(chave);
  if (ja && ja.ate > Date.now() + 60_000) return ja.url;
  // link temporário: vale só 10 minutos (se vazar, logo para de funcionar)
  const { data } = await supabase.storage.from(PASTA_NUVEM).createSignedUrl(chave, 600);
  if (!data?.signedUrl) return null;
  assinados.set(chave, { url: data.signedUrl, ate: Date.now() + 600_000 });
  return data.signedUrl;
}

async function baixar(fonte: 'local' | 'nuvem', chave: string): Promise<Blob> {
  if (fonte === 'local') {
    const r = await fetch(enderecoLocal() + chave);
    if (!r.ok) throw new Error(`arquivo não encontrado (${r.status})`);
    return r.blob();
  }
  const { data, error } = await supabase!.storage.from(PASTA_NUVEM).download(chave);
  if (error || !data) throw error ?? new Error('falha ao baixar');
  return data;
}

/** Tira uma "foto" do meio do vídeo para usar como miniatura (feita no próprio celular). */
function gerarMiniatura(blob: Blob): Promise<Blob | null> {
  return new Promise((pronto) => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    let feito = false;
    const fim = (b: Blob | null) => {
      if (feito) return;
      feito = true;
      clearTimeout(limite);
      URL.revokeObjectURL(url);
      v.removeAttribute('src');
      v.load();
      pronto(b);
    };
    const limite = setTimeout(() => fim(null), 8000);
    v.addEventListener('loadedmetadata', () => {
      v.currentTime = Math.max(0, Math.min(v.duration * 0.4, v.duration - 0.1));
    }, { once: true });
    v.addEventListener('seeked', () => {
      try {
        const largura = 270;
        const altura = Math.round((largura * (v.videoHeight || 960)) / (v.videoWidth || 540));
        const c = document.createElement('canvas');
        c.width = largura;
        c.height = altura;
        c.getContext('2d')!.drawImage(v, 0, 0, largura, altura);
        c.toBlob((b) => fim(b), 'image/jpeg', 0.72);
      } catch {
        fim(null);
      }
    }, { once: true });
    v.addEventListener('error', () => fim(null), { once: true });
    v.src = url;
    v.load();
  });
}

const MENSAGENS: Record<Exclude<Fonte, 'local' | 'nuvem'>, string> = {
  'sem-login': 'Entre com a sua conta Google para atualizar.',
  'sem-acesso': 'Esta conta Google não tem acesso a esta atualização.',
  indisponivel: 'A atualização não está disponível neste aparelho.',
};

/**
 * Atualização de vídeos: baixa só o que ainda não está no celular (pode parar e continuar depois).
 */
export async function atualizarVideos() {
  if (estado.atualizando || !temCache()) return;
  mudar({ atualizando: true, erro: null });
  try {
    const fonte = await verificarFonte();
    if (fonte !== 'local' && fonte !== 'nuvem') {
      mudar({ atualizando: false, erro: MENSAGENS[fonte] });
      return;
    }
    try {
      await navigator.storage?.persist?.(); // pede para o navegador não apagar os vídeos
    } catch {
      /* nem todo navegador tem */
    }
    const c = await caches.open(CACHE);
    const guardadas = new Set((await c.keys()).map((r) => new URL(r.url).pathname));
    const faltam = exerciciosVideo.filter((e) => e.video && !guardadas.has(`/v/${e.video}`));
    let guardados = exerciciosVideo.length - faltam.length;
    mudar({ guardados });
    let falhas = 0;
    let semEspaco = false;
    let i = 0;
    const trabalhar = async () => {
      while (i < faltam.length && !semEspaco) {
        const e = faltam[i++];
        try {
          const blob = await baixar(fonte, e.video!);
          await c.put(pedidoVideo(e.video!), new Response(blob, { headers: { 'Content-Type': 'video/mp4' } }));
          const mini = await gerarMiniatura(blob);
          if (mini) await c.put(pedidoMini(e.video!), new Response(mini, { headers: { 'Content-Type': 'image/jpeg' } }));
          guardados += 1;
          mudar({ guardados });
        } catch (err) {
          if ((err as { name?: string })?.name === 'QuotaExceededError') semEspaco = true;
          falhas += 1;
        }
      }
    };
    await Promise.all([trabalhar(), trabalhar(), trabalhar()]);
    mudar({
      atualizando: false,
      erro: semEspaco
        ? 'O celular ficou sem espaço para a atualização. Libere espaço e toque em Atualizar de novo.'
        : falhas
          ? 'A atualização não terminou. Toque em Atualizar de novo para continuar de onde parou.'
          : null,
    });
  } catch (e) {
    mudar({ atualizando: false, erro: `Não foi possível atualizar: ${(e as Error)?.message ?? e}` });
  }
}

/** Apaga os vídeos guardados no celular (para liberar espaço). */
export async function apagarVideos() {
  if (!temCache()) return;
  await caches.delete(CACHE);
  miniaturas.forEach((u) => URL.revokeObjectURL(u));
  miniaturas.clear();
  mudar({ guardados: 0 });
}

/* ---------------- endereços para mostrar na tela ---------------- */

// Miniaturas são pequenas: ficam na memória. Vídeos não (cada tela abre e fecha o seu).
const miniaturas = new Map<string, string>();

async function lerDoCache(pedido: Request) {
  if (!temCache()) return null;
  try {
    const c = await caches.open(CACHE);
    const r = await c.match(pedido);
    return r ? await r.blob() : null;
  } catch {
    return null;
  }
}

/** Miniatura guardada no celular (ou null se ainda não atualizou). */
export function useMiniaturaPrivada(chave?: string) {
  const { guardados } = useEstadoVideos();
  const [url, setUrl] = useState<string | null>(() => (chave ? miniaturas.get(chave) ?? null : null));
  useEffect(() => {
    let vivo = true;
    if (!chave) {
      setUrl(null);
      return;
    }
    const ja = miniaturas.get(chave);
    if (ja) {
      setUrl(ja);
      return;
    }
    lerDoCache(pedidoMini(chave)).then((b) => {
      if (!b) return;
      const u = miniaturas.get(chave) ?? URL.createObjectURL(b);
      miniaturas.set(chave, u);
      if (vivo) setUrl(u);
    });
    return () => { vivo = false; };
  }, [chave, guardados]);
  return url;
}

/** Se os vídeos próprios estão disponíveis para esta conta (nuvem liberada ou pasta do PC na prévia). */
export function useVideosDisponiveis() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    let vivo = true;
    fonteAtual().then((f) => { if (vivo) setOk(f === 'nuvem' || f === 'local'); });
    return () => { vivo = false; };
  }, []);
  return ok;
}

/**
 * Vídeo guardado no celular, ou tocando direto da nuvem. `indisponivel` = não há como mostrar agora
 * (sem login liberado, sem internet ou vídeo ainda não enviado). Libera a memória ao sair da tela.
 */
export function useVideoPrivado(chave?: string) {
  const { guardados } = useEstadoVideos();
  const [url, setUrl] = useState<string | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const faltando = !url;
  // durante a atualização, quando chega vídeo novo e este ainda não tinha, tenta de novo
  useEffect(() => {
    if (faltando) setTentativa((t) => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardados]);
  useEffect(() => {
    let vivo = true;
    let criado: string | null = null;
    if (!chave) {
      setUrl(null);
      return;
    }
    lerDoCache(pedidoVideo(chave)).then(async (b) => {
      if (!vivo) return;
      if (b) {
        criado = URL.createObjectURL(b);
        setIndisponivel(false);
        setUrl(criado);
        return;
      }
      // Ainda não está no celular: toca direto da nuvem privada (precisa de internet)
      const direto = await enderecoSemGuardar(chave).catch(() => null);
      if (!vivo) return;
      if (direto) setUrl(direto);
      else setIndisponivel(true);
    });
    return () => {
      vivo = false;
      if (criado) URL.revokeObjectURL(criado);
    };
  }, [chave, tentativa]);
  return { url, indisponivel: !url && indisponivel };
}
