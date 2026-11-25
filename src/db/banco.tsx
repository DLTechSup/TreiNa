import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from './sqlite';

/* ------------------------------------------------------------------ */
/* Banco local (fica no celular / navegador)                           */
/* ------------------------------------------------------------------ */

const VERSAO = 4;

/** Tabelas que vão para o backup na nuvem. */
export const TABELAS_BACKUP = ['perfil', 'favoritos', 'plano_dias', 'plano_itens', 'sessoes', 'sessao_series', 'sessao_notas'] as const;

async function migrar(db: SQLiteDatabase) {
  const linha = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let versao = linha?.user_version ?? 0;
  if (versao >= VERSAO) return;
  if (versao === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS perfil (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        nome TEXT, idade INTEGER, sexo TEXT, peso REAL, altura REAL,
        objetivo TEXT, nivel TEXT, dias_semana INTEGER, tempo_treino INTEGER, local TEXT,
        atualizado_em TEXT
      );
      CREATE TABLE IF NOT EXISTS favoritos (
        exercicio_id TEXT PRIMARY KEY NOT NULL,
        criado_em TEXT NOT NULL
      );
    `);
    versao = 1;
  }
  if (versao === 1) {
    // Controle do backup: quem é o dono dos dados, se há mudança sem backup, quando foi o último.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS meta (chave TEXT PRIMARY KEY NOT NULL, valor TEXT);
      INSERT OR REPLACE INTO meta (chave, valor) VALUES ('pendente',
        CASE WHEN EXISTS (SELECT 1 FROM perfil) OR EXISTS (SELECT 1 FROM favoritos) THEN '1' ELSE '0' END);
    `);
    versao = 2;
  }
  if (versao === 2) {
    // Treino da semana (dia 1 = segunda ... 7 = domingo) e histórico de treinos feitos.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS plano_dias (
        dia INTEGER PRIMARY KEY CHECK (dia BETWEEN 1 AND 7),
        nome TEXT, grupos TEXT, atualizado_em TEXT
      );
      CREATE TABLE IF NOT EXISTS plano_itens (
        id TEXT PRIMARY KEY NOT NULL, dia INTEGER NOT NULL, ordem INTEGER NOT NULL,
        exercicio_id TEXT NOT NULL, series INTEGER NOT NULL, repeticoes TEXT NOT NULL,
        carga REAL, descanso INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS plano_itens_dia ON plano_itens (dia, ordem);
      CREATE TABLE IF NOT EXISTS sessoes (
        id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, dia_semana INTEGER, nome TEXT,
        iniciado_em TEXT NOT NULL, concluido_em TEXT, duracao_s INTEGER
      );
      CREATE INDEX IF NOT EXISTS sessoes_data ON sessoes (data);
      CREATE TABLE IF NOT EXISTS sessao_series (
        id TEXT PRIMARY KEY NOT NULL, sessao_id TEXT NOT NULL, exercicio_id TEXT NOT NULL,
        ordem INTEGER NOT NULL, serie INTEGER NOT NULL, repeticoes INTEGER, carga REAL, feito_em TEXT
      );
      CREATE INDEX IF NOT EXISTS sessao_series_sessao ON sessao_series (sessao_id);
      CREATE INDEX IF NOT EXISTS sessao_series_exercicio ON sessao_series (exercicio_id);
    `);
    versao = 3;
  }
  if (versao === 3) {
    // Observações: uma fixa em cada exercício do plano e as anotadas em cada treino (progressão de carga)
    const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(plano_itens)');
    if (!cols.some((c) => c.name === 'observacao')) await db.execAsync('ALTER TABLE plano_itens ADD COLUMN observacao TEXT');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sessao_notas (
        id TEXT PRIMARY KEY NOT NULL, sessao_id TEXT NOT NULL, exercicio_id TEXT NOT NULL,
        ordem INTEGER NOT NULL, texto TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessao_notas_sessao ON sessao_notas (sessao_id);
      CREATE INDEX IF NOT EXISTS sessao_notas_exercicio ON sessao_notas (exercicio_id);
    `);
    versao = 4;
  }
  await db.execAsync(`PRAGMA user_version = ${versao}`);
}

export function BancoProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName="treina.db" onInit={migrar}>
      <DadosProvider>{children}</DadosProvider>
    </SQLiteProvider>
  );
}

