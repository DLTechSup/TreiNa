// Datas no jeito brasileiro, sem depender do Intl (o Hermes do Android nem sempre tem).

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const SEMANA_LONGA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const dois = (n: number) => String(n).padStart(2, '0');

/** AAAA-MM-DD do dia local. */
export const chaveDia = (d: Date) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;

export const deChave = (s: string) => {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, m - 1, d);
};

/** "Terça, 25 de novembro" (+ ano se não for o atual). */
export function dataLonga(s: string) {
  const d = deChave(s);
  const ano = d.getFullYear() !== new Date().getFullYear() ? ` de ${d.getFullYear()}` : '';
  return `${SEMANA_LONGA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}${ano}`;
}

/** "25/11" */
export const dataCurta = (s: string) => {
  const d = deChave(s);
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}`;
};

/** "1h 05min", "42min", "50s" */
export function duracao(segundos: number | null | undefined) {
  const s = Math.max(0, Math.round(segundos ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${dois(m)}min`;
  if (m) return `${m}min`;
  return `${s}s`;
}

/** "01:25" (cronômetro) */
export function relogio(segundos: number) {
  const s = Math.max(0, Math.ceil(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${dois(m)}:${dois(s % 60)}` : `${dois(m)}:${dois(s % 60)}`;
}

/** "1.250 kg" / "62,5 kg" */
export function kg(valor: number | null | undefined) {
  if (valor == null) return '—';
  const inteiro = Math.round(valor * 10) / 10;
  const txt = Number.isInteger(inteiro)
    ? String(inteiro).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    : String(inteiro).replace('.', ',');
  return `${txt} kg`;
}

/** "90 s", "2 min", "1 min 30 s" */
export function descanso(seg: number) {
  if (!seg) return 'sem descanso';
  if (seg < 60) return `${seg} s`;
  const m = Math.floor(seg / 60);
  const r = seg % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}
