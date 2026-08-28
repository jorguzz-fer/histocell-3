import { PageHeader } from '@/components/PageHeader'

/**
 * Mapa do fluxo: como o material caminha dentro do sistema, das duas portas de
 * entrada até a fatura do mês. É tela de consulta (não opera nada), por isso
 * mora no menu do usuário e não na navegação da operação.
 *
 * Os desenhos são SVG puro com `currentColor` — acompanham o tema claro/escuro
 * sem duplicar cor. Rosa = molhado, roxo = seco (a mesma leitura da Entrada).
 */

const ETAPAS = [
  { n: '01', sigla: 'T', nome: 'Triagem', desc: 'Material recebido, ainda sem destino definido. É onde param as OS abertas pelo fluxo de pedido antes de alguém pegar o trabalho.' },
  { n: '02', sigla: 'Ma', nome: 'Macroscopia', tom: 'molhado' as const, desc: 'Descrição e clivagem do material molhado. Porta de entrada de tudo que chega em fixador.' },
  { n: '03', sigla: 'P', nome: 'Processamento / Inclusão', desc: 'Desidratação e inclusão em parafina — o material vira bloco.' },
  { n: '04', sigla: 'Mi', nome: 'Microtomia (Corte)', tom: 'seco' as const, desc: 'Corte dos blocos em lâminas. Porta de entrada do material que já chega seco.' },
  { n: '05', sigla: 'C', nome: 'Coloração / Montagem', desc: 'Coloração das lâminas e montagem. Daqui sai o desvio para imunofluorescência quando o caso pede.' },
  { n: '06', sigla: 'L', nome: 'Laudo', desc: 'Quando há laudo, ele é solicitado a um patologista e volta como PDF anexado, que então é liberado ao cliente.' },
  { n: '07', sigla: 'F', nome: 'Finalização', desc: 'Conferência fina: as lâminas são bipadas uma a uma contra o que a OS diz que deveria existir.' },
  { n: '08', sigla: 'E', nome: 'Expedição / Retirada', desc: 'Cliente é avisado de que está pronto e o material sai. Avançar daqui conclui a OS.' },
]

const CODIGOS = [
  { formato: 'ENT-000001', oque: 'Volume que chegou na recepção', onde: 'Entrada' },
  { formato: 'OS-2026-08-14-001', oque: 'Ordem de Serviço, numerada por dia', onde: 'Entrada ou Recebimento' },
  { formato: '00045', oque: 'Número interno da amostra', onde: 'Recebimento' },
  { formato: '12-00045-L1-1384126', oque: 'Etiqueta de lâmina: cliente, amostra, sequência e número global', onde: 'Recebimento e Etiquetas' },
  { formato: 'FAT-202608-001', oque: 'Fatura do mês do cliente', onde: 'Financeiro' },
]

