import { Barcode } from '@/components/ui/Barcode'
import type { Etiqueta } from './types'

function numeroFmt(n: number) {
  return String(n).padStart(8, '0')
}

/** Data no formato ddmmaa (ex.: 260225), como na etiqueta física. */
function ddmmaa(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const aa = String(d.getFullYear()).slice(-2)
  return `${dd}${mm}${aa}`
}

/**
 * Etiqueta de lâmina/cassete no layout físico do modelo Histocell:
 *   identificação · coloração · Code128 · "nº - data" · "Histocell - nºInterno"
 * O código de barras é dimensionado a partir do tamanho da etiqueta (mm) para
 * caber em etiquetas pequenas (24×18) sem estourar.
 */
export function EtiquetaLabel({
  etiqueta,
  larguraMm = 24,
  alturaMm = 18,
}: {
  etiqueta: Etiqueta
  larguraMm?: number
  alturaMm?: number
}) {
  const ident =
    etiqueta.identificacao ??
    (etiqueta.amostra.pedido.cliente.nomeFantasia ?? etiqueta.amostra.pedido.cliente.nome)

  // Barras: altura ~38% da etiqueta; módulo proporcional à largura (limitado
  // para permanecer legível/escaneável em etiqueta pequena). 1mm ≈ 3.78px.
  const barrasAltura = Math.max(16, Math.round(alturaMm * 0.38 * 3.78))
  const barraLargura = Math.max(0.8, Math.min(2, larguraMm / 24))

  return (
    <div className="etiqueta-label">
      <div className="etiqueta-ident">{ident}</div>
      {etiqueta.coloracao && <div className="etiqueta-coloracao">{etiqueta.coloracao}</div>}
      {/* Code128 com o número da etiqueta (igual ao número impresso abaixo) */}
      <Barcode value={numeroFmt(etiqueta.numero)} height={barrasAltura} width={barraLargura} className="etiqueta-barcode" />
      <div className="etiqueta-numero">
        {numeroFmt(etiqueta.numero)} - {ddmmaa(etiqueta.createdAt)}
      </div>
      <div className="etiqueta-histocell">Histocell - {etiqueta.amostra.numeroInterno}</div>
    </div>
  )
}
