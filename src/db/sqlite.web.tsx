import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';

/*
 * Versão SITE do banco: o mesmo SQLite (sql.js, WebAssembly), guardado no IndexedDB do navegador.
 * Imita só o pedaço do expo-sqlite que o app usa (getFirstAsync, getAllAsync, runAsync,
 * execAsync, withTransactionAsync), então banco.tsx e nuvem.tsx funcionam iguais no site.
 * No iPhone, com o atalho na Tela de Início, os dados ficam guardados no próprio aparelho.
 */

type Parametros = SqlValue[] | Record<string, SqlValue>;

function normalizar(args: unknown[]): Parametros | undefined {
  if (args.length === 0) return undefined;
  const a = args[0];
  if (args.length === 1 && a !== null && typeof a === 'object' && !(a instanceof Uint8Array)) {
    return a as Parametros;
  }
  return args as SqlValue[];
}

/* ---------------- IndexedDB (onde o arquivo do banco fica salvo) ---------------- */

const IDB_NOME = 'treina';
const IDB_LOJA = 'arquivos';

function idbAbrir(): Promise<IDBDatabase> {
  return new Promise((ok, falha) => {
    const req = indexedDB.open(IDB_NOME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_LOJA);
    req.onsuccess = () => ok(req.result);
    req.onerror = () => falha(req.error);
  });
}

async function idbLer(chave: string): Promise<Uint8Array | null> {
  const idb = await idbAbrir();
  return new Promise((ok, falha) => {
    const req = idb.transaction(IDB_LOJA, 'readonly').objectStore(IDB_LOJA).get(chave);
    req.onsuccess = () => ok(req.result ? new Uint8Array(req.result as ArrayBuffer) : null);
    req.onerror = () => falha(req.error);
  });
}

async function idbGravar(chave: string, bytes: Uint8Array) {
  const idb = await idbAbrir();
  return new Promise<void>((ok, falha) => {
    const tx = idb.transaction(IDB_LOJA, 'readwrite');
    tx.objectStore(IDB_LOJA).put(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), chave);
    tx.oncomplete = () => ok();
    tx.onerror = () => falha(tx.error);
  });
}

/* ---------------- banco ---------------- */

export class SQLiteDatabase {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private emTransacao = false;

  constructor(private db: Database, private nome: string) {
    if (typeof document !== 'undefined') {
      // Ao fechar/minimizar o site, grava na hora.
      const gravarJa = () => { if (this.timer) this.salvarAgora(); };
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') gravarJa(); });
      window.addEventListener('pagehide', gravarJa);
    }
  }

  private agendarSalvar() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.salvarAgora(), 150);
  }

  salvarAgora() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.emTransacao) return this.agendarSalvar();
    return idbGravar(this.nome, this.db.export()).catch((e) => console.warn('TreiNa: falha ao gravar no navegador', e));
  }

  async getAllAsync<T>(sql: string, ...args: unknown[]): Promise<T[]> {
    const st = this.db.prepare(sql);
    try {
      const p = normalizar(args);
      if (p) st.bind(p);
      const linhas: T[] = [];
      while (st.step()) linhas.push(st.getAsObject() as T);
      return linhas;
    } finally {
      st.free();
    }
  }

  async getFirstAsync<T>(sql: string, ...args: unknown[]): Promise<T | null> {
    const linhas = await this.getAllAsync<T>(sql, ...args);
    return linhas[0] ?? null;
  }

  async runAsync(sql: string, ...args: unknown[]) {
    const p = normalizar(args);
    this.db.run(sql, p);
    const changes = this.db.getRowsModified();
    const r = this.db.exec('SELECT last_insert_rowid()');
    const lastInsertRowId = Number(r[0]?.values[0]?.[0] ?? 0);
    this.agendarSalvar();
    return { changes, lastInsertRowId };
  }

  async execAsync(sql: string) {
    this.db.exec(sql);
    this.agendarSalvar();
  }

  async withTransactionAsync(tarefa: () => Promise<void>) {
    this.db.exec('BEGIN');
    this.emTransacao = true;
    try {
      await tarefa();
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    } finally {
      this.emTransacao = false;
      this.agendarSalvar();
    }
  }
}

const abertos = new Map<string, Promise<SQLiteDatabase>>();

function abrir(nome: string, onInit?: (db: SQLiteDatabase) => Promise<void>) {
  let p = abertos.get(nome);
  if (!p) {
    p = (async () => {
      const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
      const SQL = await initSqlJs({ locateFile: (arquivo: string) => `${base}/${arquivo}` });
      const bytes = await idbLer(nome);
      const db = new SQLiteDatabase(bytes ? new SQL.Database(bytes) : new SQL.Database(), nome);
      if (onInit) await onInit(db);
      await db.salvarAgora();
      // Pede ao navegador para não apagar os dados sozinho (iPhone/Android com atalho na tela).
      navigator.storage?.persist?.().catch(() => {});
      return db;
    })();
    abertos.set(nome, p);
  }
  return p;
}

const Contexto = createContext<SQLiteDatabase | null>(null);

export function SQLiteProvider({
  databaseName, onInit, children,
}: { databaseName: string; onInit?: (db: SQLiteDatabase) => Promise<void>; children: ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    abrir(databaseName, onInit)
      .then((d) => { if (vivo) setDb(d); })
      .catch((e) => { if (vivo) setErro(String(e?.message ?? e)); });
    return () => { vivo = false; };
  }, [databaseName, onInit]);

  if (erro) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 16, textAlign: 'center' }}>
          Não foi possível abrir os dados do TreiNa neste navegador.{'\n'}
          Se estiver em aba anônima/privada, abra numa aba normal.{'\n\n'}({erro})
        </Text>
      </View>
    );
  }
  if (!db) return null;
  return <Contexto.Provider value={db}>{children}</Contexto.Provider>;
}

export function useSQLiteContext() {
  const db = useContext(Contexto);
  if (!db) throw new Error('useSQLiteContext precisa estar dentro do SQLiteProvider');
  return db;
}
