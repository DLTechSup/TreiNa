import { Redirect } from 'expo-router';

import { useDados } from '@/db/banco';

/** A entrada agora é a tela de login do Portão (só conta Google liberada). Esta rota antiga só redireciona. */
export default function BoasVindas() {
  const { pronto, perfil } = useDados();
  if (!pronto) return null;
  return <Redirect href={perfil.nome ? '/' : '/cadastro'} />;
}