function Secao({ numero, titulo, texto, children }: { numero: string; titulo: string; texto?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{numero}</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{titulo}</h2>
        {texto && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">{texto}</p>}
      </div>
      {children}
    </section>
  )
}

function Quadro({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      {children}
    </div>
  )
}

function Nota({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-3xl border-l-2 border-slate-300 pl-4 text-sm leading-relaxed text-slate-600 dark:border-slate-700 dark:text-slate-400">
      {children}
    </p>
  )
}

export default function MapaPage() {
  return (
    <div className="space-y-12 pb-8">
      <PageHeader
        title="Mapa do fluxo"
        subtitle="Como o material caminha: da caixa que chega na recepção até o boleto do fim do mês"
      />

      {/* ── 01 · convergência ───────────────────────────────────────────────── */}
      <Secao
        numero="01 · a convergência"
        titulo="Duas portas de entrada, uma única OS"
        texto="O material chega por dois caminhos e os dois desembocam no mesmo lugar. A Ordem de Serviço é o centro: carrega o que será feito, por onde o material já passou e quanto isso custa."
      >
        <Quadro>
          <svg
            viewBox="0 0 1000 430"
            role="img"
            aria-label="As duas portas de entrada — Entrada física e Novo Pedido com Recebimento — convergem para uma única Ordem de Serviço, que emite os serviços a executar, a esteira de etapas e a cobrança do mês."
            className="block h-auto w-full min-w-[720px] text-slate-700 dark:text-slate-300"
          >
            <defs>
              <marker id="mapa-seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="fill-slate-500 dark:fill-slate-400" />
              </marker>
            </defs>

            <g fill="currentColor" fontFamily="ui-sans-serif, system-ui, sans-serif">
              {/* porta 1 — entrada */}
              <rect x="30" y="42" width="200" height="106" rx="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <text x="46" y="70" fontSize="15" fontWeight="600">Entrada</text>
              <text x="46" y="92" fontSize="11.5" opacity=".7">recepção identifica</text>
              <text x="46" y="108" fontSize="11.5" opacity=".7">cliente + objeto físico</text>
              <text x="46" y="132" fontSize="10.5" fontFamily="ui-monospace, monospace" opacity=".55">seco · molhado</text>

              <rect x="272" y="42" width="182" height="106" rx="6" fill="none" stroke="currentColor" strokeWidth="1" />
              <text x="288" y="70" fontSize="13.5" fontWeight="600">Volume etiquetado</text>
              <text x="288" y="92" fontSize="11.5" opacity=".7">1 etiqueta por volume,</text>
              <text x="288" y="108" fontSize="11.5" opacity=".7">colada no recipiente</text>
              <text x="288" y="132" fontSize="10.5" fontFamily="ui-monospace, monospace" opacity=".55">ENT-000001</text>

              <line x1="230" y1="95" x2="266" y2="95" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#mapa-seta)" />

              {/* porta 2 — pedido */}
              <rect x="30" y="282" width="200" height="106" rx="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <text x="46" y="310" fontSize="15" fontWeight="600">Novo Pedido</text>
              <text x="46" y="332" fontSize="11.5" opacity=".7">orçamento com os</text>
              <text x="46" y="348" fontSize="11.5" opacity=".7">serviços previstos</text>
              <text x="46" y="372" fontSize="10.5" fontFamily="ui-monospace, monospace" opacity=".55">rascunho → enviado</text>

              <rect x="272" y="282" width="182" height="106" rx="6" fill="none" stroke="currentColor" strokeWidth="1" />
              <text x="288" y="310" fontSize="13.5" fontWeight="600">Recebimento</text>
              <text x="288" y="332" fontSize="11.5" opacity=".7">registra amostras e</text>
              <text x="288" y="348" fontSize="11.5" opacity=".7">emite as lâminas</text>
              <text x="288" y="372" fontSize="10.5" fontFamily="ui-monospace, monospace" opacity=".55">amostra 00045</text>

              <line x1="230" y1="335" x2="266" y2="335" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#mapa-seta)" />

              {/* convergência */}
              <path d="M454,95 H500 V215" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M454,335 H500 V215" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <line x1="500" y1="215" x2="546" y2="215" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#mapa-seta)" />

              {/* OS */}
              <rect x="552" y="128" width="188" height="174" rx="8" className="fill-blue-50 stroke-blue-500 dark:fill-blue-500/10 dark:stroke-blue-400" strokeWidth="2" />
              <g className="fill-blue-800 dark:fill-blue-300">
                <text x="572" y="166" fontSize="17" fontWeight="700">Ordem de</text>
                <text x="572" y="188" fontSize="17" fontWeight="700">Serviço</text>
                <text x="572" y="226" fontSize="11.5" opacity=".8">nasce junto com a</text>
                <text x="572" y="242" fontSize="11.5" opacity=".8">entrada do material</text>
                <text x="572" y="270" fontSize="10.5" fontFamily="ui-monospace, monospace" opacity=".65">OS-2026-08-14-001</text>
              </g>
              <line x1="572" y1="204" x2="720" y2="204" className="stroke-blue-400 dark:stroke-blue-500/50" strokeWidth="1" />

              {/* saídas */}
              <path d="M740,215 H772 V92 H794" fill="none" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#mapa-seta)" />
              <line x1="740" y1="215" x2="794" y2="215" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#mapa-seta)" />
              <path d="M740,215 H772 V338 H794" fill="none" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#mapa-seta)" />

              <rect x="800" y="58" width="172" height="68" rx="6" fill="none" stroke="currentColor" strokeWidth="1" />
              <text x="816" y="84" fontSize="13" fontWeight="600">Serviços a executar</text>
              <text x="816" y="104" fontSize="11" opacity=".7">o que de fato será feito</text>

              <rect x="800" y="181" width="172" height="68" rx="6" fill="none" stroke="currentColor" strokeWidth="1" />
              <text x="816" y="207" fontSize="13" fontWeight="600">Esteira de etapas</text>
              <text x="816" y="227" fontSize="11" opacity=".7">triagem → expedição</text>

              <rect x="800" y="304" width="172" height="68" rx="6" fill="none" stroke="currentColor" strokeWidth="1" />
              <text x="816" y="330" fontSize="13" fontWeight="600">Cobrança do mês</text>
              <text x="816" y="350" fontSize="11" opacity=".7">fatura e boleto</text>
            </g>
          </svg>
        </Quadro>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Porta 1 — Entrada</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Para o material que chega antes de existir orçamento. A recepcionista só precisa saber de quem é e o que é.
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-400">
              <li>Busca o cliente (ou cadastra na hora)</li>
              <li>Informa o objeto: caixa, pacote, frasco…</li>
              <li>Marca <strong className="font-semibold text-slate-800 dark:text-slate-200">seco</strong> ou <strong className="font-semibold text-slate-800 dark:text-slate-200">molhado</strong> — obrigatório</li>
              <li>Cada volume vira um recipiente com código próprio e etiqueta para colar</li>
              <li>A OS abre automaticamente</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Porta 2 — Novo Pedido</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Para o material que já vem com serviço combinado. O orçamento existe antes de a caixa chegar.
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-400">
              <li>Orçamento com os serviços previstos e preços</li>
              <li>No Recebimento, cada amostra é registrada com número interno</li>
              <li>Sai uma etiqueta de lâmina por amostra</li>
              <li>Conferência do previsto contra o recebido</li>
              <li>A OS abre ao final do recebimento</li>
            </ul>
          </div>
        </div>

        <Nota>
          Um volume que entrou pela porta 1 pode ser <strong className="font-semibold text-slate-800 dark:text-slate-200">vinculado depois</strong> a um pedido
          do mesmo cliente — é como a entrada avulsa reencontra o orçamento quando ele finalmente sai. O sistema recusa o vínculo se o
          volume já estiver em outro pedido ou for de outro cliente.
        </Nota>
      </Secao>

      {/* ── 02 · esteira ────────────────────────────────────────────────────── */}
      <Secao
        numero="02 · a esteira"
        titulo="Seco e molhado entram em pontos diferentes"
        texto="Material molhado precisa de macroscopia antes de qualquer coisa; material seco já chega pronto para o corte. É isso que a marcação na Entrada decide — e por isso ela é obrigatória."
      >
        <Quadro>
          <svg
            viewBox="0 0 1180 268"
            role="img"
            aria-label="A esteira de oito etapas: triagem, macroscopia, processamento, microtomia, coloração, laudo, finalização e expedição. Material molhado entra na macroscopia, material seco entra na microtomia. Imunofluorescência é um desvio após a coloração, e arquivamento ou descarte encerram a Ordem de Serviço."
            className="block h-auto w-full min-w-[820px] text-slate-700 dark:text-slate-300"
          >
            <defs>
              <marker id="mapa-seta2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="fill-slate-500 dark:fill-slate-400" />
              </marker>
              <marker id="mapa-seta-molhado" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="fill-rose-600 dark:fill-rose-400" />
              </marker>
              <marker id="mapa-seta-seco" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="fill-indigo-600 dark:fill-indigo-400" />
              </marker>
            </defs>

            <g fontFamily="ui-sans-serif, system-ui, sans-serif">
              <line x1="70" y1="128" x2="1090" y2="128" stroke="currentColor" strokeWidth="1.5" opacity=".35" />

              {ETAPAS.map((e, i) => {
                const x = 70 + i * 145.7
                return (
                  <g key={e.sigla}>
                    <circle
                      cx={x}
                      cy={128}
                      r={16}
                      className="fill-white dark:fill-slate-900"
                      stroke="currentColor"
                      strokeWidth={i === ETAPAS.length - 1 ? 2.5 : 1.5}
                    />
                    <text x={x} y={133} fontSize="12" fontWeight="600" textAnchor="middle" fill="currentColor">{e.sigla}</text>
                    <text x={x} y={168} fontSize="11.5" textAnchor="middle" fill="currentColor" opacity=".85">
                      {e.nome.replace(/ \/.*| \(.*/, '')}
                    </text>
                  </g>
                )
              })}

              {/* entradas por condição */}
              <g className="text-rose-600 dark:text-rose-400">
                <path d="M215.7,48 V106" fill="none" stroke="currentColor" strokeWidth="2" markerEnd="url(#mapa-seta-molhado)" />
                <text x="215.7" y="36" fontSize="12" fontWeight="600" textAnchor="middle" fill="currentColor">molhado entra aqui</text>
              </g>
              <g className="text-indigo-600 dark:text-indigo-400">
                <path d="M507.1,48 V106" fill="none" stroke="currentColor" strokeWidth="2" markerEnd="url(#mapa-seta-seco)" />
                <text x="507.1" y="36" fontSize="12" fontWeight="600" textAnchor="middle" fill="currentColor">seco entra aqui</text>
              </g>

              {/* desvio e terminais — cada rótulo sob a sua própria etapa, para
                  os dois não se encostarem quando o desenho é reduzido */}
              <path d="M652.8,180 V202" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 4" markerEnd="url(#mapa-seta2)" opacity=".7" />
              <text x="652.8" y="222" fontSize="11.5" textAnchor="middle" fill="currentColor" opacity=".85">Imunofluorescência</text>
              <text x="652.8" y="238" fontSize="10.5" textAnchor="middle" fill="currentColor" opacity=".55">desvio</text>

              <path d="M1090,180 V202" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 4" markerEnd="url(#mapa-seta2)" opacity=".7" />
              <text x="1090" y="222" fontSize="11.5" textAnchor="middle" fill="currentColor" opacity=".85">Arquivamento · Descarte</text>
              <text x="1090" y="238" fontSize="10.5" textAnchor="middle" fill="currentColor" opacity=".55">encerram a OS</text>
            </g>
          </svg>
        </Quadro>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-2"><i className="h-[3px] w-6 rounded bg-rose-600 dark:bg-rose-400" /> molhado → Macroscopia</span>
          <span className="inline-flex items-center gap-2"><i className="h-[3px] w-6 rounded bg-indigo-600 dark:bg-indigo-400" /> seco → Microtomia</span>
          <span className="inline-flex items-center gap-2"><i className="h-[3px] w-6 rounded bg-slate-400 dark:bg-slate-500" /> linha comum a todo material</span>
        </div>

        <Nota>
          A linha cheia é o botão <em>Avançar</em>, que sempre segue a sequência. As linhas tracejadas só acontecem por <em>Mover para</em>.
          Quando um cliente manda <strong className="font-semibold text-slate-800 dark:text-slate-200">seco e molhado na mesma entrada</strong>, a OS começa
          na Macroscopia — a etapa mais atrasada das duas. Nenhum volume pode pular uma fase que ainda precisa acontecer com ele.
        </Nota>
      </Secao>

      {/* ── 03 · etapas ─────────────────────────────────────────────────────── */}
      <Secao numero="03 · o que acontece em cada parada" titulo="A esteira por dentro">
        <ol className="border-l-2 border-slate-200 dark:border-slate-800">
          {ETAPAS.map((e) => (
            <li key={e.n} className="relative py-3.5 pl-6">
              <span
                className={`absolute -left-[5px] top-[22px] h-2.5 w-2.5 rounded-full ${
                  e.tom === 'molhado'
                    ? 'bg-rose-600 dark:bg-rose-400'
                    : e.tom === 'seco'
                      ? 'bg-indigo-600 dark:bg-indigo-400'
                      : 'bg-slate-300 dark:bg-slate-700'
                }`}
              />
              <p className="font-mono text-[11px] uppercase tracking-widest text-slate-400 dark:text-slate-500">{e.n}</p>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{e.nome}</h3>
              <p className="mt-0.5 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">{e.desc}</p>
            </li>
          ))}
        </ol>

        <Nota>
          A cada mudança de etapa o sistema grava o <strong className="font-semibold text-slate-800 dark:text-slate-200">rastreio</strong> das
          etiquetas — entrada e saída de departamento. É isso que alimenta a linha do tempo que você vê ao bipar um código na tela de Rastreio.
        </Nota>
      </Secao>

      {/* ── 04 · dinheiro ───────────────────────────────────────────────────── */}
      <Secao
        numero="04 · o dinheiro"
        titulo="A cobrança sai do que foi executado"
        texto="O orçamento é estimativa. O que a equipe lança na OS é o que de fato foi feito — e é essa lista que vira valor. Uma conta só, usada pelos três lugares que precisam concordar entre si."
      >
        <Quadro>
          <svg
            viewBox="0 0 940 280"
            role="img"
            aria-label="Os serviços lançados na Ordem de Serviço alimentam um único cálculo de consumo do mês, que abastece o fechamento mensal, a discriminação por serviço para a nota fiscal e a emissão da fatura com boleto."
            className="block h-auto w-full min-w-[680px] text-slate-700 dark:text-slate-300"
          >
            <defs>
              <marker id="mapa-seta3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="fill-slate-500 dark:fill-slate-400" />
              </marker>
            </defs>
            <g fill="currentColor" fontFamily="ui-sans-serif, system-ui, sans-serif">
              <rect x="24" y="102" width="216" height="80" rx="8" className="fill-blue-50 stroke-blue-500 dark:fill-blue-500/10 dark:stroke-blue-400" strokeWidth="2" />
              <g className="fill-blue-800 dark:fill-blue-300">
                <text x="42" y="132" fontSize="14" fontWeight="600">Serviços lançados</text>
                <text x="42" y="150" fontSize="14" fontWeight="600">na OS</text>
                <text x="42" y="170" fontSize="10.5" fontFamily="ui-monospace, monospace" opacity=".65">quantidade × preço</text>
              </g>

              <line x1="240" y1="142" x2="292" y2="142" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#mapa-seta3)" />

              <rect x="298" y="92" width="196" height="100" rx="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <text x="316" y="122" fontSize="14" fontWeight="600">Consumo do mês</text>
              <text x="316" y="146" fontSize="11" opacity=".7">OS abertas no período,</text>
              <text x="316" y="162" fontSize="11" opacity=".7">exceto as canceladas</text>
              <text x="316" y="180" fontSize="10.5" fontFamily="ui-monospace, monospace" opacity=".55">uma fonte só</text>

              <path d="M494,142 H528 V60 H556" fill="none" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#mapa-seta3)" />
              <line x1="494" y1="142" x2="556" y2="142" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#mapa-seta3)" />
              <path d="M494,142 H528 V224 H556" fill="none" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#mapa-seta3)" />

              <rect x="562" y="32" width="354" height="56" rx="6" fill="none" stroke="currentColor" strokeWidth="1" />
              <text x="580" y="56" fontSize="13" fontWeight="600">Fechamento mensal</text>
              <text x="580" y="74" fontSize="11" opacity=".7">quanto cada cliente consumiu</text>

              <rect x="562" y="114" width="354" height="56" rx="6" fill="none" stroke="currentColor" strokeWidth="1" />
              <text x="580" y="138" fontSize="13" fontWeight="600">Discriminação por serviço</text>
              <text x="580" y="156" fontSize="11" opacity=".7">base da nota fiscal</text>

              <rect x="562" y="196" width="354" height="56" rx="6" fill="none" stroke="currentColor" strokeWidth="1" />
              <text x="580" y="220" fontSize="13" fontWeight="600">Fatura e boleto</text>
              <text x="580" y="238" fontSize="11" fontFamily="ui-monospace, monospace" opacity=".62">FAT-202608-001</text>
            </g>
          </svg>
        </Quadro>

        <Nota>
          Uma OS <strong className="font-semibold text-slate-800 dark:text-slate-200">sem serviço definido não some</strong> da conta: fica fora do valor,
          mas é reportada por cliente e no total. Tentar faturar um mês que só tem OS assim devolve <em>“N OS aguardando conferência”</em> em vez de um
          silencioso “nada a faturar”. Faturar de menos por esquecimento é o erro caro aqui.
        </Nota>
      </Secao>

      {/* ── 05 · códigos ────────────────────────────────────────────────────── */}
      <Secao
        numero="05 · como ler os códigos"
        titulo="Cada objeto tem seu número"
        texto="Todos são sequenciais e não se repetem, mesmo depois de cancelamentos. Pelo prefixo dá para saber em que ponto do caminho aquele papel foi impresso."
      >
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Formato</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">O que é</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nasce em</th>
              </tr>
            </thead>
            <tbody>
              {CODIGOS.map((c) => (
                <tr key={c.formato} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="whitespace-nowrap px-4 py-3">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {c.formato}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{c.oque}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{c.onde}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>
    </div>
  )
}
