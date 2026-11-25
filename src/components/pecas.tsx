import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { cores, fontes, raio } from '@/constants/tema';
import { Botao } from './ui';

/** Marca do TreiNa: "T" com barra de musculação (mesmo desenho do logo). */
export function MarcaTreiNa({ tamanho = 64, fundo = true }: { tamanho?: number; fundo?: boolean }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 1024 1024">
      {fundo && <Rect width={1024} height={1024} rx={232} fill={cores.escuro} />}
      <Rect x={236} y={312} width={552} height={66} rx={33} fill="#FFFFFF" />
      <Rect x={468} y={340} width={88} height={452} rx={44} fill="#FFFFFF" />
      <Rect x={188} y={222} width={70} height={246} rx={24} fill={cores.lima} />
      <Rect x={270} y={262} width={42} height={166} rx={18} fill={cores.lima} />
      <Rect x={766} y={222} width={70} height={246} rx={24} fill={cores.lima} />
      <Rect x={712} y={262} width={42} height={166} rx={18} fill={cores.lima} />
    </Svg>
  );
}

/** Caixa de confirmação (funciona igual no celular e no site). */
export function Confirmar({
  visivel, titulo, texto, confirmar, cancelar = 'Cancelar', perigo, onConfirmar, onCancelar,
}: {
  visivel: boolean; titulo: string; texto?: string; confirmar: string; cancelar?: string; perigo?: boolean;
  onConfirmar: () => void; onCancelar: () => void;
}) {
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onCancelar}>
      <Pressable style={s.fundoModal} onPress={onCancelar}>
        <Pressable style={s.caixa} onPress={() => {}}>
          <Text style={s.caixaTitulo}>{titulo}</Text>
          {texto ? <Text style={s.caixaTexto}>{texto}</Text> : null}
          <Botao texto={confirmar} onPress={onConfirmar} style={perigo ? { backgroundColor: '#C2410C' } : undefined} />
          <Botao texto={cancelar} tipo="contorno" onPress={onCancelar} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** − valor + (séries, repetições, carga...). */
