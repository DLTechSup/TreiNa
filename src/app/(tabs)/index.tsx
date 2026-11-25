import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Icone } from '@/components/Icone';
import { Botao, Logo, Miniatura, Titulo, estilos as ui } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { exercicios, grupos, porId, totalFocoFeminino } from '@/data';
import { useDados } from '@/db/banco';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function saudacao(d: Date) {
  const h = d.getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Inicio() {
  const router = useRouter();
  const { perfil, favoritos } = useDados();
  const hoje = new Date();
  const primeiroNome = perfil.nome.split(' ')[0];
  const favs = [...favoritos].map(porId).filter(Boolean).slice(0, 8);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.conteudo}>
        <View style={s.topo}>
          <Logo />
          <Pressable onPress={() => router.navigate('/perfil')} accessibilityRole="button" accessibilityLabel="Abrir perfil" style={s.avatar}>
            <Text style={s.avatarTexto}>{(primeiroNome[0] ?? 'T').toUpperCase()}</Text>
          </Pressable>
        </View>

        <View>
          <Text style={s.data}>{DIAS[hoje.getDay()]}, {hoje.getDate()} de {MESES[hoje.getMonth()]}</Text>
          <Titulo style={{ fontSize: 28 }}>{saudacao(hoje)}{primeiroNome ? `, ${primeiroNome}` : '!'}</Titulo>
        </View>

        {/* Treino de hoje: a montagem chega na Fase 3 */}
        <View style={s.cartaoEscuro}>
          <Text style={s.selo}>TREINO DE HOJE</Text>
          <Text style={s.escuroTitulo}>Monte seu treino com {exercicios.length} exercícios</Text>
          <Text style={s.escuroTexto}>
            Explore a biblioteca, veja cada exercício em vídeo e marque seus favoritos. A montagem do treino da semana chega na próxima versão.
          </Text>
          <Botao texto="Explorar a biblioteca" tipo="lima" onPress={() => router.navigate('/biblioteca')} />
        </View>

        {/* Área feminina */}
        <Pressable onPress={() => router.push('/mulher')} style={({ pressed }) => [s.mulher, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.mulherSelo}>TREINA MULHER</Text>
            <Text style={s.mulherTitulo}>Glúteo, pernas e ombros com volume</Text>
            <Text style={s.mulherTexto}>2 planos prontos · {totalFocoFeminino} exercícios com foco feminino</Text>
          </View>
          <Miniatura id="elevacao-pelvica-com-barra" tamanho={84} raioBorda={14} />
        </Pressable>

        {/* Grupos musculares */}
        <View style={s.linhaTitulo}>
          <Text style={s.secao}>Grupos musculares</Text>
          <Text onPress={() => router.navigate('/biblioteca')} style={s.link}>Ver todos</Text>
        </View>
        <View style={s.grade}>
          {grupos.slice(0, 8).map((g) => (
            <Pressable key={g.nome} style={({ pressed }) => [s.grupo, pressed && { opacity: 0.7 }]}
              onPress={() => router.navigate({ pathname: '/biblioteca', params: { grupo: g.nome } })}>
              <Text style={s.grupoNome} numberOfLines={1}>{g.nome}</Text>
              <Text style={s.grupoTotal}>{g.total} exercícios</Text>
            </Pressable>
          ))}
        </View>

        {/* Favoritos */}
        <View style={s.linhaTitulo}>
          <Text style={s.secao}>Seus favoritos</Text>
          {favs.length > 0 && (
            <Text onPress={() => router.navigate({ pathname: '/biblioteca', params: { grupo: 'Favoritos' } })} style={s.link}>Ver todos</Text>
          )}
        </View>
        {favs.length === 0 ? (
          <View style={[ui.cartao, s.vazio]}>
            <Icone nome="estrela" tamanho={20} cor={cores.texto2} />
            <Text style={s.vazioTexto}>Toque na estrela de um exercício para guardá-lo aqui.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {favs.map((e) => (
              <Pressable key={e!.id} style={s.fav} onPress={() => router.push({ pathname: '/exercicio/[id]', params: { id: e!.id } })}>
                <Miniatura id={e!.id} tamanho={104} raioBorda={14} />
                <Text style={s.favNome} numberOfLines={2}>{e!.nome}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  conteudo: { padding: 20, gap: 16, paddingBottom: 32 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: cores.roxo, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { color: cores.textoClaro, fontFamily: fontes.negrito, fontSize: 17 },
  data: { fontFamily: fontes.regular, fontSize: 13, color: cores.texto2 },
  cartaoEscuro: { backgroundColor: cores.escuro, borderRadius: raio.g, padding: 18, gap: 10 },
  selo: { alignSelf: 'flex-start', backgroundColor: cores.lilas, color: cores.roxoEscuro, fontFamily: fontes.negrito, fontSize: 11, letterSpacing: 0.6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: raio.pill, overflow: 'hidden' },
  escuroTitulo: { fontFamily: fontes.titulo, fontSize: 21, color: cores.textoClaro, letterSpacing: -0.3 },
  escuroTexto: { fontFamily: fontes.regular, fontSize: 13, color: cores.textoClaro2, lineHeight: 19, marginBottom: 4 },
  mulher: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: cores.lilas, borderRadius: raio.g, padding: 16 },
  mulherSelo: { fontFamily: fontes.negrito, fontSize: 11, color: cores.roxoEscuro, letterSpacing: 0.6 },
  mulherTitulo: { fontFamily: fontes.titulo, fontSize: 18, color: cores.texto, letterSpacing: -0.2 },
  mulherTexto: { fontFamily: fontes.regular, fontSize: 12, color: '#3F2E9E' },
  linhaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 },
  secao: { fontFamily: fontes.titulo, fontSize: 17, color: cores.texto },
  link: { fontFamily: fontes.semi, fontSize: 13, color: cores.roxo, padding: 4 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grupo: { width: '48.5%', backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.m, paddingVertical: 12, paddingHorizontal: 14 },
  grupoNome: { fontFamily: fontes.semi, fontSize: 15, color: cores.texto },
  grupoTotal: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2, marginTop: 2 },
  vazio: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  vazioTexto: { flex: 1, fontFamily: fontes.regular, fontSize: 13, color: cores.texto2 },
  fav: { width: 104, gap: 6 },
  favNome: { fontFamily: fontes.semi, fontSize: 12, color: cores.texto },
});
