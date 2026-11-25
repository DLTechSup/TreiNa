import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useSQLiteContext, type SQLiteDatabase } from './sqlite';
import type { User } from '@supabase/supabase-js';

import { enderecoRetorno, nuvemConfigurada, supabase } from '@/lib/supabase';
import { TABELAS_BACKUP, aoAlterarDados, gravarMeta, lerMeta, useDados } from './banco';

/*
 * Backup automático na nuvem (Supabase) + login com Google.
 *
 * - Os dados continuam no celular (SQLite). A nuvem guarda uma cópia (1 linha por pessoa).
 * - Toda alteração agenda um envio em ~2,5 s; ao minimizar o app, envia na hora.
 * - Ao entrar: se o aparelho está vazio, traz da nuvem; se a nuvem está vazia, envia;
 *   se os dois têm dados diferentes, pergunta qual manter (nunca apaga sem perguntar).
 */

export type StatusNuvem = 'desligado' | 'verificando' | 'salvando' | 'ok' | 'offline' | 'erro' | 'conflito';
export type UsuarioNuvem = { id: string; email: string | null; nome: string | null; foto: string | null };

type Snapshot = {
  formato: number;
  app: string;
  gerado_em: string;
  tabelas: Record<string, Record<string, unknown>[]>;
};
type LinhaNuvem = { dados: Snapshot; atualizado_em: string; dispositivo: string | null };

type EstadoNuvem = {
  usuario: UsuarioNuvem | null;
  status: StatusNuvem;
  ultimoBackup: string | null;
  mensagem: string | null;
  conflito: { nuvemEm: string; dispositivo: string | null } | null;
  entrando: boolean;
  /** true depois da primeira conferência aparelho x nuvem desta conta (deu certo ou não). */
  sincronizado: boolean;
};

export type Conta = EstadoNuvem & {
  configurada: boolean;
  entrar: () => Promise<void>;
  sair: () => Promise<void>;
  backupAgora: () => Promise<void>;
  resolverConflito: (manter: 'nuvem' | 'aparelho') => Promise<void>;
};

const DISPOSITIVO = [Platform.OS === 'web' ? 'site' : Platform.OS, Device.modelName].filter(Boolean).join(' · ');
const VERSAO_APP = Constants.expoConfig?.version ?? null;

/* ---------------- dados locais <-> pacote de backup ---------------- */

