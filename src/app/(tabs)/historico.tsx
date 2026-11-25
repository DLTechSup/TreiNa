import { EmBreve } from '@/components/EmBreve';

export default function Historico() {
  return (
    <EmBreve
      titulo="Histórico"
      icone="historico"
      chamada="Tudo o que você treinou, dia a dia"
      itens={[
        'Calendário do mês com os dias treinados',
        'Registro de cada dia: exercícios, cargas, repetições e duração',
        'Sequência de dias, treinos no mês e no ano',
        'Evolução de carga e recordes por exercício',
      ]}
    />
  );
}
