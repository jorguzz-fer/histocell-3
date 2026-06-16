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
  className?: string
}

/** Renderiza um código de barras Code128 em SVG (impressão-friendly). */
export function Barcode({
  value,
  height = 40,
  width = 1.4,
  displayValue = false,
  className = '',
}: BarcodeProps) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!ref.current) return
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        height,
        width,
        displayValue,
        margin: 0,
        fontSize: 12,
        background: 'transparent',
        lineColor: '#000000',
      })
    } catch {
      /* valor inválido para o símbolo — ignora */
    }
  }, [value, height, width, displayValue])

  return <svg ref={ref} className={className} />
}
