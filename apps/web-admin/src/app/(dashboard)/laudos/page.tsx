'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Mail, Upload, Download, Plus, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ClienteAvatar } from '@/components/ui/ClienteAvatar'
import { api } from '@/lib/api'

type Laudo = {
  id: number
  pedidoId: number
  patologistaNome?: string | null
  patologistaEmail?: string | null
  arquivoNome?: string | null
  status: string
  solicitadoPor?: string | null
  solicitadoEm?: string | null
  liberado: boolean
  liberadoEm?: string | null
  pedido?: { numero: string; cliente: { id: number; nome: string; nomeFantasia?: string | null } }
}

type PedidoOpt = { id: number; numero: string; clienteNome: string; clienteNomeFantasia?: string | null }

function fmt(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export default function LaudosPage() {
  const [laudos, setLaudos] = useState<Laudo[]>([])
  const [pedidos, setPedidos] = useState<PedidoOpt[]>([])
  const [loading, setLoading] = useState(true)

  // form de solicitação
  const [pedidoId, setPedidoId] = useState('')
  const [patoNome, setPatoNome] = useState('')
  const [patoEmail, setPatoEmail] = useState('')
  const [saving, setSaving] = useState(false)

  const uploadRef = useRef<HTMLInputElement>(null)
  const [liberandoId, setLiberandoId] = useState<number | null>(null)

  const carregar = useCallback(() => {
    setLoading(true)
    api.get<Laudo[]>('/laudos').then(setLaudos).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    carregar()
    api.get<{ data: PedidoOpt[] }>('/pedidos?limit=100').then((r) => setPedidos(r.data)).catch(() => {})
  }, [carregar])

  async function solicitar(e: React.FormEvent) {
    e.preventDefault()
    if (!pedidoId) { toast.error('Selecione o pedido.'); return }
    if (!patoEmail.trim()) { toast.error('Informe o e-mail do patologista.'); return }
    setSaving(true)
    try {
      await api.post('/laudos', {
        pedidoId: Number(pedidoId),
        patologistaNome: patoNome.trim() || undefined,
        patologistaEmail: patoEmail.trim(),
      })
      toast.success('Laudo solicitado.')
      setPedidoId(''); setPatoNome(''); setPatoEmail('')
      carregar()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao solicitar laudo')
    } finally {
      setSaving(false)
    }
  }

  function enviarEmail(l: Laudo) {
    const num = l.pedido?.numero ?? `#${l.pedidoId}`
    const cli = l.pedido?.cliente.nomeFantasia ?? l.pedido?.cliente.nome ?? ''
    const assunto = encodeURIComponent(`Laudo — pedido ${num} (Histocell)`)
    const corpo = encodeURIComponent(
      `Olá${l.patologistaNome ? ' ' + l.patologistaNome : ''},\n\n` +
      `Segue solicitação de laudo referente ao pedido ${num}${cli ? ' — ' + cli : ''}.\n` +
      `Por favor, faça a leitura das lâminas e responda este e-mail anexando o laudo em PDF.\n\n` +
      `Obrigado,\nHistocell`,
    )
    window.location.href = `mailto:${l.patologistaEmail}?subject=${assunto}&body=${corpo}`
  }

  async function onUpload(file: File) {
    if (liberandoId == null) return
    try {
      const base64 = await fileToBase64(file)
      await api.patch(`/laudos/${liberandoId}/liberar`, { arquivoBase64: base64, arquivoNome: file.name })
      toast.success('Laudo liberado ao cliente.')
      carregar()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao anexar laudo')
    } finally {
      setLiberandoId(null)
      if (uploadRef.current) uploadRef.current.value = ''
    }
  }

  async function baixar(l: Laudo) {
    try {
      const r = await api.get<{ arquivoBase64: string; arquivoNome: string }>(`/laudos/${l.id}/arquivo`)
      const link = document.createElement('a')
      link.href = `data:application/pdf;base64,${r.arquivoBase64}`
      link.download = r.arquivoNome || 'laudo.pdf'
      link.click()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao baixar')
    }
  }

  async function excluir(l: Laudo) {
    if (!confirm(`Excluir o laudo do pedido ${l.pedido?.numero ?? l.pedidoId}?`)) return
    try {
      await api.delete(`/laudos/${l.id}`)
      toast.success('Laudo excluído'); carregar()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao excluir')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laudos"
        subtitle="Solicite o laudo ao patologista (por e-mail) e libere o PDF ao cliente"
        action={<Button variant="secondary" onClick={carregar}><RefreshCw className="h-4 w-4 mr-1.5" /> Atualizar</Button>}
      />

      {/* Solicitar laudo */}
      <form onSubmit={solicitar} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_auto] gap-3 items-end">
          <Select
            label="Pedido"
            value={pedidoId}
            onChange={(e) => setPedidoId(e.target.value)}
            options={[
              { value: '', label: 'Selecione o pedido…' },
              ...pedidos.map((p) => ({ value: String(p.id), label: `${p.numero} — ${p.clienteNomeFantasia ?? p.clienteNome}` })),
            ]}
          />
          <Input label="Patologista (nome)" value={patoNome} onChange={(e) => setPatoNome(e.target.value)} placeholder="Dr(a). …" />
          <Input label="E-mail do patologista" type="email" value={patoEmail} onChange={(e) => setPatoEmail(e.target.value)} placeholder="patologista@email.com" />
          <Button type="submit" loading={saving}><Plus className="h-4 w-4 mr-1.5" /> Solicitar</Button>
        </div>
      </form>

      {/* input de upload escondido */}
      <input
        ref={uploadRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f) }}
      />

      {/* Lista */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card overflow-hidden">
        {loading ? (
          <p className="py-12 text-center text-[13px] text-slate-400">Carregando…</p>
        ) : laudos.length === 0 ? (
          <p className="py-12 text-center text-[13px] text-slate-400">Nenhum laudo ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 text-left">
                <tr>
                  <th className="px-4 py-2 font-semibold">Pedido</th>
                  <th className="px-4 py-2 font-semibold">Cliente</th>
                  <th className="px-4 py-2 font-semibold">Patologista</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold">Solicitado</th>
                  <th className="px-4 py-2 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {laudos.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2 font-mono text-slate-700 dark:text-slate-200">{l.pedido?.numero ?? `#${l.pedidoId}`}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300 max-w-[180px]">
                      {l.pedido?.cliente ? (
                        <div className="flex items-center gap-2">
                          <ClienteAvatar
                            nome={l.pedido.cliente.nomeFantasia ?? l.pedido.cliente.nome}
                            seed={l.pedido.cliente.id}
                            size={24}
                          />
                          <span className="truncate">{l.pedido.cliente.nomeFantasia ?? l.pedido.cliente.nome}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                      {l.patologistaNome ?? '—'}<br /><span className="text-[11px] text-slate-400">{l.patologistaEmail}</span>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={l.liberado ? 'green' : 'amber'}>{l.liberado ? 'Liberado' : 'Solicitado'}</Badge>
                    </td>
                    <td className="px-4 py-2 text-slate-500">{fmt(l.solicitadoEm)}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        {!l.liberado && (
                          <>
                            <button onClick={() => enviarEmail(l)} title="Enviar e-mail ao patologista" className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded">
                              <Mail className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => { setLiberandoId(l.id); uploadRef.current?.click() }} title="Anexar PDF e liberar" className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded">
                              <Upload className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        {l.liberado && (
                          <button onClick={() => baixar(l)} title="Baixar PDF" className="p-1.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => excluir(l)} title="Excluir" className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5" />
        Fluxo: solicitar → enviar e-mail ao patologista → anexar o PDF que ele devolver → libera no portal do cliente.
      </p>
    </div>
  )
}