async function gerarSnapshot(db: SQLiteDatabase): Promise<Snapshot> {
  const tabelas: Snapshot['tabelas'] = {};
  for (const t of TABELAS_BACKUP) tabelas[t] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${t}`);
  return { formato: 1, app: 'TreiNa', gerado_em: new Date().toISOString(), tabelas };
}

const estaVazio = (s: Snapshot) => Object.values(s.tabelas).every((linhas) => linhas.length === 0);

/** Texto estável (chaves em ordem) para comparar o conteúdo local com o da nuvem. */
function estavel(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(estavel).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] != null).sort().map((k) => `${JSON.stringify(k)}:${estavel(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

function mesmoConteudo(a: Snapshot, b: Snapshot | null | undefined) {
  if (!b?.tabelas) return false;
  return TABELAS_BACKUP.every((t) => {
    const x = (a.tabelas[t] ?? []).map(estavel).sort().join('|');
    const y = (b.tabelas[t] ?? []).map(estavel).sort().join('|');
    return x === y;
  });
}

function valorSql(v: unknown): string | number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return JSON.stringify(v);
}

async function aplicarSnapshot(db: SQLiteDatabase, s: Snapshot) {
  const tabelas = s?.tabelas ?? {};
  await db.withTransactionAsync(async () => {
    for (const t of TABELAS_BACKUP) {
      const linhas = tabelas[t];
      if (!Array.isArray(linhas)) continue; // backup antigo sem essa tabela: mantém a local
      const colunas = (await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name);
      await db.runAsync(`DELETE FROM ${t}`);
      for (const linha of linhas) {
        const chaves = Object.keys(linha).filter((k) => colunas.includes(k));
        if (!chaves.length) continue;
        await db.runAsync(
          `INSERT OR REPLACE INTO ${t} (${chaves.join(', ')}) VALUES (${chaves.map(() => '?').join(', ')})`,
          chaves.map((k) => valorSql(linha[k])),
        );
      }
    }
  });
}

/* ---------------- nuvem ---------------- */

async function baixar(uid: string): Promise<LinhaNuvem | null> {
  const { data, error } = await supabase!
    .from('backups')
    .select('dados, atualizado_em, dispositivo')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw error;
  return (data as LinhaNuvem | null) ?? null;
}

async function enviarNuvem(uid: string, dados: Snapshot): Promise<string> {
  const { data, error } = await supabase!
    .from('backups')
    .upsert({ user_id: uid, dados, versao_app: VERSAO_APP, dispositivo: DISPOSITIVO }, { onConflict: 'user_id' })
    .select('atualizado_em')
    .single();
  if (error) throw error;
  return (data as { atualizado_em: string }).atualizado_em;
}

const trocas = new Map<string, Promise<{ error: Error | null }>>();

/** Troca o código devolvido pelo Google por uma sessão (uma vez só, mesmo se chamado de dois lugares). */
export function trocarCodigo(code: string) {
  if (!supabase) return Promise.resolve({ error: new Error('Nuvem não configurada') });
  let p = trocas.get(code);
  if (!p) {
    p = supabase.auth.exchangeCodeForSession(code).then((r) => ({ error: r.error }));
    trocas.set(code, p);
  }
  return p;
}

function extrairUsuario(u: User): UsuarioNuvem {
  const m = (u.user_metadata ?? {}) as Record<string, unknown>;
  const txt = (v: unknown) => (typeof v === 'string' && v ? v : null);
  return {
    id: u.id,
    email: u.email ?? null,
    nome: txt(m.full_name) ?? txt(m.name),
    foto: txt(m.avatar_url) ?? txt(m.picture),
  };
}

const mensagemDe = (e: unknown) => String((e as { message?: string })?.message ?? e);

function descreverErro(e: unknown): { status: 'offline' | 'erro'; mensagem: string } {
  const err = e as { message?: string; code?: string };
  const msg = mensagemDe(e);
  if (/network|failed to fetch|fetch failed|timeout|timed out|aborted|internet/i.test(msg))
    return { status: 'offline', mensagem: 'Sem internet agora. O backup sai sozinho quando a conexão voltar.' };
  if (err?.code === '42P01' || err?.code === 'PGRST205' || /schema cache|relation .*backups/i.test(msg))
    return { status: 'erro', mensagem: 'A tabela de backup não existe no Supabase. Rode o arquivo supabase/backup.sql no SQL Editor.' };
  if (err?.code === '42501' || /row-level security|permission denied/i.test(msg))
    return { status: 'erro', mensagem: 'O Supabase negou o acesso. Rode de novo o supabase/backup.sql (ele cria as regras).' };
  return { status: 'erro', mensagem: `Não foi possível falar com a nuvem: ${msg}` };
}

/* ---------------- motor do backup (fora do React) ---------------- */

class MotorBackup {
  private estado: EstadoNuvem = {
    usuario: null, status: 'desligado', ultimoBackup: null, mensagem: null, conflito: null, entrando: false,
    sincronizado: false,
  };
  private ouvintes = new Set<() => void>();
  private uid: string | null = null;
  /** true depois de comparar aparelho x nuvem nesta sessão (antes disso nunca envia por cima). */
  private verificado = false;
  private seq = 0;
  private fila: Promise<unknown> = Promise.resolve();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private ultimaSinc = 0;

  constructor(private db: SQLiteDatabase, private recarregar: () => Promise<void>) {}

  assinar = (fn: () => void) => {
    this.ouvintes.add(fn);
    return () => { this.ouvintes.delete(fn); };
  };
  obter = () => this.estado;

  private mudar(p: Partial<EstadoNuvem>) {
    this.estado = { ...this.estado, ...p };
    this.ouvintes.forEach((fn) => fn());
  }

  iniciar() {
    lerMeta(this.db, 'backup_em').then((v) => this.mudar({ ultimoBackup: v })).catch(() => {});
    if (!supabase) return () => {};

    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (!sessao) {
        this.uid = null;
        this.verificado = false;
        this.limparTimer();
        this.mudar({ usuario: null, status: 'desligado', conflito: null, sincronizado: false });
        return;
      }
      const trocou = sessao.user.id !== this.uid;
      if (trocou) this.verificado = false;
      this.uid = sessao.user.id;
      this.mudar(trocou ? { usuario: extrairUsuario(sessao.user), sincronizado: false } : { usuario: extrairUsuario(sessao.user) });
      // Não chamar o Supabase dentro deste aviso (recomendação deles): agenda para logo depois.
      if (trocou || (evento === 'SIGNED_IN' && Date.now() - this.ultimaSinc > 30_000)) {
        setTimeout(() => this.sincronizar(), 0);
      }
    });

    const pararAlteracoes = aoAlterarDados(() => {
      this.seq++;
      this.agendar(2500);
    });

    const app = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        if (this.uid && Date.now() - this.ultimaSinc > 60_000) this.sincronizar();
      } else if (this.timer) {
        this.limparTimer();
        this.enviar();
      }
    });

    return () => {
      data.subscription.unsubscribe();
      pararAlteracoes();
      app.remove();
      this.limparTimer();
    };
  }

  private limparTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private agendar(ms: number) {
    if (!this.uid || this.estado.conflito) return;
    this.limparTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.enviar();
    }, ms);
  }

  private enfileirar<T>(tarefa: () => Promise<T>): Promise<T> {
    const p = this.fila.then(tarefa);
    this.fila = p.catch(() => {});
    return p;
  }

  private falhou(e: unknown) {
    const d = descreverErro(e);
    this.mudar({ status: d.status, mensagem: d.mensagem });
    if (d.status === 'offline') this.agendar(60_000);
  }

  private sincronizar() {
    return this.enfileirar(() => this.fazerSincronizacao())
      .catch((e) => this.falhou(e))
      .finally(() => { if (this.uid && !this.estado.sincronizado) this.mudar({ sincronizado: true }); });
  }

  private enviar() {
    return this.enfileirar(() => (this.verificado ? this.fazerEnvio() : this.fazerSincronizacao())).catch((e) =>
      this.falhou(e),
    );
  }

  private async fazerSincronizacao() {
    const uid = this.uid;
    if (!uid) return;
    this.mudar({ status: 'verificando', mensagem: null });
    const nuvem = await baixar(uid);
    const local = await gerarSnapshot(this.db);
    const dono = await lerMeta(this.db, 'dono');
    const pendente = (await lerMeta(this.db, 'pendente')) === '1';
    const backupEm = await lerMeta(this.db, 'backup_em');
    this.ultimaSinc = Date.now();
    if (uid !== this.uid) return;

    if (!nuvem) {
      this.verificado = true;
      if (!estaVazio(local)) return this.fazerEnvio();
      await gravarMeta(this.db, 'dono', uid);
      this.mudar({ status: 'ok', conflito: null });
      return;
    }
    if (estaVazio(local)) return this.restaurar(uid, nuvem, 'Seus dados foram trazidos da nuvem ✓');

    if (mesmoConteudo(local, nuvem.dados)) {
      await this.marcarSincronizado(uid, nuvem.atualizado_em);
      this.verificado = true;
      this.mudar({ status: 'ok', ultimoBackup: nuvem.atualizado_em, conflito: null });
      return;
    }

    const nuvemMudou = backupEm !== nuvem.atualizado_em;
    if (dono === uid) {
      if (!nuvemMudou) {
        this.verificado = true;
        if (pendente) return this.fazerEnvio();
        this.mudar({ status: 'ok', ultimoBackup: nuvem.atualizado_em, conflito: null });
        return;
      }
      if (!pendente) return this.restaurar(uid, nuvem, 'Atualizado com o backup de outro aparelho ✓');
    }
    // Aparelho e nuvem com dados diferentes: a pessoa escolhe.
    this.limparTimer();
    this.mudar({ status: 'conflito', conflito: { nuvemEm: nuvem.atualizado_em, dispositivo: nuvem.dispositivo } });
  }

  private async fazerEnvio() {
    const uid = this.uid;
    if (!uid) return;
    const seqInicio = this.seq;
    this.mudar({ status: 'salvando', mensagem: null });
    const snap = await gerarSnapshot(this.db);
    const em = await enviarNuvem(uid, snap);
    if (uid !== this.uid) return;
    await gravarMeta(this.db, 'dono', uid);
    await gravarMeta(this.db, 'backup_em', em);
    if (this.seq === seqInicio) await gravarMeta(this.db, 'pendente', '0');
    this.mudar({ status: 'ok', ultimoBackup: em, conflito: null });
  }

  private async restaurar(uid: string, nuvem: LinhaNuvem, aviso: string) {
    const local = await gerarSnapshot(this.db);
    // Guarda uma cópia do que havia no aparelho, por segurança.
    if (!estaVazio(local)) await gravarMeta(this.db, 'copia_antes_restaurar', JSON.stringify(local));
    await aplicarSnapshot(this.db, nuvem.dados);
    await this.marcarSincronizado(uid, nuvem.atualizado_em);
    this.verificado = true;
    await this.recarregar();
    this.mudar({ status: 'ok', ultimoBackup: nuvem.atualizado_em, conflito: null, mensagem: aviso });
  }

  private async marcarSincronizado(uid: string, em: string) {
    await gravarMeta(this.db, 'dono', uid);
    await gravarMeta(this.db, 'backup_em', em);
    await gravarMeta(this.db, 'pendente', '0');
  }

  /* ---- ações da tela ---- */

  entrar = async () => {
    if (!supabase || this.estado.entrando) return;
    this.mudar({ entrando: true, mensagem: null });
    try {
      const redirectTo = enderecoRetorno((c) => Linking.createURL(c));
      const queryParams = { prompt: 'select_account' };
      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, queryParams } });
        if (error) throw error;
        return; // a página vai para o Google e volta em /login
      }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams, skipBrowserRedirect: true },
      });
      if (error) throw error;
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type !== 'success') return; // fechou a janela do Google
      const { queryParams: volta } = Linking.parse(res.url);
      const erro = volta?.error_description ?? volta?.error;
      if (erro) throw new Error(String(erro));
      const code = volta?.code;
      if (typeof code !== 'string') throw new Error('o Google não devolveu o código de acesso.');
      const { error: e2 } = await trocarCodigo(code);
      if (e2) throw e2;
    } catch (e) {
      this.mudar({ mensagem: `Não foi possível entrar: ${mensagemDe(e)}` });
    } finally {
      this.mudar({ entrando: false });
    }
  };

  sair = async () => {
    if (!supabase) return;
    if (this.timer && this.verificado) {
      this.limparTimer();
      await this.enviar();
    }
    await this.fila;
    // scope local: sai só deste aparelho (os outros continuam conectados)
    await supabase.auth.signOut({ scope: 'local' });
    this.mudar({ mensagem: 'Você saiu da conta. Os dados continuam neste aparelho.' });
  };

  backupAgora = async () => {
    this.limparTimer();
    await this.enviar();
  };

  resolverConflito = async (manter: 'nuvem' | 'aparelho') => {
    await this.enfileirar(async () => {
      const uid = this.uid;
      if (!uid) return;
      const nuvem = manter === 'nuvem' ? await baixar(uid) : null;
      if (nuvem) return this.restaurar(uid, nuvem, 'Dados da nuvem aplicados ✓');
      this.verificado = true;
      this.mudar({ conflito: null });
      await this.fazerEnvio();
    }).catch((e) => this.falhou(e));
  };
}

