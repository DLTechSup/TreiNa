import listaPlanos from './planos.json';
import { porId } from './index';
import type { DiaPlano, ItemPlano, Perfil } from '@/db/banco';

export type ItemSugerido = { id: string; series: number; repeticoes: string; descanso: number };
export type DiaSugerido = { dia: number; nome: string; grupos: string[]; itens: ItemSugerido[] };
export type PlanoSugerido = {
  id: string;
  nome: string;
  descricao: string;
  local: string;
  objetivos: string[];
  nivel: string;
  mulher?: boolean;
  dias: DiaSugerido[];
};

export const planos = listaPlanos as PlanoSugerido[];
export const planoPorId = (id: string) => planos.find((p) => p.id === id);

/** Converte um plano sugerido para a semana do app. */
export function planoParaSemana(p: PlanoSugerido): DiaPlano[] {
  return p.dias.map((d) => ({
    dia: d.dia,
    nome: d.nome,
    grupos: d.grupos,
    itens: d.itens.map((i, n) => ({
      id: `${p.id}-${d.dia}-${n}`, exercicio_id: i.id, series: i.series, repeticoes: i.repeticoes, carga: null, descanso: i.descanso,
    })),
  }));
}

/** Pontua cada plano para a pessoa (objetivo, local, nível, sexo) e ordena: os primeiros são os recomendados. */
export function recomendar(perfil: Perfil) {
  const casa = perfil.local?.startsWith('Casa');
  const comHalteres = perfil.local === 'Casa com halteres';
  return planos
    .map((p) => {
      let pontos = 0;
      if (perfil.objetivo && p.objetivos.includes(perfil.objetivo)) pontos += 3;
      if (perfil.local) {
        if (p.local === perfil.local) pontos += 3;
        else if (casa && p.local.startsWith('Casa')) pontos += comHalteres ? 2 : 1;
        else if (!casa && p.local === 'Academia') pontos += 1;
        else pontos -= 2;
      }
      if (perfil.nivel && p.nivel === perfil.nivel) pontos += 1;
      if (perfil.nivel === 'Iniciante' && p.nivel !== 'Iniciante') pontos -= 1;
      if (p.mulher) pontos += perfil.sexo === 'Feminino' ? 2 : -2;
      if (perfil.dias_semana && Math.abs(p.dias.length - perfil.dias_semana) <= 1) pontos += 1;
      return { plano: p, pontos };
    })
    .sort((a, b) => b.pontos - a.pontos);
}

/** Primeiro número das repetições ("10-12" → 10, "12 cada perna" → 12). Tempo ("30 s", "2 min") → null. */
export function repsAlvo(repeticoes: string) {
  if (segundosAlvo(repeticoes) != null) return null;
  const m = repeticoes.match(/\d+/);
  return m ? Number(m[0]) : null;
}

/** Tempo da série em segundos quando as repetições são tempo ("30 s", "40 s cada lado", "2 min"). */
export function segundosAlvo(repeticoes: string) {
  const r = repeticoes.toLowerCase();
  const min = r.match(/^(\d+)\s*min/);
  if (min) return Number(min[1]) * 60;
  const seg = r.match(/^(\d+)\s*(s|seg)/);
  if (seg) return Number(seg[1]);
  return null;
}

/** Tempo estimado do dia, em minutos (execução + descansos). */
export function minutosEstimados(itens: Pick<ItemPlano, 'series' | 'repeticoes' | 'descanso'>[]) {
  let s = 0;
  for (const it of itens) {
    const porSerie = segundosAlvo(it.repeticoes) ?? 40;
    s += it.series * porSerie + Math.max(0, it.series - 1) * it.descanso + 60;
  }
  return Math.max(5, Math.round(s / 60 / 5) * 5);
}

/** Grupos musculares de uma lista de exercícios (na ordem em que aparecem). */
export function gruposDe(ids: string[]) {
  const g: string[] = [];
  for (const id of ids) {
    const e = porId(id);
    if (e && !g.includes(e.grupo)) g.push(e.grupo);
  }
  return g;
}
