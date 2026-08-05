'use client'

import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

interface BarcodeProps {
  value: string
  /** altura das barras em px */
  height?: number
  /** largura de cada barra em px */
  width?: number
  /** mostra o texto do valor sob o código */
  displayValue?: boolean
  /** corpo do texto do valor, em px do sistema de coordenadas do SVG */
  fontSize?: number
  /**
   * Deixa o CSS mandar no tamanho: troca as dimensões intrínsecas por um
   * viewBox elástico. Sem isso, `width: 100%` também estica a altura (a razão
   * de aspecto é preservada) e o código de barras estoura o espaço reservado.
   * Use em etiqueta de tamanho físico fixo.
   */
  stretch?: boolean
  className?: string
}

/** Renderiza um código de barras Code128 em SVG (impressão-friendly). */
export function Barcode({
  value,
  height = 40,
  width = 1.4,
  displayValue = false,
  fontSize = 12,
  stretch = false,
  className = '',
}: BarcodeProps) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = ref.current
    if (!svg) return
    try {
      JsBarcode(svg, value, {
        format: 'CODE128',
        height,
        width,
        displayValue,
        margin: 0,
        fontSize,
        background: 'transparent',
        lineColor: '#000000',
      })
    } catch {
      /* valor inválido para o símbolo — ignora */
      return
    }
    if (!stretch) return
    // O JsBarcode escreve as dimensões com unidade ("148px"); o viewBox só
    // aceita número puro — com o sufixo, o browser descarta o atributo inteiro
    // e o desenho volta ao tamanho natural, cortado.
    const w = parseFloat(svg.getAttribute('width') ?? '')
    const h = parseFloat(svg.getAttribute('height') ?? '')
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    svg.setAttribute('preserveAspectRatio', 'none')
    svg.removeAttribute('width')
    svg.removeAttribute('height')
  }, [value, height, width, displayValue, fontSize, stretch])

  return <svg ref={ref} className={className} />
}