/* ------------------------------------------------------------------ */
/* Controle de alterações (usado pelo backup automático)               */
/* ------------------------------------------------------------------ */

export async function lerMeta(db: SQLiteDatabase, chave: string) {
  const l = await db.getFirstAsync<{ valor: string | null }>('SELECT valor FROM meta WHERE chave = ?', chave);
  return l?.valor ?? null;
}

export async function gravarMeta(db: SQLiteDatabase, chave: string, valor: string | null) {
  await db.runAsync('INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)', chave, valor);
}

const ouvintes = new Set<() => void>();

/** Avisa quando algum dado da pessoa muda (para agendar o backup). Retorna a função de cancelar. */
export function aoAlterarDados(fn: () => void) {
  ouvintes.add(fn);
  return () => { ouvintes.delete(fn); };
}

async function registrarAlteracao(db: SQLiteDatabase) {
  await gravarMeta(db, 'pendente', '1');
  ouvintes.forEach((fn) => fn());
}

export const novoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type Perfil = {
  nome: string;
  idade: number | null;
  sexo: string | null;
  peso: number | null;
  altura: number | null;
  objetivo: string | null;
  nivel: string | null;
  dias_semana: number | null;
  tempo_treino: number | null;
  local: string | null;
};

export const perfilVazio: Perfil = {
  nome: '', idade: null, sexo: null, peso: null, altura: null,
  objetivo: null, nivel: null, dias_semana: null, tempo_treino: null, local: null,
};

export type ItemPlano = {
  id: string;
  exercicio_id: string;
  series: number;
  repeticoes: string;
  carga: number | null;
  descanso: number;
  /** Anotação da pessoa (ex.: "subir para 12 kg na próxima"). */
  observacao?: string | null;
};

export type DiaPlano = { dia: number; nome: string; grupos: string[]; itens: ItemPlano[] };

/** Série feita no treino (vai para o histórico). */
export type SerieFeita = { exercicio_id: string; ordem: number; serie: number; repeticoes: number | null; carga: number | null; feito_em: string };

export type SessaoNova = {
  data: string; // AAAA-MM-DD (dia local)
  dia_semana: number | null;
  nome: string;
  iniciado_em: string;
  concluido_em: string;
  duracao_s: number;
  series: SerieFeita[];
  /** Observações escritas no treino. `item_id` = exercício do plano, que guarda a última observação para a próxima vez. */
  notas?: { exercicio_id: string; ordem: number; texto: string; item_id?: string }[];
};

export const NOMES_DIAS = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const SIGLAS_DIAS = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
/** Dia da semana do TreiNa (1 = segunda ... 7 = domingo) de uma data. */
export const diaDaSemana = (d: Date) => ((d.getDay() + 6) % 7) + 1;

const semanaVazia = (): DiaPlano[] => [1, 2, 3, 4, 5, 6, 7].map((dia) => ({ dia, nome: '', grupos: [], itens: [] }));

/* ------------------------------------------------------------------ */
/* Contexto com os dados da pessoa                                     */
/* ------------------------------------------------------------------ */

type Dados = {
  pronto: boolean;
  perfil: Perfil;
  salvarPerfil: (p: Perfil) => Promise<void>;
  favoritos: Set<string>;
  alternarFavorito: (id: string) => Promise<void>;
  /** Os 7 dias da semana (índice 0 = segunda). */
  semana: DiaPlano[];
  salvarDia: (d: DiaPlano) => Promise<void>;
  /** Troca a semana inteira (aceitar um plano sugerido). Dias que não vierem ficam de descanso. */
  aplicarSemana: (dias: DiaPlano[]) => Promise<void>;
  registrarSessao: (s: SessaoNova) => Promise<string>;
  /** Guarda a observação de um exercício do plano (aparece no próximo treino). */
  salvarObservacao: (itemId: string, texto: string) => Promise<void>;
  apagarSessao: (id: string) => Promise<void>;
  /** Sobe a cada treino salvo/apagado: as telas do histórico usam para recarregar. */
  versaoHistorico: number;
  /** Relê tudo do banco (depois de restaurar um backup). */
  recarregar: () => Promise<void>;
};

const Contexto = createContext<Dados | null>(null);

