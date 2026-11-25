import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from './sqlite';

/* ------------------------------------------------------------------ */
/* Banco local (fica só no celular)                                    */
/* ------------------------------------------------------------------ */

const VERSAO = 2;

/** Tabelas que vão para o backup na nuvem (as próximas fases acrescentam treinos, sessões...). */
export const TABELAS_BACKUP = ['perfil', 'favoritos'] as const;

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
  // Próximas fases: treinos, sessões e histórico entram aqui como versão 3, 4...
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

/* ------------------------------------------------------------------ */
/* Perfil e favoritos compartilhados entre as telas                    */
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

type Dados = {
  pronto: boolean;
  perfil: Perfil;
  salvarPerfil: (p: Perfil) => Promise<void>;
  favoritos: Set<string>;
  alternarFavorito: (id: string) => Promise<void>;
  /** Relê tudo do banco (depois de restaurar um backup). */
  recarregar: () => Promise<void>;
};

const Contexto = createContext<Dados | null>(null);

function DadosProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [pronto, setPronto] = useState(false);
  const [perfil, setPerfil] = useState<Perfil>(perfilVazio);
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());

  const recarregar = useCallback(async () => {
    const p = await db.getFirstAsync<Perfil>('SELECT * FROM perfil WHERE id = 1');
    setPerfil(p ? { ...perfilVazio, ...p, nome: p.nome ?? '' } : perfilVazio);
    const favs = await db.getAllAsync<{ exercicio_id: string }>('SELECT exercicio_id FROM favoritos');
    setFavoritos(new Set(favs.map((f) => f.exercicio_id)));
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

  const valor = useMemo(
    () => ({ pronto, perfil, salvarPerfil, favoritos, alternarFavorito, recarregar }),
    [pronto, perfil, salvarPerfil, favoritos, alternarFavorito, recarregar],
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