export function Contador({
  rotulo, valor, onMudar, passo = 1, min = 0, max = 999, sufixo, decimal, largura = 54,
}: {
  rotulo?: string; valor: number | null; onMudar: (v: number | null) => void; passo?: number; min?: number; max?: number;
  sufixo?: string; decimal?: boolean; largura?: number;
}) {
  const mudar = (d: number) => {
    const novo = Math.min(max, Math.max(min, Math.round(((valor ?? 0) + d) * 10) / 10));
    onMudar(novo);
  };
  const texto = valor == null ? '' : String(valor).replace('.', ',');
  return (
    <View style={{ gap: 4 }}>
      {rotulo ? <Text style={s.rotulo}>{rotulo}</Text> : null}
      <View style={s.contador}>
        <Pressable onPress={() => mudar(-passo)} style={s.contBotao} hitSlop={6} accessibilityLabel={`Diminuir ${rotulo ?? ''}`}>
          <Text style={s.contSinal}>−</Text>
        </Pressable>
        <TextInput
          value={texto}
          onChangeText={(t) => {
            const limpo = t.replace(',', '.').replace(decimal ? /[^0-9.]/g : /[^0-9]/g, '');
            if (!limpo) return onMudar(null);
            const n = Number(limpo);
            if (Number.isFinite(n)) onMudar(Math.min(max, n));
          }}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          style={[s.contValor, { width: largura }]}
          selectTextOnFocus
          placeholder="—"
          placeholderTextColor={cores.texto3}
        />
        {sufixo ? <Text style={s.contSufixo}>{sufixo}</Text> : null}
        <Pressable onPress={() => mudar(passo)} style={s.contBotao} hitSlop={6} accessibilityLabel={`Aumentar ${rotulo ?? ''}`}>
          <Text style={s.contSinal}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Abas pequenas (Dia | Mês | Ano). */
export function Segmentado<T extends string>({
  opcoes, valor, onMudar, style,
}: { opcoes: { valor: T; texto: string }[]; valor: T; onMudar: (v: T) => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.seg, style]}>
      {opcoes.map((o) => (
        <Pressable key={o.valor} onPress={() => onMudar(o.valor)} style={[s.segItem, o.valor === valor && s.segAtivo]}
          accessibilityRole="button" accessibilityState={{ selected: o.valor === valor }}>
          <Text style={[s.segTexto, o.valor === valor && s.segTextoAtivo]}>{o.texto}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function BarraProgresso({ valor, cor = cores.roxo, fundo = cores.cinza, altura = 6 }: { valor: number; cor?: string; fundo?: string; altura?: number }) {
  return (
    <View style={{ height: altura, borderRadius: altura, backgroundColor: fundo, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, valor)) * 100}%`, height: '100%', backgroundColor: cor, borderRadius: altura }} />
    </View>
  );
}

/** Cartão com número grande (sequência, treinos no mês...). */
export function Numero({ valor, rotulo, escuro }: { valor: string; rotulo: string; escuro?: boolean }) {
  return (
    <View style={[s.numero, escuro && { backgroundColor: cores.escuro2, borderColor: cores.escuro2 }]}>
      <Text style={[s.numeroValor, escuro && { color: cores.textoClaro }]} numberOfLines={1}>{valor}</Text>
      <Text style={[s.numeroRotulo, escuro && { color: cores.textoClaro2 }]} numberOfLines={2}>{rotulo}</Text>
    </View>
  );
}

export function Secao({ titulo, acao, children }: { titulo: string; acao?: { texto: string; onPress: () => void }; children?: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={s.secaoTopo}>
        <Text style={s.secaoTitulo}>{titulo}</Text>
        {acao && <Text onPress={acao.onPress} style={s.secaoAcao}>{acao.texto}</Text>}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  fundoModal: { flex: 1, backgroundColor: 'rgba(22,22,29,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  caixa: { width: '100%', maxWidth: 420, backgroundColor: cores.cartao, borderRadius: raio.g, padding: 20, gap: 12 },
  caixaTitulo: { fontFamily: fontes.titulo, fontSize: 20, color: cores.texto },
  caixaTexto: { fontFamily: fontes.regular, fontSize: 14, color: cores.texto2, lineHeight: 20, marginBottom: 4 },
  rotulo: { fontFamily: fontes.media, fontSize: 11, color: cores.texto2 },
  contador: { flexDirection: 'row', alignItems: 'center', backgroundColor: cores.fundo, borderRadius: 12, borderWidth: 1, borderColor: cores.borda, height: 42 },
  contBotao: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  contSinal: { fontFamily: fontes.negrito, fontSize: 20, color: cores.roxo },
  contValor: { textAlign: 'center', fontFamily: fontes.negrito, fontSize: 16, color: cores.texto, paddingVertical: 0, height: 40 },
  contSufixo: { fontFamily: fontes.media, fontSize: 12, color: cores.texto2, marginLeft: -4 },
  seg: { flexDirection: 'row', backgroundColor: cores.cinza, borderRadius: raio.pill, padding: 3 },
  segItem: { flex: 1, height: 34, borderRadius: raio.pill, alignItems: 'center', justifyContent: 'center' },
  segAtivo: { backgroundColor: cores.cartao, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segTexto: { fontFamily: fontes.media, fontSize: 13, color: cores.texto2 },
  segTextoAtivo: { fontFamily: fontes.semi, color: cores.texto },
  numero: { flex: 1, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.m, padding: 12, gap: 2 },
  numeroValor: { fontFamily: fontes.titulo, fontSize: 22, color: cores.texto },
  numeroRotulo: { fontFamily: fontes.regular, fontSize: 11, color: cores.texto2 },
  secaoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  secaoTitulo: { fontFamily: fontes.titulo, fontSize: 17, color: cores.texto },
  secaoAcao: { fontFamily: fontes.semi, fontSize: 13, color: cores.roxo, padding: 4 },
});
