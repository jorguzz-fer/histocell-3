'use client'

import { useEffect, useRef, useState } from 'react'
import { LogIn, LogOut, ScanLine } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'
import type { Departamento, ScanResponse } from './types'

interface Props {
  departamentos: Departamento[]
  /** Quando informado, trava o departamento (painel do próprio setor). */
  fixedDepartamento?: string
  onScanned?: (res: ScanResponse) => void
}

export function ScanBox({ departamentos, fixedDepartamento, onScanned }: Props) {
  const [departamento, setDepartamento] = useState(fixedDepartamento ?? '')
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada')
  const [codigo, setCodigo] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (fixedDepartamento) setDepartamento(fixedDepartamento)
    else if (!departamento && departamentos.length) setDepartamento(departamentos[0].key)
  }, [fixedDepartamento, departamentos]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = codigo.trim()
    if (!code) return
    if (!departamento) {
      toast.error('Selecione o departamento.')
      return
    }
    setSaving(true)
    try {
      let scannedPor: string | undefined
      try { scannedPor = JSON.parse(localStorage.getItem('user') || '{}')?.nome } catch {}
      const res = await api.post<ScanResponse>('/rastreio/scan', {
        codigo: code,
        departamento,
        tipo,
        scannedPor,
      })
      toast.success(res.message)
      onScanned?.(res)
      setCodigo('')
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao registrar scan')
    } finally {
      setSaving(false)
      inputRef.current?.focus()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4 space-y-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        {!fixedDepartamento && (
          <div className="w-56">
            <Select
              label="Departamento"
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
              options={departamentos.map((d) => ({ value: d.key, label: d.label }))}
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Ação</span>
          <div className="flex rounded-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setTipo('entrada')}
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors ${
                tipo === 'entrada'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <LogIn className="h-4 w-4" /> Entrada
            </button>
            <button
              type="button"
              onClick={() => setTipo('saida')}
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors ${
                tipo === 'saida'
                  ? 'bg-amber-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <LogOut className="h-4 w-4" /> Saída
            </button>
          </div>
        </div>

        <div className="flex-1 min-w-[220px] flex flex-col gap-1">
          <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
            Código de barras
          </label>
          <div className="relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              ref={inputRef}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Escaneie ou digite o código e tecle Enter…"
              autoComplete="off"
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 pl-9 pr-3 py-2 text-[13px]
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        <Button type="submit" loading={saving} disabled={!codigo.trim()}>
          Registrar
        </Button>
      </div>
    </form>
  )
}
