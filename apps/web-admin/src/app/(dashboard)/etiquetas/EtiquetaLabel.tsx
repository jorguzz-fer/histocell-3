import { Barcode } from '@/components/ui/Barcode'
import type { Etiqueta } from './types'

function numeroFmt(n: number) {
  return String(n).padStart(8, '0')
}

function ddmmaaaa(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const aaaa = String(d.getFullYear())
  return `${dd}${mm}${aaaa}`
}

/**
 * Etiqueta de lâmina/cassete no layout físico do modelo Histocell:
 *   identificação · coloração · Code128 · "nº - data" · "Histocell - nºInterno"
 */
export function EtiquetaLabel({ etiqueta }: { etiqueta: Etiqueta }) {
  const ident =
    etiqueta.identificacao ??
    (etiqueta.amostra.pedido.cliente.nomeFantasia ?? etiqueta.amostra.pedido.cliente.nome)

  return (
    <div className="etiqueta-label">
      <div className="etiqueta-ident">{ident}</div>
      {etiqueta.coloracao && <div className="etiqueta-coloracao">{etiqueta.coloracao}</div>}
      <Barcode value={etiqueta.codigo} height={34} width={1.3} className="etiqueta-barcode" />
      <div className="etiqueta-numero">
        {numeroFmt(etiqueta.numero)} - {ddmmaaaa(etiqueta.createdAt)}
      </div>
      <div className="etiqueta-histocell">Histocell - {etiqueta.amostra.numeroInterno}</div>
    </div>
  )
}