async function lerSemana(db: SQLiteDatabase): Promise<DiaPlano[]> {
  const semana = semanaVazia();
  const dias = await db.getAllAsync<{ dia: number; nome: string | null; grupos: string | null }>('SELECT dia, nome, grupos FROM plano_dias');
  for (const d of dias) {
    const alvo = semana[d.dia - 1];
    if (!alvo) continue;
    alvo.nome = d.nome ?? '';
    try { alvo.grupos = d.grupos ? JSON.parse(d.grupos) : []; } catch { alvo.grupos = []; }
  }
  const itens = await db.getAllAsync<ItemPlano & { dia: number }>(
    'SELECT id, dia, exercicio_id, series, repeticoes, carga, descanso, observacao FROM plano_itens ORDER BY dia, ordem',
  );
  for (const it of itens) {
    semana[it.dia - 1]?.itens.push({
      id: it.id, exercicio_id: it.exercicio_id, series: it.series, repeticoes: String(it.repeticoes),
      carga: it.carga, descanso: it.descanso, observacao: it.observacao ?? null,
    });
  }
  return semana;
}

async function gravarDia(db: SQLiteDatabase, d: DiaPlano) {
  await db.runAsync('DELETE FROM plano_itens WHERE dia = ?', d.dia);
  if (!d.itens.length && !d.nome.trim()) {
    await db.runAsync('DELETE FROM plano_dias WHERE dia = ?', d.dia);
    return;
  }
  await db.runAsync(
    `INSERT OR REPLACE INTO plano_dias (dia, nome, grupos, atualizado_em) VALUES (?, ?, ?, datetime('now'))`,
    d.dia, d.nome.trim(), JSON.stringify(d.grupos),
  );
  let ordem = 0;
  for (const it of d.itens) {
    await db.runAsync(
      'INSERT OR REPLACE INTO plano_itens (id, dia, ordem, exercicio_id, series, repeticoes, carga, descanso, observacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      it.id || novoId(), d.dia, ordem++, it.exercicio_id, it.series, it.repeticoes, it.carga, it.descanso, it.observacao?.trim() || null,
    );
  }
}

function DadosProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [pronto, setPronto] = useState(false);
  const [perfil, setPerfil] = useState<Perfil>(perfilVazio);
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [semana, setSemana] = useState<DiaPlano[]>(semanaVazia);
  const [versaoHistorico, setVersaoHistorico] = useState(0);

  const recarregar = useCallback(async () => {
    const p = await db.getFirstAsync<Perfil>('SELECT * FROM perfil WHERE id = 1');
    setPerfil(p ? { ...perfilVazio, ...p, nome: p.nome ?? '' } : perfilVazio);
    const favs = await db.getAllAsync<{ exercicio_id: string }>('SELECT exercicio_id FROM favoritos');
    setFavoritos(new Set(favs.map((f) => f.exercicio_id)));
    setSemana(await lerSemana(db));
    setVersaoHistorico((v) => v + 1);
    setPronto(true);
  }, [db]);

  useEffect(() => { recarregar(); }, [recarregar]);

  const salvarPerfil = useCallback(
    async (p: Perfil) => {
      await db.runAsync(
        `INSERT INTO perfil (id, nome, idade, sexo, peso, altura, objetivo, nivel, dias_semana, tempo_treino, local, atualizado_em)
         VALUES (1, $nome, $idade, $sexo, $peso, $altura, $objetivo, $nivel, $dias, $tempo, $local, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET nome=$nome, idade=$idade, sexo=$sexo, peso=$peso, altura=$altura,
           objetivo=$objetivo, nivel=$nivel, dias_semana=$dias, tempo_treino=$tempo, local=$local, atualizado_em=datetime('now')`,
        {
          $nome: p.nome.trim(), $idade: p.idade, $sexo: p.sexo, $peso: p.peso, $altura: p.altura,
          $objetivo: p.objetivo, $nivel: p.nivel, $dias: p.dias_semana, $tempo: p.tempo_treino, $local: p.local,
        },
      );
      setPerfil({ ...p, nome: p.nome.trim() });
      await registrarAlteracao(db);
    },
    [db],
  );

  const alternarFavorito = useCallback(
    async (id: string) => {
      const ja = favoritos.has(id);
      const novo = new Set(favoritos);
      if (ja) {
        novo.delete(id);
        await db.runAsync('DELETE FROM favoritos WHERE exercicio_id = ?', id);
      } else {
        novo.add(id);
        await db.runAsync("INSERT OR IGNORE INTO favoritos (exercicio_id, criado_em) VALUES (?, datetime('now'))", id);
      }
      setFavoritos(novo);
      await registrarAlteracao(db);
    },
    [db, favoritos],
  );

  const salvarDia = useCallback(
    async (d: DiaPlano) => {
      await db.withTransactionAsync(() => gravarDia(db, d));
      setSemana(await lerSemana(db));
      await registrarAlteracao(db);
    },
    [db],
  );

  const aplicarSemana = useCallback(
    async (dias: DiaPlano[]) => {
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM plano_itens');
        await db.runAsync('DELETE FROM plano_dias');
        for (const d of dias) await gravarDia(db, { ...d, itens: d.itens.map((i) => ({ ...i, id: novoId() })) });
      });
      setSemana(await lerSemana(db));
      await registrarAlteracao(db);
    },
    [db],
  );

  const registrarSessao = useCallback(
    async (s: SessaoNova) => {
      const id = novoId();
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          'INSERT INTO sessoes (id, data, dia_semana, nome, iniciado_em, concluido_em, duracao_s) VALUES (?, ?, ?, ?, ?, ?, ?)',
          id, s.data, s.dia_semana, s.nome, s.iniciado_em, s.concluido_em, s.duracao_s,
        );
        for (const se of s.series) {
          await db.runAsync(
            'INSERT INTO sessao_series (id, sessao_id, exercicio_id, ordem, serie, repeticoes, carga, feito_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            novoId(), id, se.exercicio_id, se.ordem, se.serie, se.repeticoes, se.carga, se.feito_em,
          );
        }
        for (const n of s.notas ?? []) {
          const texto = n.texto.trim();
          if (texto) {
            await db.runAsync('INSERT INTO sessao_notas (id, sessao_id, exercicio_id, ordem, texto) VALUES (?, ?, ?, ?, ?)', novoId(), id, n.exercicio_id, n.ordem, texto);
          }
          // A observação fica no exercício do plano para aparecer no próximo treino
          if (n.item_id) await db.runAsync('UPDATE plano_itens SET observacao = ? WHERE id = ?', texto || null, n.item_id);
        }
      });
      if (s.notas?.some((n) => n.item_id)) setSemana(await lerSemana(db));
      setVersaoHistorico((v) => v + 1);
      await registrarAlteracao(db);
      return id;
    },
    [db],
  );

  const salvarObservacao = useCallback(
    async (itemId: string, texto: string) => {
      await db.runAsync('UPDATE plano_itens SET observacao = ? WHERE id = ?', texto.trim() || null, itemId);
      setSemana(await lerSemana(db));
      await registrarAlteracao(db);
    },
    [db],
  );

  const apagarSessao = useCallback(
    async (id: string) => {
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM sessao_series WHERE sessao_id = ?', id);
        await db.runAsync('DELETE FROM sessao_notas WHERE sessao_id = ?', id);
        await db.runAsync('DELETE FROM sessoes WHERE id = ?', id);
      });
      setVersaoHistorico((v) => v + 1);
      await registrarAlteracao(db);
    },
    [db],
  );

  const valor = useMemo(
    () => ({
      pronto, perfil, salvarPerfil, favoritos, alternarFavorito, semana, salvarDia, aplicarSemana,
      registrarSessao, salvarObservacao, apagarSessao, versaoHistorico, recarregar,
    }),
    [pronto, perfil, salvarPerfil, favoritos, alternarFavorito, semana, salvarDia, aplicarSemana,
      registrarSessao, salvarObservacao, apagarSessao, versaoHistorico, recarregar],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDados() {
  const c = useContext(Contexto);
  if (!c) throw new Error('useDados precisa estar dentro do BancoProvider');
  return c;
}

/** IMC e classificação (OMS). Retorna null se faltar peso ou altura. */
export function calcularImc(peso: number | null, alturaCm: number | null) {
  if (!peso || !alturaCm) return null;
  const imc = peso / (alturaCm / 100) ** 2;
  const faixa =
    imc < 18.5 ? 'abaixo do peso' : imc < 25 ? 'normal' : imc < 30 ? 'sobrepeso' : 'obesidade';
  return { valor: imc, faixa };
}
