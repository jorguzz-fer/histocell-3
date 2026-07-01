import { EtiquetaLabel } from './EtiquetaLabel'
import type { Etiqueta } from './types'
import { lerEtiquetaConfig, type EtiquetaConfig } from './etiquetaConfig'

/**
 * Área oculta em tela e visível apenas na impressão (window.print()).
 * Cada etiqueta ocupa UMA página do tamanho configurado (largura×altura),
 * empilhadas uma embaixo da outra — formato adequado para impressora de
 * etiqueta (Zebra), e não folha A4.
 */
export function EtiquetaPrintArea({ etiquetas, config }: { etiquetas: Etiqueta[]; config?: EtiquetaConfig }) {
  const { larguraMm, alturaMm } = config ?? lerEtiquetaConfig()

  return (
    <>
      <div className="etiqueta-print-area" aria-hidden>
        {etiquetas.map((e) => (
          <div className="etiqueta-page" key={e.id}>
            <EtiquetaLabel etiqueta={e} />
          </div>
        ))}
      </div>

      <style>{`
        .etiqueta-print-area { display: none; }
        .etiqueta-label {
          box-sizing: border-box;
          width: ${larguraMm}mm;
          height: ${alturaMm}mm;
          padding: 1mm 1.5mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.1;
          overflow: hidden;
          break-inside: avoid;
        }
        .etiqueta-ident { font-size: 7pt; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .etiqueta-coloracao { font-size: 9pt; font-weight: 700; }
        .etiqueta-barcode { width: 100%; height: auto; }
        .etiqueta-numero { font-family: 'Courier New', monospace; font-size: 8pt; }
        .etiqueta-histocell { font-size: 8pt; }
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
