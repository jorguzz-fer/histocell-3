'use client'

import { useEffect, useState } from 'react'
import { Copy, RefreshCw, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'
import type { Cliente } from './types'

// ─── helpers ────────────────────────────────────────────────────────────────

function maskCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function maskCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

function maskCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.replace(/(\d{5})(\d{0,3})/, '$1-$2')
}

// ─── form state ──────────────────────────────────────────────────────────────

type FormState = {
  tipo: 'PJ' | 'PF'
  nome: string
  nomeFantasia: string
  documento: string
  inscricaoEstadual: string
  idEtiqueta: string
  email: string
  emailFinanceiro: string
  emailMacroscopia: string
  telefone: string
  celular: string
  segmento: string
  projeto: string
  cobrancaAutomatica: boolean
  diaCobranca: string
  descontoPadrao: string
  observacoes: string
  // endereço inline
  endTipo: string
  endLogradouro: string
  endNumero: string
  endComplemento: string
  endBairro: string
  endCidade: string
  endUf: string
  endCep: string
}

const EMPTY: FormState = {
  tipo: 'PJ',
  nome: '',
  nomeFantasia: '',
  documento: '',
  inscricaoEstadual: '',
  idEtiqueta: '',
  email: '',
  emailFinanceiro: '',
  emailMacroscopia: '',
  telefone: '',
  celular: '',
  segmento: 'recorrente',
  projeto: '',
  cobrancaAutomatica: false,
  diaCobranca: '',
  descontoPadrao: '',
  observacoes: '',
  endTipo: 'sede',
  endLogradouro: '',
  endNumero: '',
  endComplemento: '',
  endBairro: '',
  endCidade: '',
  endUf: '',
  endCep: '',
}

function clienteToForm(c: Cliente): FormState {
  const end = c.enderecos?.[0]
  return {
    tipo: c.tipo as 'PJ' | 'PF',
    nome: c.nome,
    nomeFantasia: c.nomeFantasia ?? '',
    documento: '',  // nunca populamos o campo com dado real
    inscricaoEstadual: c.inscricaoEstadual ?? '',
    idEtiqueta: c.idEtiqueta ?? '',
    email: c.email,
    emailFinanceiro: c.emailFinanceiro ?? '',
    emailMacroscopia: c.emailMacroscopia ?? '',
    telefone: c.telefone ?? '',
    celular: c.celular ?? '',
    segmento: c.segmento,
    projeto: c.projeto ?? '',
    cobrancaAutomatica: Boolean(c.cobrancaAutomatica),
    diaCobranca: c.diaCobranca ? String(c.diaCobranca) : '',
    descontoPadrao: c.descontoPadrao ? String(c.descontoPadrao) : '',
    observacoes: c.observacoes ?? '',
    endTipo: end?.tipo ?? 'sede',
    endLogradouro: end?.logradouro ?? '',
    endNumero: end?.numero ?? '',
    endComplemento: end?.complemento ?? '',
    endBairro: end?.bairro ?? '',
    endCidade: end?.cidade ?? '',
    endUf: end?.uf ?? '',
    endCep: end?.cep?.replace('-', '') ?? '',
  }
}

// ─── component ───────────────────────────────────────────────────────────────

interface ClienteDrawerProps {
  open: boolean
  onClose: () => void
  cliente: Cliente | null   // null = criar novo
  onSaved: () => void
}

