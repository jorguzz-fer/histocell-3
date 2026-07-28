'use client'

import { PageHeader } from '@/components/PageHeader'
import { ServicoLegadoTable } from '@/components/legado/ServicoLegadoTable'

/**
 * Catálogo de serviços — criar, editar e arquivar (gerência).
 * A criação de serviço foi tirada da tela de Orçamento e passou a viver aqui,
 * no menu (pedido do Célio no check de 28/07).
 */
export default function ServicosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Serviços"
        subtitle="Catálogo de serviços — criar, editar e arquivar"
      />
      <ServicoLegadoTable isPesquisador={false} />
    </div>
  )
}
