'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { EtiquetaLabel } from './EtiquetaLabel'
import type { Etiqueta } from './types'
import { lerEtiquetaConfig, ETIQUETA_CONFIG_PADRAO, type EtiquetaConfig } from './etiquetaConfig'

/**
 * Área de impressão das etiquetas. Renderizada num portal no <body> e visível
 * apenas na impressão (window.print()). Cada etiqueta ocupa UMA página do
 * tamanho configurado (largura×altura) — formato de impressora de etiqueta.
 *
 * Na impressão, TODO o resto da página é `display:none` (não apenas escondido),
 * senão o conteúdo do app — mesmo invisível — continuaria ocupando espaço e
 * geraria páginas em branco. A lista pode conter a mesma etiqueta repetida
 * (cópias), por isso a key é o índice.
 */
export function EtiquetaPrintArea({ etiquetas, config }: { etiquetas: Etiqueta[]; config?: EtiquetaConfig }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Config vem do localStorage: lê só no cliente (evita hydration mismatch).
  const [cfg, setCfg] = useState<EtiquetaConfig>(config ?? ETIQUETA_CONFIG_PADRAO)
  useEffect(() => {
    if (!config) setCfg(lerEtiquetaConfig())
  }, [config])
  const { larguraMm, alturaMm } = config ?? cfg

  if (!mounted) return null

  return createPortal(
    <div className="etq-print-root">
      <div className="etiqueta-print-area" aria-hidden>
        {etiquetas.map((e, i) => (
          <div className="etiqueta-page" key={i}>
            <EtiquetaLabel etiqueta={e} larguraMm={larguraMm} alturaMm={alturaMm} />
          </div>
        ))}
      </div>

      <style>{`
        .etq-print-root { display: none; }
        .etiqueta-label {
          box-sizing: border-box;
          width: ${larguraMm}mm;
          height: ${alturaMm}mm;
          padding: ${(alturaMm * 0.04).toFixed(2)}mm ${(larguraMm * 0.05).toFixed(2)}mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.05;
          overflow: hidden;
          break-inside: avoid;
        }
        /* Fontes proporcionais ao tamanho (mm) para caberem em 24×18 e escalarem
           se o usuário ajustar o tamanho da etiqueta. */
        .etiqueta-ident { font-size: ${(alturaMm * 0.095).toFixed(2)}mm; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .etiqueta-coloracao { font-size: ${(alturaMm * 0.13).toFixed(2)}mm; font-weight: 700; }
        /* display:block remove o espaçamento de baseline do SVG (que fazia o número
           encostar no código); margem dá respiro acima e abaixo das barras. */
        .etiqueta-barcode { width: 100%; height: auto; display: block; margin: ${(alturaMm * 0.03).toFixed(2)}mm auto; }
        .etiqueta-numero { font-family: 'Courier New', monospace; font-size: ${(alturaMm * 0.095).toFixed(2)}mm; }
        .etiqueta-histocell { font-size: ${(alturaMm * 0.09).toFixed(2)}mm; }
        @media print {
          /* Esconde o app inteiro (display:none evita páginas em branco); só a
             área de impressão aparece. */
          body > *:not(.etq-print-root) { display: none !important; }
          .etq-print-root { display: block !important; }
          .etiqueta-print-area { display: block; }
          .etiqueta-page {
            width: ${larguraMm}mm;
            height: ${alturaMm}mm;
            page-break-after: always;
            break-after: page;
            overflow: hidden;
          }
          .etiqueta-page:last-child { page-break-after: auto; break-after: auto; }
          @page { size: ${larguraMm}mm ${alturaMm}mm; margin: 0; }
        }
      `}</style>
    </div>,
    document.body,
  )
}