export function ClienteDrawer({ open, onClose, cliente, onSaved }: ClienteDrawerProps) {
  const isEdit = Boolean(cliente)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [saving, setSaving] = useState(false)
  const [portalToken, setPortalToken] = useState<string | null>(null)
  const [portalBase, setPortalBase] = useState('')

  // base do portal do cliente: env explícito OU deduzido do domínio do admin
  useEffect(() => {
    const env = process.env.NEXT_PUBLIC_CLIENTE_URL
    if (env) { setPortalBase(env.replace(/\/$/, '')); return }
    if (typeof window !== 'undefined') {
      setPortalBase(window.location.origin.replace('-admin', '-cliente'))
    }
  }, [])

  // Popula o form quando o drawer abre
  useEffect(() => {
    if (open) {
      setForm(cliente ? clienteToForm(cliente) : EMPTY)
      setPortalToken(cliente?.portalToken ?? null)
      setErrors({})
    }
  }, [open, cliente])

  const portalUrl = portalToken ? `${portalBase}/p/${portalToken}` : ''

  async function copiarLink() {
    if (!portalUrl) return
    try {
      await navigator.clipboard.writeText(portalUrl)
      toast.success('Link do portal copiado!')
    } catch {
      toast.error('Não foi possível copiar — copie manualmente.')
    }
  }

  async function regenerarToken() {
    if (!cliente) return
    if (!confirm('Gerar um novo link? O link anterior deixará de funcionar.')) return
    try {
      const res = await api.post<{ portalToken: string }>(`/clientes/${cliente.id}/portal-token`, {})
      setPortalToken(res.portalToken)
      toast.success('Novo link gerado.')
      onSaved()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao gerar link')
    }
  }

  function set(field: keyof FormState, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  // ── validação básica ──
  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!form.nome.trim()) e.nome = 'Obrigatório'
    if (!isEdit && !form.documento.replace(/\D/g, '')) e.documento = 'Obrigatório'
    if (!form.email.includes('@')) e.email = 'E-mail inválido'
    if (form.emailFinanceiro && !form.emailFinanceiro.includes('@'))
      e.emailFinanceiro = 'E-mail inválido'
    if (form.emailMacroscopia && !form.emailMacroscopia.includes('@'))
      e.emailMacroscopia = 'E-mail inválido'

    const docDigits = form.documento.replace(/\D/g, '')
    if (!isEdit && form.tipo === 'PF' && docDigits.length !== 11)
      e.documento = 'CPF deve ter 11 dígitos'
    if (!isEdit && form.tipo === 'PJ' && docDigits.length !== 14)
      e.documento = 'CNPJ deve ter 14 dígitos'

    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── submit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const hasEndereco = form.endLogradouro.trim() || form.endCidade.trim()
      const payload = {
        tipo: form.tipo,
        nome: form.nome.trim(),
        nomeFantasia: form.nomeFantasia.trim() || undefined,
        ...(!isEdit ? { documento: form.documento.replace(/\D/g, '') } : {}),
        inscricaoEstadual: form.inscricaoEstadual.trim() || undefined,
        idEtiqueta: form.idEtiqueta.trim() || undefined,
        email: form.email.trim(),
        emailFinanceiro: form.emailFinanceiro.trim() || undefined,
        emailMacroscopia: form.emailMacroscopia.trim() || undefined,
        telefone: form.telefone.replace(/\D/g, '') || undefined,
        celular: form.celular.replace(/\D/g, '') || undefined,
        segmento: form.segmento,
        projeto: form.segmento === 'pesquisador' ? (form.projeto.trim() || undefined) : undefined,
        cobrancaAutomatica: form.cobrancaAutomatica,
        diaCobranca: form.cobrancaAutomatica && form.diaCobranca.trim() ? Number(form.diaCobranca) : undefined,
        descontoPadrao: form.descontoPadrao.trim() ? Number(form.descontoPadrao) : 0,
        observacoes: form.observacoes.trim() || undefined,
        ...(hasEndereco
          ? {
              endereco: {
                tipo: form.endTipo,
                logradouro: form.endLogradouro.trim(),
                numero: form.endNumero.trim(),
                complemento: form.endComplemento.trim() || undefined,
                bairro: form.endBairro.trim(),
                cidade: form.endCidade.trim(),
                uf: form.endUf.toUpperCase(),
                cep: form.endCep.replace(/\D/g, ''),
              },
            }
          : {}),
      }

      if (isEdit && cliente) {
        await api.patch(`/clientes/${cliente.id}`, payload)
        toast.success('Cliente atualizado com sucesso!')
      } else {
        await api.post('/clientes', payload)
        toast.success('Cliente cadastrado com sucesso!')
      }

      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar cliente')
    } finally {
      setSaving(false)
    }
  }

  const docMask = form.tipo === 'PF' ? maskCPF : maskCNPJ

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar cliente' : 'Novo cliente'}
      subtitle={isEdit ? `#${cliente?.id} — ${cliente?.nome}` : 'Preencha os dados do cliente'}
      width="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Link do portal (somente edição) ── */}
        {isEdit && (
          <section className="rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-[12px] font-semibold text-blue-700 dark:text-blue-300">Link do portal do cliente</h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Envie este link para o cliente fazer pedidos sem login.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={portalUrl || '(token não gerado)'}
                onFocusCapture={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[12px] font-mono px-2 py-1.5 truncate"
              />
              <button type="button" onClick={copiarLink} title="Copiar link"
                className="shrink-0 p-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800">
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={regenerarToken} title="Gerar novo link"
                className="shrink-0 p-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>
        )}

        {/* ── Tipo PJ/PF ── */}
        <div>
          <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-2">
            Tipo de cliente
          </p>
          <div className="flex gap-2">
            {(['PJ', 'PF'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { set('tipo', t); set('documento', '') }}
                className={`flex-1 py-2 rounded-md text-[13px] font-medium border transition-colors ${
                  form.tipo === t
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {t === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Dados principais ── */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Dados principais
          </h3>

          <Input
            label={form.tipo === 'PJ' ? 'Razão Social' : 'Nome completo'}
            value={form.nome}
            onChange={(e) => set('nome', e.target.value)}
            error={errors.nome}
            placeholder={form.tipo === 'PJ' ? 'Ex: TR Laboratório Médico Ltda' : 'Ex: João da Silva'}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={form.tipo === 'PJ' ? 'Apelido / Nome fantasia' : 'Apelido'}
              value={form.nomeFantasia}
              onChange={(e) => set('nomeFantasia', e.target.value)}
              placeholder={form.tipo === 'PJ' ? 'Ex: INDAP' : 'Opcional'}
            />
            <Input
              label="ID Etiqueta"
              value={form.idEtiqueta}
              onChange={(e) => set('idEtiqueta', e.target.value)}
              placeholder="Ex: INDAP"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={form.tipo === 'PJ' ? 'CNPJ' : 'CPF'}
              value={form.documento}
              onChange={(e) => set('documento', docMask(e.target.value))}
              error={errors.documento}
              placeholder={form.tipo === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
              disabled={isEdit}
              hint={isEdit ? 'Documento não pode ser alterado' : undefined}
            />
            {form.tipo === 'PJ' && (
              <Input
                label="Inscrição Estadual"
                value={form.inscricaoEstadual}
                onChange={(e) => set('inscricaoEstadual', e.target.value)}
                placeholder="Opcional"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Atividade / Segmento"
              value={form.segmento}
              onChange={(e) => set('segmento', e.target.value)}
              options={[
                { value: 'recorrente', label: 'Recorrente' },
                { value: 'esporadico', label: 'Esporádico' },
                { value: 'pesquisador', label: 'Pesquisador' },
              ]}
            />
            <Input
              label="Desconto padrão (%)"
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={form.descontoPadrao}
              onChange={(e) => set('descontoPadrao', e.target.value)}
              placeholder="0"
              hint="Aplicado automaticamente em cada pedido deste cliente"
            />
          </div>

          {form.segmento === 'pesquisador' && (
            <Input
              label="Projeto (FAPESP/CNPq)"
              value={form.projeto}
              onChange={(e) => set('projeto', e.target.value)}
              placeholder="Nº/código do projeto de financiamento"
              hint="Sai na nota fiscal dos pedidos deste pesquisador"
            />
          )}

          {/* Cobrança programada */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.cobrancaAutomatica}
                onChange={(e) => set('cobrancaAutomatica', e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">Cobrança programada</span>
              <span className="text-[11px] text-slate-400">— gera a cobrança do mês automaticamente</span>
            </label>
            {form.cobrancaAutomatica && (
              <Input
                label="Dia da cobrança (1–28)"
                type="number"
                min={1}
                max={28}
                value={form.diaCobranca}
                onChange={(e) => set('diaCobranca', e.target.value)}
                placeholder="Ex: 5"
                hint="No dia escolhido o sistema fatura o mês anterior e emite o boleto"
              />
            )}
          </div>
        </section>

        {/* ── Contato ── */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Contato
          </h3>

          <Input
            label="E-mail principal"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            error={errors.email}
            placeholder="contato@empresa.com.br"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="E-mail financeiro"
              type="email"
              value={form.emailFinanceiro}
              onChange={(e) => set('emailFinanceiro', e.target.value)}
              error={errors.emailFinanceiro}
              placeholder="financeiro@empresa.com.br"
            />
            <Input
              label="E-mail macroscopia"
              type="email"
              value={form.emailMacroscopia}
              onChange={(e) => set('emailMacroscopia', e.target.value)}
              error={errors.emailMacroscopia}
              placeholder="macro@empresa.com.br"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Telefone"
              value={form.telefone}
              onChange={(e) => set('telefone', maskPhone(e.target.value))}
              placeholder="(00) 0000-0000"
            />
            <Input
              label="Celular / WhatsApp"
              value={form.celular}
              onChange={(e) => set('celular', maskPhone(e.target.value))}
              placeholder="(00) 00000-0000"
            />
          </div>
        </section>

        {/* ── Endereço ── */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Endereço (sede/cadastral)
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 -mt-1">
            O endereço de entrega é informado em cada pedido.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input
                label="CEP"
                value={form.endCep}
                onChange={(e) => set('endCep', maskCEP(e.target.value))}
                placeholder="00000-000"
              />
            </div>
            <Select
              label="Tipo"
              value={form.endTipo}
              onChange={(e) => set('endTipo', e.target.value)}
              options={[
                { value: 'sede', label: 'Sede' },
                { value: 'entrega', label: 'Entrega' },
                { value: 'cobranca', label: 'Cobrança' },
              ]}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input
                label="Logradouro"
                value={form.endLogradouro}
                onChange={(e) => set('endLogradouro', e.target.value)}
                placeholder="Rua, Av., Al..."
              />
            </div>
            <Input
              label="Número"
              value={form.endNumero}
              onChange={(e) => set('endNumero', e.target.value)}
              placeholder="123"
            />
          </div>

          <Input
            label="Complemento"
            value={form.endComplemento}
            onChange={(e) => set('endComplemento', e.target.value)}
            placeholder="Sala, andar, setor..."
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Bairro"
              value={form.endBairro}
              onChange={(e) => set('endBairro', e.target.value)}
              placeholder="Bairro"
            />
            <Input
              label="Cidade"
              value={form.endCidade}
              onChange={(e) => set('endCidade', e.target.value)}
              placeholder="Cidade"
            />
            <Input
              label="UF"
              value={form.endUf}
              onChange={(e) => set('endUf', e.target.value.toUpperCase().slice(0, 2))}
              placeholder="SP"
              maxLength={2}
            />
          </div>
        </section>

        {/* ── Observações ── */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Observações
          </h3>
          <textarea
            value={form.observacoes}
            onChange={(e) => set('observacoes', e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-[13px]
              bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              resize-none transition-colors"
            placeholder="Informações adicionais sobre o cliente..."
          />
        </section>

        {/* ── Footer com ações ── */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Salvar alterações' : 'Cadastrar cliente'}
          </Button>
        </div>

      </form>
    </Drawer>
  )
}
