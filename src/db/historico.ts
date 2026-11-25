import type { SQLiteDatabase } from './sqlite';

/* Consultas do histórico de treinos (tudo calculado a partir de sessoes + sessao_series). */

export type ResumoSessao = {
  id: string;
  data: string;
  nome: string | null;
  iniciado_em: string;
  duracao_s: number | null;
  exercicios: number;
  series: number;
  volume: number;
};

const SQL_RESUMO = `
  SELECT s.id, s.data, s.nome, s.iniciado_em, s.duracao_s,
         COUNT(DISTINCT ss.exercicio_id) AS exercicios,
         COUNT(ss.id) AS series,
         COALESCE(SUM(COALESCE(ss.carga, 0) * COALESCE(ss.repeticoes, 0)), 0) AS volume
  FROM sessoes s LEFT JOIN sessao_series ss ON ss.sessao_id = s.id`;

/** Sessões entre duas datas (AAAA-MM-DD, inclusive), mais recentes primeiro. */
export function sessoesEntre(db: SQLiteDatabase, de: string, ate: string) {
  return db.getAllAsync<ResumoSessao>(
    `${SQL_RESUMO} WHERE s.data BETWEEN ? AND ? GROUP BY s.id ORDER BY s.data DESC, s.iniciado_em DESC`,
    de, ate,
  );
}

export function todasSessoes(db: SQLiteDatabase, limite = 200) {
  return db.getAllAsync<ResumoSessao>(`${SQL_RESUMO} GROUP BY s.id ORDER BY s.data DESC, s.iniciado_em DESC LIMIT ${limite}`);
}

export type SerieRegistro = { exercicio_id: string; ordem: number; serie: number; repeticoes: number | null; carga: number | null };

export async function detalheSessao(db: SQLiteDatabase, id: string) {
  const sessao = await db.getFirstAsync<ResumoSessao & { concluido_em: string | null }>(
    `${SQL_RESUMO} WHERE s.id = ? GROUP BY s.id`, id,
  );
  const series = await db.getAllAsync<SerieRegistro>(
    'SELECT exercicio_id, ordem, serie, repeticoes, carga FROM sessao_series WHERE sessao_id = ? ORDER BY ordem, serie', id,
  );
  return sessao ? { ...sessao, registros: series } : null;
}

/** Datas (AAAA-MM-DD) com treino num intervalo. */
export async function datasComTreino(db: SQLiteDatabase, de: string, ate: string) {
  const l = await db.getAllAsync<{ data: string }>('SELECT DISTINCT data FROM sessoes WHERE data BETWEEN ? AND ?', de, ate);
  return new Set(l.map((x) => x.data));
}

/** Por mês do ano: quantos treinos e quanto tempo. */
export async function resumoDoAno(db: SQLiteDatabase, ano: number) {
  const l = await db.getAllAsync<{ mes: string; treinos: number; segundos: number }>(
    `SELECT substr(data, 6, 2) AS mes, COUNT(*) AS treinos, COALESCE(SUM(duracao_s), 0) AS segundos
     FROM sessoes WHERE substr(data, 1, 4) = ? GROUP BY mes`,
    String(ano),
  );
  const meses = Array.from({ length: 12 }, () => ({ treinos: 0, segundos: 0 }));
  for (const m of l) meses[Number(m.mes) - 1] = { treinos: m.treinos, segundos: m.segundos };
  return meses;
}

const umDia = 86_400_000;
const paraData = (s: string) => {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, m - 1, d);
};

/** Sequência de dias seguidos com treino (atual, até hoje ou ontem) e a melhor de todas. */
export async function sequencias(db: SQLiteDatabase, hoje: string) {
  const l = await db.getAllAsync<{ data: string }>('SELECT DISTINCT data FROM sessoes ORDER BY data');
  if (!l.length) return { atual: 0, melhor: 0, total: 0 };
  let melhor = 1;
  let corrida = 1;
  for (let i = 1; i < l.length; i++) {
    const diff = Math.round((paraData(l[i].data).getTime() - paraData(l[i - 1].data).getTime()) / umDia);
    corrida = diff === 1 ? corrida + 1 : 1;
    melhor = Math.max(melhor, corrida);
  }
  const ultima = paraData(l[l.length - 1].data);
  const desdeUltima = Math.round((paraData(hoje).getTime() - ultima.getTime()) / umDia);
  const atual = desdeUltima <= 1 ? corrida : 0;
  return { atual, melhor, total: l.length };
}

