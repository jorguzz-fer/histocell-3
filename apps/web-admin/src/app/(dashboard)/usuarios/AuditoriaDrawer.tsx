'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import type { AuditoriaItem, UsuarioAdmin } from './types'

const ACAO_LABEL: Record<string, string> = {
  CREATE: 'Criou', UPDATE: 'Atualizou', DELETE: 'Excluiu',
  ATIVAR: 'Ativou', DESATIVAR: 'Desativou', RESET_SENHA: 'Redefiniu senha',
  TROCA_SENHA: 'Trocou a própria senha', RECEBIDO: 'Recebeu pedido',
  RECEBIDO_PENDENTE_APROVACAO: 'Recebeu (divergente)', DIVERGENCIA_APROVADA: 'Aprovou divergência',
  AVANCO_ETAPA: 'Avançou etapa', CREATE_AUTO: 'Gerou OS',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export function AuditoriaDrawer({
  open,
  onClose,
  usuario,
}: {
  open: boolean
  onClose: () => void
  usuario: UsuarioAdmin | null
}) {
  const [itens, setItens] = useState<AuditoriaItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && usuario) {
      setLoading(true)
      api.get<AuditoriaItem[]>(`/users/${usuario.id}/auditoria?limit=100`)
        .then(setItens)
        .catch(() => setItens([]))
        .finally(() => setLoading(false))
    }
  }, [open, usuario])

  return (
    <Modal open={open} onClose={onClose} title="Auditoria" subtitle={usuario?.nome} width="max-w-2xl">
      {loading ? (
        <p className="text-[13px] text-slate-400 py-8 text-center">Carregando…</p>
      ) : itens.length === 0 ? (
        <p className="text-[13px] text-slate-400 py-8 text-center">Nenhuma ação registrada.</p>
      ) : (
        <ul className="space-y-2">
          {itens.map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <Badge variant="slate">{ACAO_LABEL[a.action] ?? a.action}</Badge>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-slate-700 dark:text-slate-200">
                  {a.entity}{a.entityId ? ` #${a.entityId}` : ''}
                </p>
                <p className="text-[11px] text-slate-400">{fmt(a.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
