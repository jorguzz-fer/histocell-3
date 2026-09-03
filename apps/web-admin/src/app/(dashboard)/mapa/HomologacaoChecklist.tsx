'use client'

import { useEffect, useMemo, useState } from 'react'
import { Printer, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/**
 * Checklist de homologação (reunião 02/09): roteiro para o Célio validar, na
 * prática, tudo o que foi entregue. As marcações e anotações ficam no
 * localStorage do navegador — é um apoio pessoal de conferência, não estado
 * compartilhado, então não vai para o servidor.
 */

type Item = { id: string; passo: string; espera: string; marca?: 'decide' | 'warn'; marcaTxt?: string }
type Grupo = { num: string; titulo: string; tag: string; itens: Item[] }

const GRUPOS: Grupo[] = [
  {
    num: '1', titulo: 'Entrada (recepção)', tag: '#81 · #80',
    itens: [
      { id: 'e1', passo: 'Registrar uma entrada com 1 Pote Molhado + 2 Blocos Secos para o cliente de teste.', espera: 'Abre <b>uma única OS</b> com os 3 volumes; a folha de etiquetas de entrada abre para impressão.' },
      { id: 'e2', passo: 'Registrar uma entrada com condição <b>Macroscopia</b>, 2 pacotes, com o nome do paciente em cada (ex.: Thor, Marley).', espera: 'O sistema pede o nome do paciente por pacote; a etiqueta mostra o <b>nome do paciente</b> em destaque.' },
      { id: 'e3', passo: 'Escolher só material Molhado numa entrada e conferir onde a OS começa.', espera: 'A OS abre direto no <b>Processamento</b> (molhado não passa mais pela Macroscopia).' },
      { id: 'e4', passo: 'Abrir a tela de Recebimento e olhar as “Entradas sem orçamento”.', espera: 'Aparece a <b>data</b> de recepção no grupo do cliente e em cada volume.' },
    ],
  },
  {
    num: '2', titulo: 'Serviço e cassetes', tag: '#78 · #79',
    itens: [
      { id: 's1', passo: 'Na OS, em Definir serviço, digitar <code>001</code> na busca.', espera: 'Vem <b>HE Processamento inclusão + HE (cassetes identificados)</b>, igual ao Novo Pedido.' },
      { id: 's2', passo: 'Adicionar um serviço com, por ex., 10 cassetes e clicar em <b>Cassetes</b>.', espera: 'Abre um campo por cassete para o <b>código do cliente</b>; dá para imprimir as etiquetas pequenas (uma ou todas).' },
      { id: 's3', passo: 'Reabrir a OS e conferir a seção “Etiquetas da OS”.', espera: 'As etiquetas aparecem com o serviço de origem (ex.: <code>C1 H1 · S-HE</code>) e podem ser reimpressas.' },
    ],
  },
  {
    num: '3', titulo: 'Seco × Molhado na mesma OS', tag: '#82',
    itens: [
      { id: 'c1', passo: 'Na OS mista (pote + 2 blocos), abrir Serviços e olhar os <b>quadros</b>.', espera: 'Há um quadro por condição mostrando <b>volumes × unidades</b> (ex.: Seco 0/2).' },
      { id: 'c2', passo: 'Lançar o serviço dos 2 blocos secos (ex.: 2× PAS).', espera: 'O quadro <b>Seco fecha em 2/2</b> e fica verde.' },
      { id: 'c3', passo: 'Tentar lançar mais um serviço seco depois de fechado.', espera: 'É <b>bloqueado</b>; a gerência libera informando uma <b>justificativa</b> (fica registrado).' },
      { id: 'c4', passo: 'Clicar em <b>Encaminhar à técnica</b> no quadro do seco.', espera: 'Os itens secos ficam marcados <b>“→ técnica”</b> com quem/quando.' },
      { id: 'c5', passo: 'Abrir a mesma OS como área técnica.', espera: 'Vê os blocos secos já resolvidos <b>e</b> o molhado ainda pendente, na mesma OS.' },
    ],
  },
  {
    num: '4', titulo: 'Ficha de Macroscopia', tag: '#83',
    itens: [
      { id: 'm1', passo: 'Numa OS de Macroscopia, abrir o botão <b>Macroscopia</b> no Execução.', espera: 'O modal lista os <b>pacotes recebidos</b> (com o nome do paciente).' },
      { id: 'm2', passo: 'Descrever uma peça: descrição (ex.: pele), medidas, cor/consistência, características, nº de cassetes e o serviço.', espera: 'A peça entra na lista com o serviço e o número de cassetes.' },
      { id: 'm3', passo: 'Tentar concluir com uma peça <b>sem serviço</b>.', espera: 'A conclusão é <b>bloqueada</b> até toda peça ter serviço.' },
      { id: 'm4', passo: 'Concluir a macroscopia com todas as peças servidas.', espera: 'Gera os <b>cassetes</b> (etiquetas por paciente + peça), cria a <b>cobrança</b> e a OS <b>avança para o Processamento</b>.' },
      { id: 'm5', passo: 'Definir com a equipe quais <b>códigos de serviço</b> a macroscopia vai usar.', marca: 'decide', marcaTxt: 'decisão do Célio (E3)', espera: 'A ficha já funciona com o serviço escolhido; falta só padronizar os códigos.' },
    ],
  },
  {
    num: '5', titulo: 'Saída / conferência (bipagem)', tag: '#77 · #80',
    itens: [
      { id: 'x1', passo: 'Levar uma OS até a finalização e abrir a Conferência de saída.', espera: 'Só conclui quando as etiquetas <b>e</b> o código da OS forem bipados (ou liberado com justificativa).' },
      { id: 'x2', passo: 'Testar uma OS <b>sem etiqueta</b> (só serviço).', espera: 'A saída é confirmada bipando o <b>código da própria OS</b>.' },
      { id: 'x3', passo: 'Clicar em <b>Imprimir OS</b> na OS aberta pela Entrada.', espera: 'Sai o documento da OS: cliente, volumes, cassetes por serviço e o código de barras da OS.' },
    ],
  },
  {
    num: '6', titulo: 'Decisões (confirmar)', tag: 'E1–E5',
    itens: [
      { id: 'd1', passo: 'E1 — Molhado (cassete em formol) vai direto ao Processamento.', marca: 'warn', marcaTxt: 'confirmar', espera: 'Implementado — confirmar que corresponde à rotina real.' },
      { id: 'd2', passo: 'E2 — Reabertura de quadro fechado só pela gerência, com justificativa.', marca: 'warn', marcaTxt: 'confirmar', espera: 'Implementado e auditado.' },
      { id: 'd4', passo: 'E4 — OS impressa é opcional (botão), nunca passo obrigatório.', marca: 'warn', marcaTxt: 'confirmar', espera: 'Implementado como botão.' },
      { id: 'd5', passo: 'E5 — Manter Fila e Rastreio no menu por ora, decidir depois de 2 semanas de uso.', marca: 'warn', marcaTxt: 'confirmar', espera: 'Mantidos; reavaliar com base no uso.' },
    ],
  },
]

const KEY = 'histocell-homolog-v1'
const TOTAL = GRUPOS.reduce((s, g) => s + g.itens.length, 0)

function lerEstado(): Record<string, boolean | string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {}
  } catch {
    return {}
  }
}

