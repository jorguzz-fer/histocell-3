'use client'

import { useRef } from 'react'
import { Printer } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

/**
 * Modal de impressão: embute a página imprimível (OS, etiquetas de recipiente…)
 * num iframe, com botão "Imprimir", em vez de abrir uma nova aba do navegador.
 * Pedido do check de 28/07 (o Célio se perdia com a aba nova).
 */
export function PrintModal({
  open,
  onClose,
  url,
  title,
}: {
  open: boolean
  onClose: () => void
  url: string | null
  title: string
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  function imprimir() {
    const win = iframeRef.current?.contentWindow
    if (win) {
      win.focus()
      win.print()
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-3xl"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Fechar
          </button>
          <button
            onClick={imprimir}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir
          </button>
        </>
      }
    >
      {url && (
        <iframe
          ref={iframeRef}
          src={url}
          title={title}
          className="w-full h-[60vh] rounded-md border border-slate-200 dark:border-slate-700 bg-white"
        />
      )}
    </Modal>
  )
}
