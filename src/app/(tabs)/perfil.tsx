import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { CartaoNuvem } from '@/components/CartaoNuvem';
import { CartaoVideos } from '@/components/CartaoVideos';
import { Icone } from '@/components/Icone';
import { Botao, Chip, Titulo } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { calcularImc, perfilVazio, useDados, type Perfil } from '@/db/banco';

const OBJETIVOS = ['Emagrecer', 'Ganhar massa', 'Condicionamento', 'Mobilidade'];
const NIVEIS = ['Iniciante', 'Intermediário', 'Avançado'];
const SEXOS = ['Feminino', 'Masculino', 'Prefiro não dizer'];
const DIAS = [2, 3, 4, 5, 6];
const TEMPOS = [30, 45, 60, 90];

const numero = (t: string) => {
  const n = parseFloat(t.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const texto = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));

export default function TelaPerfil() {
  const router = useRouter();
  const { perfil, salvarPerfil, pronto } = useDados();
  const [p, setP] = useState<Perfil>(perfilVazio);
  const [campos, setCampos] = useState({ idade: '', peso: '', altura: '' });
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (!pronto) return;
    setP(perfil);
    setCampos({ idade: texto(perfil.idade), peso: texto(perfil.peso), altura: texto(perfil.altura) });
  }, [pronto, perfil]);

  const atual: Perfil = { ...p, idade: numero(campos.idade), peso: numero(campos.peso), altura: numero(campos.altura) };
  const imc = calcularImc(atual.peso, atual.altura);
  const mudar = (parcial: Partial<Perfil>) => { setP((x) => ({ ...x, ...parcial })); setSalvo(false); };
  const alternar = <K extends keyof Perfil>(k: K, v: Perfil[K]) => mudar({ [k]: p[k] === v ? null : v } as Partial<Perfil>);

  async function salvar() {
    await salvarPerfil(atual);
    setSalvo(true);
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.conteudo} keyboardShouldPersistTaps="handled">
          <Titulo>Perfil</Titulo>

          <View style={s.cartaoEscuro}>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <View style={s.avatar}><Text style={s.avatarTexto}>{(p.nome.trim()[0] ?? 'T').toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.nomeGrande} numberOfLines={1}>{p.nome.trim() || 'Seu nome'}</Text>
                <Text style={s.claro2}>{[p.objetivo, p.nivel].filter(Boolean).join(' · ') || 'Preencha seus dados abaixo'}</Text>
              </View>
            </View>
            <View style={s.metricas}>
              <Metrica rotulo="Peso" valor={atual.peso ? texto(atual.peso) : '—'} unidade={atual.peso ? 'kg' : undefined} />
              <Metrica rotulo="Altura" valor={atual.altura ? texto(atual.altura) : '—'} unidade={atual.altura ? 'cm' : undefined} />
              <Metrica rotulo="IMC" valor={imc ? imc.valor.toFixed(1).replace('.', ',') : '—'} detalhe={imc?.faixa} />
            </View>
          </View>

          <CartaoNuvem />
          <CartaoVideos sempre />

          <Text style={s.legenda}>Seus dados <Text style={s.cinza}>· só o nome é obrigatório, o resto ajuda a montar o treino</Text></Text>

          <Campo rotulo="Nome">
            <TextInput value={p.nome} onChangeText={(t) => mudar({ nome: t })} placeholder="Como quer ser chamada(o)?" placeholderTextColor={cores.texto3} style={s.input} />
          </Campo>
          <View style={s.linha3}>
            <Campo rotulo="Idade" estilo={{ flex: 1 }}>
              <TextInput value={campos.idade} onChangeText={(t) => { setCampos((c) => ({ ...c, idade: t })); setSalvo(false); }} keyboardType="number-pad" placeholder="anos" placeholderTextColor={cores.texto3} style={s.input} />
            </Campo>
            <Campo rotulo="Peso (kg)" estilo={{ flex: 1 }}>
              <TextInput value={campos.peso} onChangeText={(t) => { setCampos((c) => ({ ...c, peso: t })); setSalvo(false); }} keyboardType="decimal-pad" placeholder="ex.: 62" placeholderTextColor={cores.texto3} style={s.input} />
            </Campo>
            <Campo rotulo="Altura (cm)" estilo={{ flex: 1 }}>
              <TextInput value={campos.altura} onChangeText={(t) => { setCampos((c) => ({ ...c, altura: t })); setSalvo(false); }} keyboardType="number-pad" placeholder="ex.: 165" placeholderTextColor={cores.texto3} style={s.input} />
            </Campo>
          </View>

          <Grupo rotulo="Sexo">{SEXOS.map((x) => <Chip key={x} texto={x} ativo={p.sexo === x} onPress={() => alternar('sexo', x)} />)}</Grupo>
          <Grupo rotulo="Objetivo">{OBJETIVOS.map((x) => <Chip key={x} texto={x} ativo={p.objetivo === x} onPress={() => alternar('objetivo', x)} />)}</Grupo>
          <Grupo rotulo="Nível">{NIVEIS.map((x) => <Chip key={x} texto={x} ativo={p.nivel === x} escuro onPress={() => alternar('nivel', x)} />)}</Grupo>
          <Grupo rotulo="Dias de treino por semana">{DIAS.map((x) => <Chip key={x} texto={String(x)} ativo={p.dias_semana === x} escuro onPress={() => alternar('dias_semana', x)} />)}</Grupo>
          <Grupo rotulo="Tempo por treino">{TEMPOS.map((x) => <Chip key={x} texto={`${x} min`} ativo={p.tempo_treino === x} escuro onPress={() => alternar('tempo_treino', x)} />)}</Grupo>


          <Botao texto={salvo ? 'Perfil salvo ✓' : 'Salvar perfil'} onPress={salvar} desativado={!p.nome.trim()} />
          {!p.nome.trim() && <Text style={[s.cinza, { textAlign: 'center', fontSize: 12 }]}>Preencha o nome para salvar.</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Metrica({ rotulo, valor, unidade, detalhe }: { rotulo: string; valor: string; unidade?: string; detalhe?: string }) {
  return (
    <View style={s.metrica}>
      <Text style={s.claro2}>{rotulo}</Text>
      <Text style={s.metricaValor} numberOfLines={1}>
        {valor}{unidade ? <Text style={s.metricaUnidade}> {unidade}</Text> : null}
      </Text>
      {detalhe ? <Text style={s.metricaDetalhe}>{detalhe}</Text> : null}
    </View>
  );
}

function Campo({ rotulo, children, estilo }: { rotulo: string; children: React.ReactNode; estilo?: object }) {
  return (
    <View style={[{ gap: 4 }, estilo]}>
      <Text style={s.rotuloCampo}>{rotulo}</Text>
      {children}
    </View>
  );
}

function Grupo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.legenda}>{rotulo}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  conteudo: { padding: 20, gap: 14, paddingBottom: 40 },
  cartaoEscuro: { backgroundColor: cores.escuro, borderRadius: raio.g, padding: 16, gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: cores.roxo, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: fontes.titulo, fontSize: 24, color: cores.textoClaro },
  nomeGrande: { fontFamily: fontes.titulo, fontSize: 20, color: cores.textoClaro },
  claro2: { fontFamily: fontes.regular, fontSize: 12, color: cores.textoClaro2 },
  metricas: { flexDirection: 'row', gap: 8 },
  metrica: { flex: 1, backgroundColor: cores.escuro2, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
  metricaValor: { fontFamily: fontes.negrito, fontSize: 17, color: cores.textoClaro, marginTop: 2 },
  metricaUnidade: { fontFamily: fontes.media, fontSize: 12, color: cores.textoClaro2 },
  metricaDetalhe: { fontFamily: fontes.semi, fontSize: 11, color: cores.lima },
  legenda: { fontFamily: fontes.negrito, fontSize: 13, color: cores.texto },
  cinza: { fontFamily: fontes.regular, color: cores.texto2 },
  rotuloCampo: { fontFamily: fontes.media, fontSize: 11, color: cores.texto2 },
  input: {
    height: 44, borderRadius: 10, borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.cartao,
    paddingHorizontal: 12, fontFamily: fontes.media, fontSize: 16, color: cores.texto,
  },
  linha3: { flexDirection: 'row', gap: 8 },
  mulher: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: cores.lilas, borderRadius: raio.m, padding: 14 },
  mulherTexto: { flex: 1, fontFamily: fontes.semi, fontSize: 13, color: cores.roxoEscuro },
});