export function HomologacaoChecklist() {
  const [estado, setEstado] = useState<Record<string, boolean | string>>({})
  const [pronto, setPronto] = useState(false)

  // localStorage só existe no cliente — lê depois da montagem.
  useEffect(() => {
    setEstado(lerEstado())
    setPronto(true)
  }, [])

  useEffect(() => {
    if (!pronto) return
    try {
      localStorage.setItem(KEY, JSON.stringify(estado))
    } catch {
      /* navegador pode bloquear o storage — segue sem persistir */
    }
  }, [estado, pronto])

  const feitos = useMemo(
    () => GRUPOS.reduce((s, g) => s + g.itens.filter((i) => estado[i.id] === true).length, 0),
    [estado],
  )

  function toggle(id: string) {
    setEstado((prev) => ({ ...prev, [id]: !prev[id] }))
  }
  function setNota(num: string, valor: string) {
    setEstado((prev) => ({ ...prev, ['nota-' + num]: valor }))
  }
  function limpar() {
    if (!confirm('Limpar todas as marcações e anotações deste checklist?')) return
    setEstado({})
  }

  return (
    <div className="space-y-8 pb-4">
      {/* barra de progresso */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white/95 p-3.5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 print:static print:shadow-none">
        <span className="whitespace-nowrap font-mono text-sm tabular-nums text-slate-600 dark:text-slate-300">
          <strong className="text-base text-teal-700 dark:text-teal-300">{feitos}</strong> / {TOTAL} concluídos
        </span>
        <div className="h-2 min-w-[120px] flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-teal-600 transition-all dark:bg-teal-400"
            style={{ width: TOTAL ? `${(feitos / TOTAL) * 100}%` : '0' }}
          />
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Imprimir
          </Button>
          <Button variant="secondary" size="sm" onClick={limpar}>
            <RotateCcw className="h-3.5 w-3.5" /> Limpar
          </Button>
        </div>
      </div>

      {/* antes de começar */}
      <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-4 text-sm text-slate-700 dark:border-teal-500/30 dark:bg-teal-500/5 dark:text-slate-300">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">
          Antes de começar
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Confirmar que o deploy foi feito <strong>(API + Admin, API primeiro)</strong> e a versão está no ar.</li>
          <li>Ter à mão um usuário de <strong>recepção</strong> e um de <strong>gerência</strong> (a liberação de quadro fechado é da gerência).</li>
          <li>Escolher um cliente de teste (ex.: Lapavet) para não misturar com material real.</li>
        </ul>
      </div>

      {GRUPOS.map((g) => {
        const gf = g.itens.filter((i) => estado[i.id] === true).length
        return (
          <section key={g.num} className="space-y-3">
            <div className="flex items-baseline gap-3 border-b-2 border-slate-900 pb-2 dark:border-slate-100">
              <span className="text-2xl font-bold leading-none text-teal-600 dark:text-teal-400">{g.num}</span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{g.titulo}</h3>
              <span className="ml-auto self-center font-mono text-xs text-slate-400 dark:text-slate-500">{gf}/{g.itens.length}</span>
              <span className="self-center whitespace-nowrap font-mono text-[11px] text-slate-400 dark:text-slate-600">{g.tag}</span>
            </div>

            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {g.itens.map((it) => {
                const feito = estado[it.id] === true
                return (
                  <li key={it.id} className="grid grid-cols-[24px_1fr] gap-3 py-3.5">
                    <input
                      type="checkbox"
                      checked={feito}
                      onChange={() => toggle(it.id)}
                      aria-label="concluir passo"
                      className="mt-0.5 h-5 w-5 cursor-pointer rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-800"
                    />
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium ${feito ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}
                        dangerouslySetInnerHTML={{ __html: it.passo }}
                      />
                      <p
                        className="mt-1 text-[13px] text-slate-600 dark:text-slate-400 [&_b]:font-semibold [&_b]:text-slate-800 dark:[&_b]:text-slate-200"
                        dangerouslySetInnerHTML={{ __html: 'Esperado: ' + it.espera }}
                      />
                      {it.marca && (
                        <span
                          className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            it.marca === 'decide'
                              ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                          }`}
                        >
                          {it.marcaTxt}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Anotações — {g.titulo}
              </label>
              <textarea
                value={(estado['nota-' + g.num] as string) || ''}
                onChange={(e) => setNota(g.num, e.target.value)}
                placeholder="Problemas, dúvidas, ajustes a pedir…"
                className="min-h-[52px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
          </section>
        )
      })}

      <div className="grid grid-cols-1 gap-6 border-t border-slate-200 pt-6 sm:grid-cols-2 dark:border-slate-800">
        <div>
          <div className="h-9 border-b border-slate-900 dark:border-slate-100" />
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Homologado por (Célio) — data ____ / ____ / ______</p>
        </div>
        <div>
          <div className="h-9 border-b border-slate-900 dark:border-slate-100" />
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Observações gerais / pendências</p>
        </div>
      </div>
    </div>
  )
}
