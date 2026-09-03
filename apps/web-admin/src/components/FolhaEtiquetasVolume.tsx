'use client'

import { Barcode } from '@/components/ui/Barcode'

/** Etiqueta física do volume recebido — 10 cm × 3 cm. */
export const ETIQUETA_LARGURA_MM = 100
export const ETIQUETA_ALTURA_MM = 30

/**
 * Orçamento vertical dos 30mm. As fontes são as maiores que cabem deixando
 * folga — a etiqueta é lida de longe, na bancada:
 *
 *   2.4 (padding) + 6.0 (cliente) + 3.9 (info) + 10.5 (barras) + 4.0 (código)
 *   + 1.5 (gaps) + 0.5 (respiro do código) = 28.8mm  →  1.1mm de folga
 *
 * A folga existe porque a fonte real do sistema pode medir um pouco mais que a
 * conta acima. Sem ela, o conteúdo estoura e o `overflow: hidden` corta o nome
 * do cliente — que é justamente a informação que a etiqueta precisa mostrar.
 */
const CLIENTE_MM = 5.2
const INFO_MM = 3.4
const BARRAS_ALTURA_MM = 10.5
const CODIGO_MM = 3.6

export type VolumeEtiqueta = {
  /** chave de render */
  id: number
  /** conteúdo do código de barras */
  codigo: string
  /** canto direito da linha de informação (ex.: "Pote 01 de 03") */
  direita: string
  /** nome do paciente (Macroscopia): vira a linha de destaque quando presente */
  paciente?: string | null
}

interface Props {
  /** Linha de destaque: idEtiqueta, apelido ou razão social do cliente. */
  clienteLabel: string
  /** Canto esquerdo da linha de informação (ex.: "Entrada · 05/08/2026"). */
  esquerda: string
  volumes: VolumeEtiqueta[]
}

/**
 * Folha de etiquetas de volume, uma por página. Usada tanto pela tela Entrada
 * quanto pelos recipientes da Recepção — é a mesma etiqueta física, então mora
 * num componente só para as duas não divergirem.
 */
export function FolhaEtiquetasVolume({ clienteLabel, esquerda, volumes }: Props) {
  return (
    <>
      <div className="etq-vol-area flex flex-col items-center gap-3 p-6">
        {volumes.map((v) => (
          <div className="etq-vol-page" key={v.id}>
            <div className="etq-vol">
              {/* No fluxo Macroscopia o paciente é o destaque; o cliente desce
                  para a linha de informação. Mantém o mesmo orçamento vertical. */}
              <div className="etq-vol-cliente">{v.paciente || clienteLabel}</div>
              <div className="etq-vol-info">
                <span>{v.paciente ? clienteLabel : esquerda}</span>
                <span>{v.direita}</span>
              </div>
              {/* O código legível fica FORA do SVG: dentro dele, o esticamento
                  horizontal das barras deformaria os dígitos junto. */}
              <Barcode value={v.codigo} height={46} width={1.2} stretch className="etq-vol-barcode" />
              <div className="etq-vol-codigo">{v.codigo}</div>
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .etq-vol {
          box-sizing: border-box;
          width: ${ETIQUETA_LARGURA_MM}mm;
          height: ${ETIQUETA_ALTURA_MM}mm;
          padding: 1.2mm 3mm;
          display: flex;
          flex-direction: column;
          /* topo, e não centro: se algo ainda sobrar, sobra embaixo — o nome
             do cliente nunca é o que se perde. */
          justify-content: flex-start;
          gap: 0.5mm;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
          overflow: hidden;
        }
        .etq-vol-cliente {
          font-size: ${CLIENTE_MM}mm;
          line-height: 1.15;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          /* não deixa a linha ser espremida pelo que vem depois */
          flex: 0 0 auto;
        }
        .etq-vol-info {
          display: flex;
          justify-content: space-between;
          gap: 4mm;
          font-size: ${INFO_MM}mm;
          line-height: 1.15;
          flex: 0 0 auto;
          white-space: nowrap;
        }
        .etq-vol-info span {
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .etq-vol-barcode {
          display: block;
          width: 100%;
          /* altura fixa: o viewBox elástico do Barcode impede que a largura
             total arraste a altura junto. */
          height: ${BARRAS_ALTURA_MM}mm;
          flex: 0 0 auto;
          margin-top: auto;
        }
        .etq-vol-codigo {
          font-size: ${CODIGO_MM}mm;
          line-height: 1.1;
          /* separa do fim das barras — colado, lê-se como parte do símbolo */
          margin-top: 0.5mm;
          font-weight: 700;
          letter-spacing: 0.5mm;
          text-align: center;
          font-family: 'Courier New', Courier, monospace;
          flex: 0 0 auto;
        }
        /* Prévia em tela: mostra a borda do tamanho real da etiqueta */
        .etq-vol-page {
          border: 1px dashed #cbd5e1;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .etq-vol-area {
            padding: 0 !important;
            gap: 0 !important;
          }
          .etq-vol-page {
            border: none !important;
            width: ${ETIQUETA_LARGURA_MM}mm;
            height: ${ETIQUETA_ALTURA_MM}mm;
            page-break-after: always;
            break-after: page;
            overflow: hidden;
          }
          .etq-vol-page:last-child {
            page-break-after: auto;
          }
          @page {
            size: ${ETIQUETA_LARGURA_MM}mm ${ETIQUETA_ALTURA_MM}mm;
            margin: 0;
          }
        }
      `}</style>
    </>
  )
}
