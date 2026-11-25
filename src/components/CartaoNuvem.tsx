import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';

import { Icone } from '@/components/Icone';
import { Botao } from '@/components/ui';
import { cores, fontes, raio } from '@/constants/tema';
import { formatarQuando, useConta, type StatusNuvem } from '@/db/nuvem';

/** "G" colorido do Google (exigido no botão "Entrar com Google"). */
function LogoGoogle({ tamanho = 20 }: { tamanho?: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

const TEXTO_STATUS: Record<StatusNuvem, string> = {
  desligado: 'Desligado',
  verificando: 'Conferindo a nuvem…',
  salvando: 'Salvando na nuvem…',
  ok: 'Backup em dia',
  offline: 'Sem internet',
  erro: 'Com problema',
  conflito: 'Escolha qual manter',
};

const COR_STATUS: Record<StatusNuvem, string> = {
  desligado: cores.texto3,
  verificando: cores.roxo,
  salvando: cores.roxo,
  ok: '#2E9E4F',
  offline: '#C77700',
  erro: '#C2410C',
  conflito: '#C77700',
};

export function CartaoNuvem() {
  const c = useConta();

  if (!c.configurada) {
    if (!__DEV__) return null;
    return (
      <View style={[s.cartao, { backgroundColor: cores.alertaFundo, borderColor: cores.alertaFundo }]}>
        <Text style={[s.texto, { color: cores.alertaTexto }]}>
          Backup na nuvem: falta configurar o Supabase no arquivo .env (veja o guia de configuração).
        </Text>
      </View>
    );
  }

  const quando = formatarQuando(c.ultimoBackup);
  const ocupado = c.status === 'verificando' || c.status === 'salvando';

  return (
    <View style={s.cartao}>
      <View style={s.topo}>
        <View style={s.iconeNuvem}><Icone nome="nuvem" tamanho={20} cor={cores.roxoEscuro} /></View>
        <Text style={s.titulo}>Backup na nuvem</Text>
        {c.usuario && (
          <View style={s.status}>
            {ocupado ? <ActivityIndicator size="small" color={cores.roxo} /> : <View style={[s.ponto, { backgroundColor: COR_STATUS[c.status] }]} />}
            <Text style={[s.statusTexto, { color: COR_STATUS[c.status] }]}>{TEXTO_STATUS[c.status]}</Text>
          </View>
        )}
      </View>

      {!c.usuario ? (
        <>
          <Text style={s.texto}>
            Entre com sua conta Google para guardar perfil, favoritos, treinos e histórico na nuvem.
            Se trocar de celular ou apagar o app, é só entrar de novo que tudo volta.
          </Text>
          <Pressable
            onPress={c.entrar}
            disabled={c.entrando}
            accessibilityRole="button"
            style={({ pressed }) => [s.botaoGoogle, (pressed || c.entrando) && { opacity: 0.75 }]}>
            {c.entrando ? <ActivityIndicator color={cores.texto} /> : <LogoGoogle />}
            <Text style={s.botaoGoogleTexto}>{c.entrando ? 'Abrindo o Google…' : 'Entrar com Google'}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={s.conta}>
            {c.usuario.foto ? (
              <Image source={{ uri: c.usuario.foto }} style={s.foto} contentFit="cover" />
            ) : (
              <View style={[s.foto, s.fotoVazia]}>
                <Text style={s.fotoLetra}>{(c.usuario.nome ?? c.usuario.email ?? '?')[0].toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.nome} numberOfLines={1}>{c.usuario.nome ?? 'Conta Google'}</Text>
              <Text style={s.email} numberOfLines={1}>{c.usuario.email}</Text>
            </View>
          </View>

          {c.conflito ? (
            <View style={s.conflito}>
              <Text style={s.conflitoTitulo}>Este aparelho e a nuvem têm dados diferentes</Text>
              <Text style={s.conflitoTexto}>
                Backup da nuvem de {formatarQuando(c.conflito.nuvemEm) ?? '—'}
                {c.conflito.dispositivo ? ` (${c.conflito.dispositivo})` : ''}. Qual você quer manter?
              </Text>
              <Botao texto="Usar os dados da nuvem" onPress={() => c.resolverConflito('nuvem')} />
              <Botao texto="Manter os deste aparelho" tipo="contorno" onPress={() => c.resolverConflito('aparelho')} />
            </View>
          ) : (
            <Text style={s.texto}>
              Backup automático ligado: cada mudança vai para a nuvem sozinha.
              {quando ? `\nÚltimo backup: ${quando}.` : ''}
            </Text>
          )}

          {!c.conflito && (
            <View style={s.acoes}>
              <Botao texto="Fazer backup agora" tipo="contorno" onPress={c.backupAgora} desativado={ocupado} style={{ flex: 1, height: 44 }} />
              <Pressable onPress={c.sair} accessibilityRole="button" style={({ pressed }) => [s.sair, pressed && { opacity: 0.6 }]}>
                <Text style={s.sairTexto}>Sair</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      {c.mensagem ? (
        <Text style={[s.mensagem, (c.status === 'erro' || c.status === 'offline') && { color: cores.alertaTexto }]}>
          {c.mensagem}
        </Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  cartao: { backgroundColor: cores.cartao, borderRadius: raio.g, borderWidth: 1, borderColor: cores.borda, padding: 16, gap: 12 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconeNuvem: { width: 34, height: 34, borderRadius: 17, backgroundColor: cores.lilas, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, fontFamily: fontes.negrito, fontSize: 15, color: cores.texto },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  statusTexto: { fontFamily: fontes.semi, fontSize: 12 },
  texto: { fontFamily: fontes.regular, fontSize: 13, lineHeight: 19, color: cores.texto2 },
  botaoGoogle: {
    height: 48, borderRadius: raio.m, borderWidth: 1, borderColor: '#DADCE0', backgroundColor: '#FFFFFF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  botaoGoogleTexto: { fontFamily: fontes.semi, fontSize: 15, color: '#1F1F1F' },
  conta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  foto: { width: 40, height: 40, borderRadius: 20 },
  fotoVazia: { backgroundColor: cores.roxo, alignItems: 'center', justifyContent: 'center' },
  fotoLetra: { fontFamily: fontes.titulo, fontSize: 18, color: cores.textoClaro },
  nome: { fontFamily: fontes.semi, fontSize: 14, color: cores.texto },
  email: { fontFamily: fontes.regular, fontSize: 12, color: cores.texto2 },
  conflito: { backgroundColor: cores.alertaFundo, borderRadius: raio.m, padding: 12, gap: 10 },
  conflitoTitulo: { fontFamily: fontes.negrito, fontSize: 14, color: cores.alertaTexto },
  conflitoTexto: { fontFamily: fontes.regular, fontSize: 13, lineHeight: 19, color: cores.alertaTexto },
  acoes: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sair: { height: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  sairTexto: { fontFamily: fontes.semi, fontSize: 14, color: cores.texto2 },
  mensagem: { fontFamily: fontes.media, fontSize: 12, color: cores.roxoEscuro },
});
