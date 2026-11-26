import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Icone } from '@/components/Icone';
import { BarraProgresso, MarcaTreiNa } from '@/components/pecas';
import { Botao, Chip } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { calcularImc, perfilVazio, useDados, type Perfil } from '@/db/banco';
import { useConta } from '@/db/nuvem';

const OBJETIVOS = [
  { nome: 'Ganhar massa', texto: 'Ficar mais forte e aumentar os músculos' },
  { nome: 'Emagrecer', texto: 'Perder gordura com musculação e cardio' },
  { nome: 'Condicionamento', texto: 'Mais fôlego, resistência e disposição' },
  { nome: 'Mobilidade', texto: 'Soltar o corpo, alongar e evitar dores' },
];
const NIVEIS = [
  { nome: 'Iniciante', texto: 'Estou começando ou voltando agora' },
  { nome: 'Intermediário', texto: 'Treino há alguns meses' },
  { nome: 'Avançado', texto: 'Treino há mais de 1 ano' },
];
const SEXOS = ['Feminino', 'Masculino', 'Prefiro não dizer'];
const DIAS = [2, 3, 4, 5, 6];
const TEMPOS = [30, 45, 60, 90];

const numero = (t: string) => {
  const n = parseFloat(t.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Cadastro em 4 passos: nome e idade → corpo → objetivo → rotina. */
export default function Cadastro() {
  const router = useRouter();
  const { perfil, salvarPerfil } = useDados();
  const conta = useConta();
  const [passo, setPasso] = useState(0);
  const [p, setP] = useState<Perfil>(perfil.nome ? perfil : perfilVazio);
  const [campos, setCampos] = useState(() => ({
    idade: perfil.idade ? String(perfil.idade) : '',
    peso: perfil.peso ? String(perfil.peso).replace('.', ',') : '',
    altura: perfil.altura ? String(perfil.altura) : '',
  }));
  const [salvando, setSalvando] = useState(false);

  // Quem entrou com Google já vem com o primeiro nome preenchido
  useEffect(() => {
    if (!p.nome && conta.usuario?.nome) setP((x) => ({ ...x, nome: conta.usuario!.nome!.split(' ')[0] }));
  }, [conta.usuario, p.nome]);

  const atual: Perfil = { ...p, idade: numero(campos.idade), peso: numero(campos.peso), altura: numero(campos.altura) };
  const imc = calcularImc(atual.peso, atual.altura);
  const TOTAL = 4;
  const podeSeguir = [!!p.nome.trim(), true, !!p.objetivo, !!p.nivel && !!p.dias_semana][passo] ?? true;

  const seguir = async () => {
    if (passo < TOTAL - 1) { setPasso(passo + 1); return; }
    setSalvando(true);
    await salvarPerfil({ ...atual, local: 'Academia' });
    setPasso(TOTAL);
    setSalvando(false);
  };

  if (passo === TOTAL) {
    const nome = p.nome.trim().split(' ')[0];
    return (
      <SafeAreaView style={[s.tela, { backgroundColor: cores.escuro }]}>
        <ScrollView contentContainerStyle={[s.conteudo, { justifyContent: 'center', flexGrow: 1 }]}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <MarcaTreiNa tamanho={72} />
            <Text style={[s.titulo, { color: cores.textoClaro, textAlign: 'center' }]}>Tudo pronto, {nome}!</Text>
            <Text style={[s.sub, { color: cores.textoClaro2, textAlign: 'center' }]}>
              Agora vamos montar o seu treino da semana. Você pode começar com um plano pronto para o seu objetivo ({p.objetivo?.toLowerCase()}) ou montar do seu jeito.
            </Text>
          </View>
          <View style={{ gap: 10, marginTop: 12 }}>
            <Botao texto="Ver planos indicados para mim" tipo="lima" onPress={() => router.replace('/treino/planos')} />
            <Botao texto="Montar meu treino do zero" tipo="contorno" corTexto={cores.textoClaro} style={{ borderColor: cores.escuro3 }}
              onPress={() => router.replace({ pathname: '/treino/dia/[dia]', params: { dia: '1' } })} />
            <Pressable onPress={() => router.replace('/')} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: fontes.semi, color: cores.lima }}>Ir para o início</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.tela}>
      <View style={s.topo}>
        <Pressable onPress={() => (passo ? setPasso(passo - 1) : router.canGoBack() ? router.back() : router.replace('/'))}
          style={s.voltar} accessibilityLabel="Voltar" hitSlop={6}>
          <Icone nome="voltar" tamanho={22} />
        </Pressable>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={s.passoTexto}>Passo {passo + 1} de {TOTAL}</Text>
          <BarraProgresso valor={(passo + 1) / TOTAL} />
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.conteudo} keyboardShouldPersistTaps="handled">
          {passo === 0 && (
            <>
              <Text style={s.titulo}>Como você quer ser chamado(a)?</Text>
              <Text style={s.sub}>É assim que o TreiNa vai falar com você.</Text>
              <TextInput value={p.nome} onChangeText={(t) => setP({ ...p, nome: t })} placeholder="Seu nome ou apelido" placeholderTextColor={cores.texto3}
                style={s.inputGrande} autoFocus={Platform.OS !== 'web'} returnKeyType="next" onSubmitEditing={() => podeSeguir && seguir()} />
              <Campo rotulo="Idade (opcional)">
                <TextInput value={campos.idade} onChangeText={(t) => setCampos({ ...campos, idade: t })} keyboardType="number-pad" placeholder="anos"
                  placeholderTextColor={cores.texto3} style={s.input} />
              </Campo>
            </>
          )}

          {passo === 1 && (
            <>
              <Text style={s.titulo}>Sobre o seu corpo</Text>
              <Text style={s.sub}>Opcional. Ajuda a acompanhar a sua evolução (peso e IMC).</Text>
              <Campo rotulo="Sexo">
                <View style={s.chips}>{SEXOS.map((x) => <Chip key={x} texto={x} ativo={p.sexo === x} onPress={() => setP({ ...p, sexo: p.sexo === x ? null : x })} />)}</View>
              </Campo>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Campo rotulo="Peso (kg)" estilo={{ flex: 1 }}>
                  <TextInput value={campos.peso} onChangeText={(t) => setCampos({ ...campos, peso: t })} keyboardType="decimal-pad" placeholder="ex.: 70"
                    placeholderTextColor={cores.texto3} style={s.input} />
                </Campo>
                <Campo rotulo="Altura (cm)" estilo={{ flex: 1 }}>
                  <TextInput value={campos.altura} onChangeText={(t) => setCampos({ ...campos, altura: t })} keyboardType="number-pad" placeholder="ex.: 170"
                    placeholderTextColor={cores.texto3} style={s.input} />
                </Campo>
              </View>
              {imc && (
                <View style={s.imc}>
                  <Text style={s.imcValor}>IMC {imc.valor.toFixed(1).replace('.', ',')}</Text>
                  <Text style={s.imcFaixa}>{imc.faixa}</Text>
                </View>
              )}
            </>
          )}

          {passo === 2 && (
            <>
              <Text style={s.titulo}>Qual é o seu objetivo?</Text>
              <Text style={s.sub}>Os planos sugeridos vão seguir o que você escolher.</Text>
              {OBJETIVOS.map((o) => (
                <Opcao key={o.nome} titulo={o.nome} texto={o.texto} ativo={p.objetivo === o.nome} onPress={() => setP({ ...p, objetivo: o.nome })} />
              ))}
            </>
          )}

          {passo === 3 && (
            <>
              <Text style={s.titulo}>Sua rotina de treino</Text>
              <Text style={s.sub}>Nível de experiência</Text>
              {NIVEIS.map((n) => (
                <Opcao key={n.nome} titulo={n.nome} texto={n.texto} ativo={p.nivel === n.nome} onPress={() => setP({ ...p, nivel: n.nome })} />
              ))}
              <Campo rotulo="Quantos dias por semana você quer treinar?">
                <View style={s.chips}>{DIAS.map((d) => <Chip key={d} texto={`${d} dias`} escuro ativo={p.dias_semana === d} onPress={() => setP({ ...p, dias_semana: d })} />)}</View>
              </Campo>
              <Campo rotulo="Tempo por treino">
                <View style={s.chips}>{TEMPOS.map((t) => <Chip key={t} texto={`${t} min`} escuro ativo={p.tempo_treino === t} onPress={() => setP({ ...p, tempo_treino: t })} />)}</View>
              </Campo>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={s.rodape}>
        <Botao texto={passo === TOTAL - 1 ? (salvando ? 'Salvando…' : 'Concluir') : 'Continuar'} desativado={!podeSeguir || salvando} onPress={seguir} />
        {passo === 1 && <Text onPress={seguir} style={s.pular}>Pular esta parte</Text>}
      </View>
    </SafeAreaView>
  );
}

function Campo({ rotulo, children, estilo }: { rotulo: string; children: React.ReactNode; estilo?: object }) {
  return (
    <View style={[{ gap: 6 }, estilo]}>
      <Text style={s.rotulo}>{rotulo}</Text>
      {children}
    </View>
  );
}

function Opcao({ titulo, texto, ativo, onPress }: { titulo: string; texto: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.opcao, ativo && s.opcaoAtiva, pressed && { opacity: 0.85 }]}
      accessibilityRole="radio" accessibilityState={{ selected: ativo }}>
      <View style={{ flex: 1 }}>
        <Text style={[s.opcaoTitulo, ativo && { color: cores.textoClaro }]}>{titulo}</Text>
        <Text style={[s.opcaoTexto, ativo && { color: cores.lilas }]}>{texto}</Text>
      </View>
      <View style={[s.radio, ativo && s.radioAtivo]}>{ativo && <Icone nome="check" tamanho={14} cor={cores.texto} espessura={3} />}</View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  voltar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda },
  passoTexto: { fontFamily: fontes.semi, fontSize: 12, color: cores.texto2 },
  conteudo: { padding: 20, gap: 14, paddingBottom: 32 },
  titulo: { fontFamily: fontes.titulo, fontSize: 26, color: cores.texto, letterSpacing: -0.4 },
  sub: { fontFamily: fontes.regular, fontSize: 14, color: cores.texto2, lineHeight: 20, marginTop: -6 },
  rotulo: { fontFamily: fontes.negrito, fontSize: 13, color: cores.texto },
  inputGrande: { height: 58, borderRadius: raio.m, borderWidth: 1.5, borderColor: cores.roxo, backgroundColor: cores.cartao, paddingHorizontal: 16, fontFamily: fontes.semi, fontSize: 20, color: cores.texto },
  input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.cartao, paddingHorizontal: 12, fontFamily: fontes.media, fontSize: 16, color: cores.texto },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  imc: { flexDirection: 'row', alignItems: 'baseline', gap: 10, backgroundColor: cores.escuro, borderRadius: raio.m, padding: 14 },
  imcValor: { fontFamily: fontes.titulo, fontSize: 20, color: cores.textoClaro },
  imcFaixa: { fontFamily: fontes.semi, fontSize: 13, color: cores.lima },
  opcao: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.m, padding: 14 },
  opcaoAtiva: { backgroundColor: cores.roxo, borderColor: cores.roxo },
  opcaoTitulo: { fontFamily: fontes.semi, fontSize: 16, color: cores.texto },
  opcaoTexto: { fontFamily: fontes.regular, fontSize: 13, color: cores.texto2, marginTop: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: cores.borda, alignItems: 'center', justifyContent: 'center' },
  radioAtivo: { backgroundColor: cores.lima, borderColor: cores.lima },
  rodape: { padding: 16, paddingBottom: 20, gap: 6, borderTopWidth: 1, borderColor: cores.borda, backgroundColor: cores.fundo },
  pular: { textAlign: 'center', fontFamily: fontes.semi, fontSize: 13, color: cores.texto2, padding: 8 },
});
