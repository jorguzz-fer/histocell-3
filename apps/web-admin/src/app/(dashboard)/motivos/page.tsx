'use client'

import { useCallback, useEffect, useState } from 'react'
import { MessageSquare, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'

type Motivo = { id: number; setor: string; titulo: string; mensagemTemplate: string; notificaCliente: boolean; ativo: boolean }

const SETORES = [
  { value: 'recepcao', label: 'Recepção' },
  { value: 'macroscopia', label: 'Macroscopia' },
  { value: 'tecnica', label: 'Técnica' },
  { value: 'coloracao', label: 'Coloração' },
  { value: 'expedicao', label: 'Expedição' },
  { value: 'geral', label: 'Geral' },
]
const setorLabel = (s: string) => SETORES.find((x) => x.value === s)?.label ?? s

export default function MotivosPage() {
  const [motivos, setMotivos] = useState<Motivo[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<Motivo | null>(null)
  const [criando, setCriando] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get<Motivo[]>('/comunicacao/motivos?incluirInativos=true')
      .then(setMotivos).catch(() => toast.error('Erro ao carregar motivos')).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  async function arquivar(m: Motivo) {
    if (!confirm(`Arquivar o motivo "${m.titulo}"?`)) return
    try { await api.delete(`/comunicacao/motivos/${m.id}`); toast.success('Arquivado'); load() }
    catch (e: any) { toast.error(e.message ?? 'Erro') }
  }

  const grupos = SETORES.map((s) => ({ setor: s.value, label: s.label, itens: motivos.filter((m) => m.setor === s.value) }))
    .filter((g) => g.itens.length > 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Motivos de comunicação"
        subtitle="Mensagens pré-prontas por setor, enviadas ao cliente ao registrar uma ocorrência"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Atualizar</Button>
            <Button onClick={() => setCriando(true)}><Plus className="h-4 w-4 mr-1.5" /> Novo motivo</Button>
          </div>
        }
      />

      {loading ? (
        <p className="text-sm text-slate-400">Carregando…</p>
      ) : grupos.map((g) => (
        <div key={g.setor} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{g.label}</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {g.itens.map((m) => (
              <div key={m.id} className={`px-4 py-3 flex items-start gap-3 ${!m.ativo ? 'opacity-50' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100">{m.titulo}</span>
                    {m.notificaCliente ? <Badge variant="blue">notifica cliente</Badge> : <Badge variant="slate">interno</Badge>}
                    {!m.ativo && <Badge variant="slate">arquivado</Badge>}
                  </div>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{m.mensagemTemplate}</p>
                </div>
                <button onClick={() => setEditando(m)} className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => arquivar(m)} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" /> Variáveis: <code>{'{cliente}'}</code> <code>{'{pedido}'}</code> <code>{'{itens}'}</code> <code>{'{obs}'}</code>
      </p>

      {(criando || editando) && (
        <MotivoModal motivo={editando} onClose={() => { setCriando(false); setEditando(null) }} onSaved={() => { setCriando(false); setEditando(null); load() }} />
      )}
    </div>
  )
}

function MotivoModal({ motivo, onClose, onSaved }: { motivo: Motivo | null; onClose: () => void; onSaved: () => void }) {
  const [setor, setSetor] = useState(motivo?.setor ?? 'recepcao')
  const [titulo, setTitulo] = useState(motivo?.titulo ?? '')
  const [tpl, setTpl] = useState(motivo?.mensagemTemplate ?? 'Olá {cliente}, referente ao pedido {pedido}: {obs}')
  const [notifica, setNotifica] = useState(motivo?.notificaCliente ?? true)
  const [saving, setSaving] = useState(false)

  async function salvar() {
    if (!titulo.trim() || !tpl.trim()) { toast.error('Preencha título e mensagem'); return }
    setSaving(true)
    try {
      const body = { setor, titulo: titulo.trim(), mensagemTemplate: tpl.trim(), notificaCliente: notifica }
      if (motivo) await api.patch(`/comunicacao/motivos/${motivo.id}`, body)
      else await api.post('/comunicacao/motivos', body)
      toast.success(motivo ? 'Motivo atualizado' : 'Motivo criado')
      onSaved()
    } catch (e: any) { toast.error(e.message ?? 'Erro ao salvar') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{motivo ? 'Editar motivo' : 'Novo motivo'}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Setor" value={setor} onChange={(e) => setSetor(e.target.value)} options={SETORES} />
          <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Amostra faltante" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Mensagem (template)</label>
          <textarea value={tpl} onChange={(e) => setTpl(e.target.value)} rows={4}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[13px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="text-[11px] text-slate-400">Variáveis: {'{cliente}'} {'{pedido}'} {'{itens}'} {'{obs}'}</span>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={notifica} onChange={(e) => setNotifica(e.target.checked)} className="h-4 w-4 accent-blue-600" />
          Notifica o cliente por e-mail
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} loading={saving}>{motivo ? 'Salvar' : 'Criar'}</Button>
        </div>
      </div>
    </div>
  )
}
