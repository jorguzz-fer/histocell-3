'use client'

import { useEffect, useState } from 'react'
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

  // Popula o form quando o drawer abre
  useEffect(() => {
    if (open) {
      setForm(cliente ? clienteToForm(cliente) : EMPTY)
      setErrors({})
    }
  }, [open, cliente])

  function set(field: keyof FormState, value: string) {
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
