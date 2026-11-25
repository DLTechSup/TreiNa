import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { cores, fontes, raio } from '@/constants/tema';
import { miniaturas } from '@/data/midia';
import type { Exercicio } from '@/data';
import { Icone } from './Icone';

/* ---------------- Textos ---------------- */

export function Titulo({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[estilos.titulo, style]}>{children}</Text>;
}

export function Rotulo({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[estilos.rotulo, style]}>{children}</Text>;
}

export function Logo({ tamanho = 20, claro = false }: { tamanho?: number; claro?: boolean }) {
  return (
    <Text style={[estilos.logo, { fontSize: tamanho, color: claro ? cores.textoClaro : cores.texto }]}>
      Trei<Text style={{ color: claro ? cores.lima : cores.roxo }}>Na</Text>
    </Text>
  );
}

/* ---------------- Chips e botões ---------------- */

type ChipProps = {
  texto: string;
  contagem?: number;
  ativo?: boolean;
  escuro?: boolean;
  onPress?: () => void;
};

export function Chip({ texto, contagem, ativo, escuro, onPress }: ChipProps) {
  const fundo = ativo ? (escuro ? cores.escuro : cores.roxo) : cores.cartao;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!ativo }}
      style={({ pressed }) => [estilos.chip, { backgroundColor: fundo, borderColor: ativo ? fundo : cores.borda }, pressed && { opacity: 0.7 }]}>
      <Text style={[estilos.chipTexto, ativo && { color: cores.textoClaro, fontFamily: fontes.semi }]}>
        {texto}
        {contagem !== undefined && (
          <Text style={{ color: ativo ? (escuro ? cores.lima : cores.lilas) : cores.texto2 }}>  {contagem}</Text>
        )}
      </Text>
    </Pressable>
  );
}

type BotaoProps = {
  texto: string;
  onPress?: () => void;
  tipo?: 'principal' | 'contorno' | 'lima';
  style?: StyleProp<ViewStyle>;
  desativado?: boolean;
  /** Cor do texto (ex.: botão contorno em fundo escuro). */
  corTexto?: string;
};

export function Botao({ texto, onPress, tipo = 'principal', style, desativado, corTexto }: BotaoProps) {
  const fundo = tipo === 'principal' ? cores.roxo : tipo === 'lima' ? cores.lima : 'transparent';
  const cor = corTexto ?? (tipo === 'principal' ? cores.textoClaro : cores.texto);
  return (
    <Pressable
      onPress={onPress}
      disabled={desativado}
      accessibilityRole="button"
      style={({ pressed }) => [
        estilos.botao,
        { backgroundColor: fundo, borderWidth: tipo === 'contorno' ? 1 : 0, opacity: desativado ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}>
      <Text style={[estilos.botaoTexto, { color: cor }]}>{texto}</Text>
    </Pressable>
  );
}

export function BotaoIcone({
  icone, onPress, rotulo, children,
}: { icone?: Parameters<typeof Icone>[0]['nome']; onPress?: () => void; rotulo: string; children?: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={rotulo}
      style={({ pressed }) => [estilos.botaoIcone, pressed && { opacity: 0.7 }]}>
      {children ?? (icone && <Icone nome={icone} tamanho={20} />)}
    </Pressable>
  );
}

/** Barra do topo com "voltar" (telas fora das abas). */
export function TopoVoltar({ titulo, direita }: { titulo?: string; direita?: ReactNode }) {
  const router = useRouter();
  return (
    <View style={estilos.topo}>
      <BotaoIcone icone="voltar" rotulo="Voltar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <Text style={estilos.topoTitulo} numberOfLines={1}>{titulo}</Text>
      {direita ?? <View style={{ width: 44 }} />}
    </View>
  );
}

/* ---------------- Exercício em lista ---------------- */

export const ALTURA_LINHA = 76;

type LinhaProps = { exercicio: Exercicio; favorito: boolean; onFavorito: (id: string) => void; detalhe?: string };

export const LinhaExercicio = memo(function LinhaExercicio({ exercicio: e, favorito, onFavorito, detalhe }: LinhaProps) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/exercicio/[id]', params: { id: e.id } })}
      style={({ pressed }) => [estilos.linha, pressed && { backgroundColor: '#FAFAF7' }]}
      accessibilityRole="button"
      accessibilityLabel={e.nome}>
      <Image source={miniaturas[e.id]} style={estilos.linhaImg} contentFit="cover" transition={120} />
      <View style={{ flex: 1 }}>
        <Text style={estilos.linhaNome} numberOfLines={2}>{e.nome}</Text>
        <Text style={estilos.linhaInfo} numberOfLines={1}>{detalhe ?? `${e.grupo} · ${e.equipamento}`}</Text>
      </View>
      <Pressable onPress={() => onFavorito(e.id)} hitSlop={10} accessibilityRole="button"
        accessibilityLabel={favorito ? 'Remover dos favoritos' : 'Favoritar'} style={estilos.linhaEstrela}>
        <Icone nome="estrela" tamanho={20} cor={favorito ? cores.roxo : '#B4B2AA'} preenchido={favorito} />
      </Pressable>
    </Pressable>
  );
});

export function Miniatura({ id, tamanho = 48, raioBorda = 10 }: { id: string; tamanho?: number; raioBorda?: number }) {
  return (
    <Image source={miniaturas[id]} style={{ width: tamanho, height: tamanho, borderRadius: raioBorda, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda }} contentFit="cover" />
  );
}

/* ---------------- Estilos ---------------- */

export const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: 26, color: cores.texto, letterSpacing: -0.4 },
  rotulo: { fontFamily: fontes.negrito, fontSize: 13, color: cores.texto },
  logo: { fontFamily: fontes.titulo, letterSpacing: -0.3 },
  chip: { height: 36, paddingHorizontal: 12, borderRadius: raio.pill, borderWidth: 1, justifyContent: 'center' },
  chipTexto: { fontFamily: fontes.media, fontSize: 13, color: cores.texto },
  botao: { height: 50, borderRadius: raio.m, alignItems: 'center', justifyContent: 'center', borderColor: cores.texto, paddingHorizontal: 16 },
  botaoTexto: { fontFamily: fontes.semi, fontSize: 15 },
  botaoIcone: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda,
    alignItems: 'center', justifyContent: 'center',
  },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  topoTitulo: { flex: 1, textAlign: 'center', fontFamily: fontes.media, fontSize: 13, color: cores.texto2 },
  linha: {
    height: ALTURA_LINHA, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12,
    backgroundColor: cores.cartao, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: cores.borda,
  },
  linhaImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: cores.cartao },
  linhaNome: { fontFamily: fontes.semi, fontSize: 14, color: cores.texto, lineHeight: 18 },
  linhaInfo: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2, marginTop: 3 },
  linhaEstrela: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  cartao: { backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.g, padding: 16 },
});
