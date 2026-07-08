'use client'

import { useEffect, useState } from 'react'
import { EtiquetaLabel } from './EtiquetaLabel'
import type { Etiqueta } from './types'
import { lerEtiquetaConfig, ETIQUETA_CONFIG_PADRAO, type EtiquetaConfig } from './etiquetaConfig'

/**
 * Área oculta em tela e visível apenas na impressão (window.print()).
 * Cada etiqueta ocupa UMA página do tamanho configurado (largura×altura),
 * empilhadas uma embaixo da outra — formato adequado para impressora de
 * etiqueta (Zebra), e não folha A4.
 */
export function EtiquetaPrintArea({ etiquetas, config }: { etiquetas: Etiqueta[]; config?: EtiquetaConfig }) {
  // Config vem do localStorage: lê só no cliente (useEffect) para não divergir
  // do HTML do servidor (hydration mismatch) e para pegar o tamanho salvo.
  const [cfg, setCfg] = useState<EtiquetaConfig>(config ?? ETIQUETA_CONFIG_PADRAO)
  useEffect(() => {
    if (!config) setCfg(lerEtiquetaConfig())
  }, [config])
  const { larguraMm, alturaMm } = config ?? cfg

  return (
    <>
      <div className="etiqueta-print-area" aria-hidden>
        {etiquetas.map((e) => (
          <div className="etiqueta-page" key={e.id}>
            <EtiquetaLabel etiqueta={e} larguraMm={larguraMm} alturaMm={alturaMm} />
          </div>
        ))}
      </div>

      <style>{`
        .etiqueta-print-area { display: none; }
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
          body * { visibility: hidden; }
          .etiqueta-print-area, .etiqueta-print-area * { visibility: visible; }
          .etiqueta-print-area {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
          }
          .etiqueta-page {
            width: ${larguraMm}mm;
            height: ${alturaMm}mm;
            page-break-after: always;
            break-after: page;
            overflow: hidden;
          }
          .etiqueta-page:last-child { page-break-after: auto; }
          @page { size: ${larguraMm}mm ${alturaMm}mm; margin: 0; }
        }
      `}</style>
    </>
  )
}
