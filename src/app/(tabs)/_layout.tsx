import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone, type NomeIcone } from '@/components/Icone';
import { cores, fontes } from '@/constants/tema';

const abas: { nome: string; titulo: string; icone: NomeIcone }[] = [
  { nome: 'index', titulo: 'Início', icone: 'inicio' },
  { nome: 'biblioteca', titulo: 'Biblioteca', icone: 'biblioteca' },
  { nome: 'treinos', titulo: 'Treinos', icone: 'treinos' },
  { nome: 'historico', titulo: 'Histórico', icone: 'historico' },
  { nome: 'perfil', titulo: 'Perfil', icone: 'perfil' },
];

export default function LayoutAbas() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.roxo,
        tabBarInactiveTintColor: cores.texto2,
        tabBarLabelStyle: { fontFamily: fontes.semi, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: cores.cartao,
          borderTopColor: cores.borda,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        sceneStyle: { backgroundColor: cores.fundo },
      }}>
      {abas.map((a) => (
        <Tabs.Screen
          key={a.nome}
          name={a.nome}
          options={{
            title: a.titulo,
            tabBarIcon: ({ color }) => <Icone nome={a.icone} cor={String(color)} tamanho={24} />,
          }}
        />
      ))}
    </Tabs>
  );
}
