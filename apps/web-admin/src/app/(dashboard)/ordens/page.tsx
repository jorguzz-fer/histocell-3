import { redirect } from 'next/navigation'

/**
 * A tela de Ordens foi substituída por /os, que reúne o material recebido, os
 * serviços a executar e a execução em si. A rota fica como redirecionamento
 * para não quebrar links e favoritos de quem já usava a antiga.
 */
export default function OrdensRedirect() {
  redirect('/os')
}
