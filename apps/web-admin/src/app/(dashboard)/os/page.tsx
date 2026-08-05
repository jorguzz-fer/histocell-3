'use client'

import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, RefreshCw, FlaskConical, DoorOpen } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ClienteAvatar } from '@/components/ui/ClienteAvatar'
import { api } from '@/lib/api'
import { ETAPA_LABEL } from '@/lib/etapas'
import { ServicosOSDrawer } from './ServicosOSDrawer'
import { clienteDaOS, clienteIdDaOS, type OrdemListResponse, type OrdemServico } from './types'

const ORIGEM_OPTS = [
  { value: '', label: 'Todas as origens' },
  { value: 'entrada', label: 'Abertas na Entrada' },
  { value: 'amostra', label: 'Por amostra (fluxo antigo)' },
]

const ETAPA_OPTS = [
  { value: '', label: 'Todas as etapas' },
  ...Object.entries(ETAPA_LABEL).map(([value, label]) => ({ value, label })),
]

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function OrdensServicoPage() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [origem, setOrigem] = useState('')
  const [etapa, setEtapa] = useState('')
  const [selecionada, setSelecionada] = useState<OrdemServico | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (busca) params.set('busca', busca)
      if (etapa) params.set('etapa', etapa)
      const res = await api.get<OrdemListResponse>(`/ordens?${params}`)
      // A origem ainda não é filtro da API — a lista é curta e o filtro aqui
      // evita um endpoint novo só para isso.
      setOrdens(origem ? res.data.filter((o) => o.origem === origem) : res.data)
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao carregar ordens')
    } finally {
      setCarregando(false)
    }
  }, [busca, etapa, origem])

  useEffect(() => {
    const t = setTimeout(carregar, busca ? 350 : 0)
    return () => clearTimeout(t)
  }, [carregar, busca])

  return (
    <>
      <PageHeader
        title="Ordem de Serviço"
        subtitle="Tudo parte da OS: o material que chegou e o serviço que será executado sobre ele."
        action={
          <Button variant="secondary" size="sm" onClick={carregar} disabled={carregando}>
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Input
            label=""
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por número, cliente ou amostra…"
          />
        </div>
        <div className="w-56">
          <Select label="" value={origem} onChange={(e) => setOrigem(e.target.value)} options={ORIGEM_OPTS} />
        </div>
        <div className="w-56">
          <Select label="" value={etapa} onChange={(e) => setEtapa(e.target.value)} options={ETAPA_OPTS} />
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {carregando ? (
          <p className="px-5 py-10 text-center text-[13px] text-slate-500">Carregando…</p>
        ) : ordens.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-slate-500">
            Nenhuma ordem de serviço encontrada.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {ordens.map((os) => {
              const codigoCurto = os.seq != null ? `#${String(os.seq).padStart(4, '0')}` : os.numero
              const semServico = os.itens.length === 0
              return (
                <div key={os.id} className="flex items-center gap-3 px-5 py-3">
                  <ClienteAvatar
                    nome={clienteDaOS(os)}
                    seed={clienteIdDaOS(os) ?? undefined}
                    size={32}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                        {codigoCurto}
                      </span>
                      {os.origem === 'entrada' ? (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400"
                          title="Aberta na Entrada"
                        >
                          <DoorOpen className="h-3 w-3" /> Entrada
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400"
                          title="Criada a partir de uma amostra"
                        >
                          <FlaskConical className="h-3 w-3" /> {os.amostra?.numeroInterno}
                        </span>
                      )}
                      {os.prioridade === 'urgente' && <Badge variant="rose">Urgente</Badge>}
                    </div>
                    <p className="truncate text-[12px] text-slate-600 dark:text-slate-400">
                      {clienteDaOS(os)} · {fmtData(os.createdAt)}
                      {os.volumes.length > 0 ? ` · ${os.volumes.length} volume(s)` : ''}
                    </p>
                  </div>

                  <Badge variant="slate">{ETAPA_LABEL[os.etapaAtual] ?? os.etapaAtual}</Badge>

                  {semServico ? (
                    <Badge variant="amber">Sem serviço definido</Badge>
                  ) : (
                    <Badge variant="green">
                      {os.itens.length} serviço{os.itens.length > 1 ? 's' : ''}
                    </Badge>
                  )}

                  <Button size="sm" variant="secondary" onClick={() => setSelecionada(os)}>
                    <ClipboardList className="h-3.5 w-3.5" />
                    Serviços
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ServicosOSDrawer
        open={selecionada != null}
        onClose={() => setSelecionada(null)}
        os={selecionada}
        onSaved={carregar}
      />
    </>
  )
}
