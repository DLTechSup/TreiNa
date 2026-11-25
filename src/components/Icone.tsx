import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type NomeIcone =
  | 'inicio' | 'biblioteca' | 'treinos' | 'historico' | 'perfil'
  | 'busca' | 'estrela' | 'voltar' | 'info' | 'alerta' | 'check' | 'fechar' | 'seta' | 'mulher' | 'nuvem';

type Props = { nome: NomeIcone; tamanho?: number; cor?: string; preenchido?: boolean; espessura?: number };

/** Ícones de traço desenhados em SVG (os mesmos do design). */
export function Icone({ nome, tamanho = 24, cor = '#16161D', preenchido = false, espessura = 2 }: Props) {
  const p = { stroke: cor, strokeWidth: espessura, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24">
      {nome === 'inicio' && <Path {...p} d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />}
      {nome === 'biblioteca' && (
        <>
          <Rect {...p} x={3} y={3} width={7} height={7} rx={1.5} />
          <Rect {...p} x={14} y={3} width={7} height={7} rx={1.5} />
          <Rect {...p} x={3} y={14} width={7} height={7} rx={1.5} />
          <Rect {...p} x={14} y={14} width={7} height={7} rx={1.5} />
        </>
      )}
      {nome === 'treinos' && <Path {...p} d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12" />}
      {nome === 'historico' && (
        <>
          <Rect {...p} x={3} y={5} width={18} height={16} rx={2} />
          <Path {...p} d="M3 10h18M8 3v4M16 3v4" />
        </>
      )}
      {nome === 'perfil' && (
        <>
          <Circle {...p} cx={12} cy={8} r={4} />
          <Path {...p} d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </>
      )}
      {nome === 'busca' && (
        <>
          <Circle {...p} cx={11} cy={11} r={7} />
          <Path {...p} d="M20 20l-4-4" />
        </>
      )}
      {nome === 'estrela' && (
        <Path {...p} fill={preenchido ? cor : 'none'} d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />
      )}
      {nome === 'voltar' && <Path {...p} d="M15 5l-7 7 7 7" />}
      {nome === 'seta' && <Path {...p} d="M9 5l7 7-7 7" />}
      {nome === 'info' && (
        <>
          <Circle {...p} cx={12} cy={12} r={9} />
          <Path {...p} d="M12 11v6M12 7.5v.5" />
        </>
      )}
      {nome === 'alerta' && <Path {...p} d="M12 4l9 16H3zM12 10v4M12 17v.5" />}
      {nome === 'check' && <Path {...p} d="M5 12l5 5 9-10" />}
      {nome === 'fechar' && <Path {...p} d="M6 6l12 12M18 6L6 18" />}
      {nome === 'mulher' && (
        <>
          <Circle {...p} cx={12} cy={9} r={5} />
          <Path {...p} d="M12 14v7M9 18h6" />
        </>
      )}
      {nome === 'nuvem' && (
        <Path {...p} d="M7 19h10.5a4.5 4.5 0 0 0 .6-8.96A6 6 0 0 0 6.3 9.5 4.75 4.75 0 0 0 7 19z" />
      )}
    </Svg>
  );
}
