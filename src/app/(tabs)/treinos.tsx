import { useRouter } from 'expo-router';
import { EmBreve } from '@/components/EmBreve';

export default function Treinos() {
  const router = useRouter();
  return (
    <EmBreve
      titulo="Treinos"
      icone="treinos"
      chamada="Monte seu treino da semana, dia por dia"
      itens={[
        'Escolha o dia (segunda, terça...) e os grupos musculares',
        'Adicione exercícios da biblioteca com carga, repetições, séries e descanso',
        'Aceite um plano sugerido pelo seu objetivo ou monte o seu',
        'Timer para iniciar, timer de descanso com alarme e volta em 10 segundos',
      ]}
      botao={{ texto: 'Ver os planos do TreiNa Mulher', onPress: () => router.push('/mulher') }}
    />
  );
}