export type ResumoExercicio = {
  exercicio_id: string;
  sessoes: number;
  ultima_data: string;
  maior_carga: number | null;
  maior_reps: number | null;
};

/** Exercícios já feitos, com recorde de carga e de repetições. */
export function exerciciosFeitos(db: SQLiteDatabase) {
  return db.getAllAsync<ResumoExercicio>(
    `SELECT ss.exercicio_id, COUNT(DISTINCT ss.sessao_id) AS sessoes, MAX(s.data) AS ultima_data,
            MAX(ss.carga) AS maior_carga, MAX(ss.repeticoes) AS maior_reps
     FROM sessao_series ss JOIN sessoes s ON s.id = ss.sessao_id
     GROUP BY ss.exercicio_id ORDER BY ultima_data DESC, sessoes DESC`,
  );
}

export type PontoEvolucao = {
  sessao_id: string;
  data: string;
  maior_carga: number | null;
  reps_na_maior: number | null;
  maior_reps: number | null;
  series: number;
  volume: number;
};

/** Evolução de um exercício, sessão a sessão (da mais antiga para a mais recente). */
export async function evolucaoExercicio(db: SQLiteDatabase, exercicioId: string) {
  const linhas = await db.getAllAsync<{ sessao_id: string; data: string; repeticoes: number | null; carga: number | null }>(
    `SELECT ss.sessao_id, s.data, ss.repeticoes, ss.carga
     FROM sessao_series ss JOIN sessoes s ON s.id = ss.sessao_id
     WHERE ss.exercicio_id = ? ORDER BY s.data, s.iniciado_em, ss.serie`,
    exercicioId,
  );
  const mapa = new Map<string, PontoEvolucao>();
  for (const l of linhas) {
    let p = mapa.get(l.sessao_id);
    if (!p) {
      p = { sessao_id: l.sessao_id, data: l.data, maior_carga: null, reps_na_maior: null, maior_reps: null, series: 0, volume: 0 };
      mapa.set(l.sessao_id, p);
    }
    p.series++;
    p.volume += (l.carga ?? 0) * (l.repeticoes ?? 0);
    if (l.carga != null && (p.maior_carga == null || l.carga > p.maior_carga || (l.carga === p.maior_carga && (l.repeticoes ?? 0) > (p.reps_na_maior ?? 0)))) {
      p.maior_carga = l.carga;
      p.reps_na_maior = l.repeticoes;
    }
    if (l.repeticoes != null) p.maior_reps = Math.max(p.maior_reps ?? 0, l.repeticoes);
  }
  return [...mapa.values()];
}

/** Recordes pessoais de um exercício (a partir da evolução). */
export function recordes(pontos: PontoEvolucao[]) {
  let carga: { valor: number; reps: number | null; data: string } | null = null;
  let reps: { valor: number; data: string } | null = null;
  let volume: { valor: number; data: string } | null = null;
  for (const p of pontos) {
    if (p.maior_carga != null && p.maior_carga > 0 && (!carga || p.maior_carga > carga.valor)) carga = { valor: p.maior_carga, reps: p.reps_na_maior, data: p.data };
    if (p.maior_reps != null && (!reps || p.maior_reps > reps.valor)) reps = { valor: p.maior_reps, data: p.data };
    if (p.volume > 0 && (!volume || p.volume > volume.valor)) volume = { valor: p.volume, data: p.data };
  }
  return { carga, reps, volume };
}

/** Última carga usada num exercício (para já sugerir no treino). */
export async function ultimaCarga(db: SQLiteDatabase, exercicioId: string) {
  const l = await db.getFirstAsync<{ carga: number | null; repeticoes: number | null }>(
    `SELECT ss.carga, ss.repeticoes FROM sessao_series ss JOIN sessoes s ON s.id = ss.sessao_id
     WHERE ss.exercicio_id = ? AND ss.carga IS NOT NULL ORDER BY s.data DESC, s.iniciado_em DESC, ss.serie DESC LIMIT 1`,
    exercicioId,
  );
  return l ?? null;
}

/** Maior carga já feita em cada exercício (para avisar recorde novo no fim do treino). */
export async function maioresCargas(db: SQLiteDatabase, ids: string[]) {
  const mapa = new Map<string, number>();
  for (const id of ids) {
    const l = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(carga) AS m FROM sessao_series WHERE exercicio_id = ?', id);
    if (l?.m != null) mapa.set(id, l.m);
  }
  return mapa;
}
