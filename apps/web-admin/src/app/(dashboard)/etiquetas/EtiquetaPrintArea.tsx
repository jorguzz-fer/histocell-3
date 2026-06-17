import { EtiquetaLabel } from './EtiquetaLabel'
import type { Etiqueta } from './types'

/**
 * Área oculta em tela e visível apenas na impressão (window.print()).
 * Centraliza o layout físico da etiqueta (50mm) para reuso entre a lista
 * e a conferência do pedido.
 */
export function EtiquetaPrintArea({ etiquetas }: { etiquetas: Etiqueta[] }) {
  return (
    <>
      <div className="etiqueta-print-area" aria-hidden>
        {etiquetas.map((e) => (
          <EtiquetaLabel key={e.id} etiqueta={e} />
        ))}
      </div>

      <style>{`
        .etiqueta-print-area { display: none; }
        .etiqueta-label {
          box-sizing: border-box;
          width: 50mm;
          padding: 1mm 1.5mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.15;
          break-inside: avoid;
        }
        .etiqueta-ident { font-size: 7pt; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .etiqueta-coloracao { font-size: 10pt; font-weight: 700; }
        .etiqueta-barcode { width: 100%; height: auto; }
        .etiqueta-numero { font-family: 'Courier New', monospace; font-size: 8pt; }
        .etiqueta-histocell { font-size: 8pt; }
        @media print {
          body * { visibility: hidden; }
          .etiqueta-print-area, .etiqueta-print-area * { visibility: visible; }
          .etiqueta-print-area {
            display: flex !important;
            flex-wrap: wrap;
            align-content: flex-start;
            gap: 2mm;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page { margin: 8mm; }
        }
      `}</style>
    </>
  )
}
