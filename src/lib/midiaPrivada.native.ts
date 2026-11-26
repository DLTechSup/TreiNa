/*
 * No APK (celular nativo) os vídeos próprios ainda não são guardados: os exercícios com vídeo
 * mostram a miniatura vazia. A atualização de vídeos funciona no site/app instalado pelo navegador.
 */
import { useSyncExternalStore } from 'react';

import { exerciciosVideo } from '@/data';

export const PASTA_NUVEM = 'videos-treino';
export type Fonte = 'local' | 'nuvem' | 'sem-login' | 'sem-acesso' | 'indisponivel';
export type EstadoVideos = { total: number; guardados: number; verificado: boolean; atualizando: boolean; erro: string | null };
const estado: EstadoVideos = { total: exerciciosVideo.length, guardados: 0, verificado: true, atualizando: false, erro: null };
export const useEstadoVideos = () => useSyncExternalStore(() => () => {}, () => estado, () => estado);
export async function verificarVideos() {}
export async function verificarFonte(): Promise<Fonte> { return 'indisponivel'; }
export async function atualizarVideos() {}
export async function apagarVideos() {}
export function useMiniaturaPrivada(_chave?: string): string | null { return null; }
export function useVideoPrivado(_chave?: string) { return { url: null as string | null, indisponivel: true }; }
export function useVideosDisponiveis(): boolean | null { return false; }
export async function fonteAtual(): Promise<Fonte> { return 'indisponivel'; }
