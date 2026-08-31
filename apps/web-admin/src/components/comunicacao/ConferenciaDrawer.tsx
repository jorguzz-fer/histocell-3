'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ScanLine, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'

type EtiquetaConf = { id: number; codigo: string; numero: number; laminaSeq: number; coloracao?: string | null; conferidaEm?: string | null; conferidaPor?: string | null }
type StatusConf = {
  esperado: number; conferidas: number; faltantes: number; completo: boolean
  /** Carimbo de saída: o código da própria OS foi bipado. */
  osNumero: string; saidaConferida: boolean; saidaConferidaPor?: string | null
  liberada: boolean; obs?: string | null; etiquetas: EtiquetaConf[]
}

interface Props {
  open: boolean
  onClose: () => void
  ordemId: number
  numero?: string
  onChange?: () => void
}

export function ConferenciaDrawer({ open, onClose, ordemId, numero, onChange }: Props) {
  const [status, setStatus] = useState<StatusConf | null>(null)
  const [codigo, setCodigo] = useState('')
  const [saving, setSaving] = useState(false)
  const [obs, setObs] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const carregar = useCallback(() => {
    api.get<StatusConf>(`/ordens/${ordemId}/conferencia`).then(setStatus).catch(() => {})
  }, [ordemId])

  useEffect(() => { if (open) { carregar(); setTimeout(() => inputRef.current?.focus(), 100) } }, [open, carregar])

  async function bipar(e: React.FormEvent) {
    e.preventDefault()
    const cod = codigo.trim()
    if (!cod) return
    setSaving(true)
    try {
      const s = await api.post<StatusConf>(`/ordens/${ordemId}/conferir`, { codigo: cod })
      setStatus(s); setCodigo('')
      if (s.completo && s.saidaConferida) toast.success('Conferência de saída completa!')
    } catch (err: any) {
      toast.error(err.message ?? 'Etiqueta inválida')
    } finally { setSaving(false); inputRef.current?.focus() }
  }

  // O botão faz o mesmo que o leitor: bipa o código da própria OS.
  async function confirmarSaida() {
    if (!status) return
    setSaving(true)
    try {
      const s = await api.post<StatusConf>(`/ordens/${ordemId}/conferir`, { codigo: status.osNumero })
      setStatus(s); onChange?.()
      toast.success('Saída da OS confirmada.')
    } catch (err: any) { toast.error(err.message ?? 'Erro ao confirmar saída') } finally { setSaving(false) }
  }

  async function liberar() {
    if (!obs.trim()) { toast.error('Informe a justificativa.'); return }
    setSaving(true)
    try {
      const s = await api.post<StatusConf>(`/ordens/${ordemId}/conferencia/liberar`, { obs: obs.trim() })
      setStatus(s); onChange?.()
      toast.success('Liberada com justificativa.')
    } catch (err: any) { toast.error(err.message ?? 'Erro ao liberar') } finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { onChange?.(); onClose() }} />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
          Conferência de saída {numero ? `· ${numero}` : ''}
        </h2>

        {status && (
          <div className="space-y-1.5">
            {status.esperado > 0 && (
              <div className="flex items-center gap-2 text-[13px]">
                <span className={`font-semibold ${status.completo || status.liberada ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {status.conferidas}/{status.esperado} lâminas
                </span>
                {status.completo && <span className="text-emerald-600">✓ completo</span>}
              </div>
            )}
            {/* Carimbo de saída: toda OS precisa do próprio código bipado para
                concluir — é o que cobre os serviços que não geram etiqueta. */}
            <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-[13px]
              border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-300">
                Saída da OS <span className="font-mono text-slate-400">{status.osNumero}</span>
              </span>
              {status.saidaConferida ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> bipada{status.saidaConferidaPor ? ` · ${status.saidaConferidaPor}` : ''}
                </span>
              ) : (
                <Button size="sm" variant="secondary" loading={saving}
                  title="O mesmo que bipar o código de barras da OS na folha impressa"
                  onClick={confirmarSaida}>
                  Confirmar saída
                </Button>
              )}
            </div>
            {!status.completo && status.liberada && (
              <p className="text-[12px] text-amber-600">liberado c/ justificativa</p>
            )}
          </div>
        )}

        <form onSubmit={bipar} className="relative">
          <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Bipe a etiqueta ou o código da OS…"
            autoComplete="off"
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 pl-9 pr-3 py-2 text-[13px]
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>

        <div className="space-y-1.5 max-h-52 overflow-y-auto">
          {(status?.etiquetas ?? []).map((e) => (
            <div key={e.id}
              className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-[13px] border
                ${e.conferidaEm
                  ? 'border-emerald-200 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10'
                  : 'border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10'}`}>
              <span className="font-mono text-slate-700 dark:text-slate-200">
                {e.codigo}{e.coloracao ? ` · ${e.coloracao}` : ''}
              </span>
              {e.conferidaEm
                ? <span className="text-emerald-600 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> ok</span>
                : <span className="text-rose-600 font-medium">falta</span>}
            </div>
          ))}
          {status && status.etiquetas.length === 0 && (
            <p className="text-[12px] text-slate-400 text-center py-3">Esta OS não tem etiquetas — a saída é confirmada bipando o código da OS.</p>
          )}
        </div>

        {status && (!status.completo || !status.saidaConferida) && !status.liberada && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-500/5 p-3 space-y-2">
            <p className="text-[12px] text-amber-800 dark:text-amber-300">
              {status.faltantes > 0
                ? `Faltam ${status.faltantes} lâmina(s)`
                : 'Falta o carimbo de saída da OS'}
              . Para liberar mesmo assim (ex.: lâmina será refeita), justifique:
            </p>
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2}
              placeholder="Justificativa…"
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <Button variant="secondary" onClick={liberar} loading={saving} className="w-full">Liberar com justificativa</Button>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={() => { onChange?.(); onClose() }}>Fechar</Button>
        </div>
      </div>
    </div>
  )
}
