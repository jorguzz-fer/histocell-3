'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'

type Motivo = { id: number; setor: string; titulo: string; mensagemTemplate: string; notificaCliente: boolean }
type Comunicacao = { id: number; setor: string; tipo: string; assunto: string; mensagem: string; emailEnviado: boolean; emailInfo?: string | null; criadoPor?: string | null; createdAt: string }

const SETORES = [
  { value: 'recepcao', label: 'Recepção' },
  { value: 'macroscopia', label: 'Macroscopia' },
  { value: 'tecnica', label: 'Técnica' },
  { value: 'coloracao', label: 'Coloração' },
  { value: 'expedicao', label: 'Expedição' },
  { value: 'geral', label: 'Geral' },
]

function fmt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

interface Props {
  open: boolean
  onClose: () => void
  pedidoId: number
  ordemServicoId?: number
  pedidoNumero?: string
}

export function ComunicacaoDrawer({ open, onClose, pedidoId, ordemServicoId, pedidoNumero }: Props) {
  const [tab, setTab] = useState<'ocorrencia' | 'pronto' | 'historico'>('ocorrencia')
  const [motivos, setMotivos] = useState<Motivo[]>([])
  const [historico, setHistorico] = useState<Comunicacao[]>([])
  const [saving, setSaving] = useState(false)

  // ocorrência
  const [setor, setSetor] = useState('recepcao')
  const [motivoId, setMotivoId] = useState('')
  const [obs, setObs] = useState('')
  const [notificar, setNotificar] = useState(true)
  // pronto
  const [prontos, setProntos] = useState('')
  const [pendentes, setPendentes] = useState('')
  const [obsPronto, setObsPronto] = useState('')

  const carregarHistorico = useCallback(() => {
    api.get<Comunicacao[]>(`/comunicacao/pedido/${pedidoId}`).then(setHistorico).catch(() => {})
  }, [pedidoId])

  useEffect(() => {
    if (!open) return
    api.get<Motivo[]>('/comunicacao/motivos').then(setMotivos).catch(() => {})
    carregarHistorico()
  }, [open, carregarHistorico])

  const motivosSetor = motivos.filter((m) => m.setor === setor)
  const motivoSel = motivos.find((m) => String(m.id) === motivoId)

  async function enviarOcorrencia() {
    setSaving(true)
    try {
      await api.post('/comunicacao/ocorrencia', {
        pedidoId, ordemServicoId, motivoId: motivoId ? Number(motivoId) : undefined,
        setor, obs: obs.trim() || undefined, notificarCliente: notificar,
      })
      toast.success(notificar ? 'Ocorrência registrada e cliente notificado.' : 'Ocorrência registrada.')
      setObs(''); setMotivoId(''); carregarHistorico(); setTab('historico')
    } catch (e: any) { toast.error(e.message ?? 'Erro ao registrar') } finally { setSaving(false) }
  }

  async function enviarPronto() {
    setSaving(true)
    try {
      await api.post('/comunicacao/notificar-pronto', {
        pedidoId, ordemServicoId,
        itensProntos: prontos.trim() || undefined, itensPendentes: pendentes.trim() || undefined, obs: obsPronto.trim() || undefined,
      })
      toast.success('Cliente notificado.')
      setProntos(''); setPendentes(''); setObsPronto(''); carregarHistorico(); setTab('historico')
    } catch (e: any) { toast.error(e.message ?? 'Erro ao notificar') } finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
          Comunicação {pedidoNumero ? `· ${pedidoNumero}` : ''}
        </h2>

        <div className="flex rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 text-[13px]">
          {(['ocorrencia', 'pronto', 'historico'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 px-3 py-2 font-medium ${tab === t ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
              {t === 'ocorrencia' ? 'Ocorrência' : t === 'pronto' ? 'Pronto p/ retirada' : 'Histórico'}
            </button>
          ))}
        </div>

        {tab === 'ocorrencia' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Select label="Setor" value={setor} onChange={(e) => { setSetor(e.target.value); setMotivoId('') }} options={SETORES} />
              <Select label="Motivo" value={motivoId} onChange={(e) => setMotivoId(e.target.value)}
                options={[{ value: '', label: 'Selecione…' }, ...motivosSetor.map((m) => ({ value: String(m.id), label: m.titulo }))]} />
            </div>
            <div>
              <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Observação</label>
              <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2}
                placeholder="Ex.: Solicitado 10, recebido 9."
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {motivoSel && (
              <div className="rounded-md bg-slate-50 dark:bg-slate-800/50 p-2.5 text-[12px] text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">Prévia:</span> {motivoSel.mensagemTemplate.replace('{obs}', obs).replace('{cliente}', 'cliente').replace('{pedido}', pedidoNumero ?? '')}
              </div>
            )}
            <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={notificar} onChange={(e) => setNotificar(e.target.checked)} className="h-4 w-4 accent-blue-600" />
              Notificar o cliente por e-mail
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Fechar</Button>
              <Button onClick={enviarOcorrencia} loading={saving} disabled={!motivoId && !obs.trim()}>Registrar</Button>
            </div>
          </div>
        )}

        {tab === 'pronto' && (
          <div className="space-y-3">
            <div>
              <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Itens prontos (retirada)</label>
              <input value={prontos} onChange={(e) => setProntos(e.target.value)} placeholder="Ex.: 9 lâminas"
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Pendentes / atraso (opcional)</label>
              <input value={pendentes} onChange={(e) => setPendentes(e.target.value)} placeholder="Ex.: 1 P.A.S será refeito"
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Observação (opcional)</label>
              <textarea value={obsPronto} onChange={(e) => setObsPronto(e.target.value)} rows={2}
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Fechar</Button>
              <Button onClick={enviarPronto} loading={saving}>Notificar cliente</Button>
            </div>
          </div>
        )}

        {tab === 'historico' && (
          <div className="space-y-2">
            {historico.length === 0 ? (
              <p className="text-[13px] text-slate-400 py-6 text-center">Sem comunicações ainda.</p>
            ) : historico.map((c) => (
              <div key={c.id} className="rounded-md border border-slate-100 dark:border-slate-800 p-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{c.setor} · {c.tipo}</span>
                  <span>{fmt(c.createdAt)}</span>
                </div>
                <p className="text-[13px] text-slate-700 dark:text-slate-200 mt-1">{c.mensagem}</p>
                <p className="text-[11px] mt-1">
                  {c.emailEnviado
                    ? <span className="text-emerald-600">✓ e-mail enviado</span>
                    : <span className="text-slate-400">e-mail não enviado ({c.emailInfo === 'nao_configurado' ? 'e-mail não configurado' : c.emailInfo})</span>}
                  {c.criadoPor ? ` · ${c.criadoPor}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