/* ---------------- React ---------------- */

const Contexto = createContext<Conta | null>(null);

export function ContaProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { recarregar } = useDados();
  const [motor] = useState(() => new MotorBackup(db, recarregar));
  const estado = useSyncExternalStore(motor.assinar, motor.obter, motor.obter);

  useEffect(() => motor.iniciar(), [motor]);

  const valor = useMemo<Conta>(
    () => ({
      ...estado,
      configurada: nuvemConfigurada,
      entrar: motor.entrar,
      sair: motor.sair,
      backupAgora: motor.backupAgora,
      resolverConflito: motor.resolverConflito,
    }),
    [estado, motor],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useConta() {
  const c = useContext(Contexto);
  if (!c) throw new Error('useConta precisa estar dentro do ContaProvider');
  return c;
}

/* ---------------- datas ---------------- */

const dois = (n: number) => String(n).padStart(2, '0');

/** Lê "2026-11-25T14:32:10.123456+00:00" sem depender do Date.parse (o Hermes não lê microssegundos). */
function paraData(iso: string) {
  const m = iso.match(/^(\d{4})-(\d\d)-(\d\d)[T ](\d\d):(\d\d):(\d\d)(?:\.(\d+))?(Z|[+-]\d\d(?::?\d\d)?)?$/);
  if (!m) return null;
  const ms = m[7] ? Number(m[7].slice(0, 3).padEnd(3, '0')) : 0;
  let t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], ms);
  const fuso = m[8];
  if (fuso && fuso !== 'Z') {
    const sinal = fuso[0] === '-' ? -1 : 1;
    const [h, min] = [Number(fuso.slice(1, 3)), Number(fuso.slice(-2).length === 2 && fuso.length > 3 ? fuso.slice(-2) : '0')];
    t -= sinal * (h * 60 + min) * 60_000;
  }
  return new Date(t);
}

/** "hoje às 14:32", "ontem às 09:10" ou "24/11/2026 às 18:20". */
export function formatarQuando(iso: string | null) {
  const d = iso ? paraData(iso) : null;
  if (!d) return null;
  const hora = `${dois(d.getHours())}:${dois(d.getMinutes())}`;
  const hoje = new Date();
  const ontem = new Date(hoje.getTime() - 86_400_000);
  if (d.toDateString() === hoje.toDateString()) return `hoje às ${hora}`;
  if (d.toDateString() === ontem.toDateString()) return `ontem às ${hora}`;
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} às ${hora}`;
}
