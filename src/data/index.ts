import listaExercicios from './exercicios.json';
import listaProgramas from './programas.json';

export type Exercicio = {
  id: string;
  nome: string;
  grupo: string;
  padrao: string;
  equipamento: string;
  tipo: string;
  medida: 'reps' | 'tempo' | string;
  secundarios: string[];
  passos: string[];
  erro: string;
  foco: string; // 'Glúteo' | 'Perna' | 'Posterior' | 'Ombro' | ''
};

export type ItemPrograma = { id: string; series: number; repeticoes: string; descanso: number };
export type DiaPrograma = { dia: string; titulo: string; exercicios: ItemPrograma[] };
export type Programa = { nome: string; local: string; dias: DiaPrograma[] };

export const exercicios = listaExercicios as Exercicio[];
export const programas = listaProgramas as Programa[];

const porIdMapa = new Map(exercicios.map((e) => [e.id, e]));
export const porId = (id: string) => porIdMapa.get(id);

/** Tira acentos e deixa minúsculo, para a busca achar "glúteo" digitando "gluteo". */
export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const indiceBusca = new Map(exercicios.map((e) => [e.id, normalizar(`${e.nome} ${e.grupo} ${e.padrao} ${e.equipamento}`)]));

function contar<T extends string>(valores: T[]) {
  const mapa = new Map<T, number>();
  valores.forEach((v) => mapa.set(v, (mapa.get(v) ?? 0) + 1));
  return [...mapa.entries()].map(([nome, total]) => ({ nome, total }));
}

export const grupos = contar(exercicios.map((e) => e.grupo)).sort((a, b) => b.total - a.total);
export const equipamentos = contar(exercicios.map((e) => e.equipamento)).sort((a, b) => b.total - a.total);
export const focos = ['Glúteo', 'Perna', 'Posterior', 'Ombro'].map((nome) => ({
  nome,
  total: exercicios.filter((e) => e.foco === nome).length,
}));
export const totalFocoFeminino = exercicios.filter((e) => e.foco).length;

export type Filtros = { busca?: string; grupo?: string; equipamento?: string; foco?: string; ids?: Set<string> };

export function filtrar({ busca, grupo, equipamento, foco, ids }: Filtros) {
  const termos = normalizar(busca ?? '').split(/\s+/).filter(Boolean);
  const lista = exercicios.filter((e) => {
    if (grupo && e.grupo !== grupo) return false;
    if (equipamento && e.equipamento !== equipamento) return false;
    if (foco === 'todos' && !e.foco) return false;
    if (foco && foco !== 'todos' && e.foco !== foco) return false;
    if (ids && !ids.has(e.id)) return false;
    const txt = indiceBusca.get(e.id)!;
    return termos.every((t) => txt.includes(t));
  });
  if (termos.length) {
    // nomes que começam com o que foi digitado aparecem primeiro
    const inicio = termos.join(' ');
    lista.sort((a, b) => Number(!normalizar(a.nome).startsWith(inicio)) - Number(!normalizar(b.nome).startsWith(inicio)));
  }
  return lista;
}

/** Agrupa uma lista em seções (por grupo muscular ou por padrão de movimento). */
export function emSecoes(lista: Exercicio[], chave: 'grupo' | 'padrao' | 'foco') {
  const mapa = new Map<string, Exercicio[]>();
  lista.forEach((e) => {
    const k = e[chave] || 'Outros';
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k)!.push(e);
  });
  return [...mapa.entries()]
    .map(([titulo, data]) => ({ titulo, data }))
    .sort((a, b) => b.data.length - a.data.length);
}

/** Variações: mesmo padrão de movimento; as do mesmo grupo vêm primeiro. */
export function variacoes(e: Exercicio) {
  return exercicios
    .filter((x) => x.padrao === e.padrao && x.id !== e.id)
    .sort((a, b) => Number(a.grupo !== e.grupo) - Number(b.grupo !== e.grupo));
}

export const nomeMedida = (e: Exercicio) => (e.medida === 'tempo' ? 'por tempo' : 'por repetições');
