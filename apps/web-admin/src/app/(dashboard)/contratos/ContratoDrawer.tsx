'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'
import type { Contrato } from './types'

type ClienteOpt = { id: number; nome: string; nomeFantasia?: string | null }

interface Props {
  open: boolean
  onClose: () => void
  contrato: Contrato | null
  onSaved: () => void
}

export function ContratoDrawer({ open, onClose, contrato, onSaved }: Props) {
  const isEdit = !!contrato
  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [clienteId, setClienteId] = useState('')
  const [valorMensal, setValorMensal] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [duracaoMeses, setDuracaoMeses] = useState('12')
  const [diaCobranca, setDiaCobranca] = useState('5')
  const [observacoes, setObservacoes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      api.get<{ data: ClienteOpt[] }>('/clientes?limit=1000')
        .then((r) => setClientes(r.data ?? []))
        .catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setClienteId(contrato ? String(contrato.clienteId) : '')
      setValorMensal(contrato ? String(contrato.valorMensal) : '')
      setDataInicio(contrato ? contrato.dataInicio.slice(0, 10) : new Date().toISOString().slice(0, 10))
      setDuracaoMeses(contrato ? String(contrato.duracaoMeses) : '12')
      setDiaCobranca(contrato ? String(contrato.diaCobranca) : '5')
      setObservacoes(contrato?.observacoes ?? '')
    }
  }, [open, contrato])

  const fim = useMemo(() => {
    const d = new Date(dataInicio)
    if (isNaN(d.getTime())) return ''
    const dia = d.getDate()
    d.setMonth(d.getMonth() + (parseInt(duracaoMeses, 10) || 0))
    if (d.getDate() < dia) d.setDate(0)
    return d.toLocaleDateString('pt-BR')
  }, [dataInicio, duracaoMeses])

  async function salvar() {
    if (!clienteId) { toast.error('Selecione o cliente.'); return }
    if (!valorMensal || Number(valorMensal) <= 0) { toast.error('Informe o valor mensal.'); return }
    if (!dataInicio) { toast.error('Informe a data de início.'); return }
    setSaving(true)
    try {
      const payload = {
        clienteId: Number(clienteId),
        valorMensal: Number(valorMensal),
        dataInicio,
        duracaoMeses: Math.max(1, parseInt(duracaoMeses, 10) || 1),
        diaCobranca: Math.min(28, Math.max(1, parseInt(diaCobranca, 10) || 1)),
        observacoes: observacoes.trim() || undefined,
      }
      if (isEdit) await api.patch(`/contratos/${contrato!.id}`, payload)
      else await api.post('/contratos', payload)
      toast.success(isEdit ? 'Contrato atualizado.' : 'Contrato criado.')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar contrato')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Editar contrato' : 'Novo contrato'} width="max-w-md">
      <div className="space-y-4">
        <Select
          label="Cliente"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          disabled={isEdit}
          options={[
            { value: '', label: 'Selecione o cliente…' },
            ...clientes.map((c) => ({ value: String(c.id), label: c.nomeFantasia ? `${c.nomeFantasia} — ${c.nome}` : c.nome })),
          ]}
        />
        <Input
          label="Valor mensal (R$)"
          type="number"
          min={0}
          step="0.01"
          value={valorMensal}
          onChange={(e) => setValorMensal(e.target.value)}
          placeholder="0,00"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Início"
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
          <Input
            label="Duração (meses)"
            type="number"
            min={1}
            value={duracaoMeses}
            onChange={(e) => setDuracaoMeses(e.target.value)}
          />
        </div>
        <p className="text-[12px] text-slate-500 dark:text-slate-400">
          Vencimento: <strong>{fim || '—'}</strong>
        </p>
        <Input
          label="Dia da cobrança (1–28)"
          type="number"
          min={1}
          max={28}
          value={diaCobranca}
          onChange={(e) => setDiaCobranca(e.target.value)}
          hint="Dia do mês em que a mensalidade é cobrada (separada do consumo)"
        />
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={2}
          placeholder="Observações (opcional)"
          className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-[13px] bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} loading={saving}>{isEdit ? 'Salvar' : 'Criar contrato'}</Button>
        </div>
      </div>
    </Drawer>
  )
}
