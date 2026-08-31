import { ETAPAS_ORDEM, ETAPA_LABEL, ETAPAS_TERMINAIS } from './etapas'

/**
 * Fonte única do guia "onde estou / o que vem agora" (plano "O próximo passo").
 *
 * Toda tela do processo mostra a mesma tríade — chip da fase, próxima ação
 * NOMEADA e dica do que falta para liberar — e as três saem daqui. A função
 * recebe fatos, não o objeto da API: cada tela traduz o payload que tem para
 * os cinco campos de entrada, e a regra vive num lugar só.
 */

export type FatosOS = {
  status: string
  etapaAtual: string
  /** null = o payload desta tela não sabe (ex.: lista sem os itens). */
  temServico: boolean | null
  temAmostra: boolean
  temPedido: boolean
}

export type AcaoGuia = {
  tipo: 'definir_servico' | 'avancar' | 'solicitar_laudo' | 'conferencia' | 'notificar'
  rotulo: string
  habilitada: boolean
}

export type GuiaOS = {
  /** "aguardando macroscopia" · "concluída" · "cancelada" · "arquivada"… */
  chip: string
  encerrada: boolean
  /** A ação em destaque — o botão primário. */
  primaria: AcaoGuia | null
  /** Ação de fluxo quando a primária é outra coisa (ex.: avançar enquanto falta serviço). */
  secundaria: AcaoGuia | null
  /** O que falta para liberar o que está pendente. */
  dicas: string[]
}

/** Rótulo curto da etapa: "Processamento / Inclusão" → "Processamento". */
export function etapaCurta(etapa: string): string {
  const label = ETAPA_LABEL[etapa] ?? etapa
  return label.split(/ [\/(]/)[0].trim()
}

function proximaEtapa(etapaAtual: string): string | null {
  const i = ETAPAS_ORDEM.indexOf(etapaAtual as (typeof ETAPAS_ORDEM)[number])
  return i >= 0 && i < ETAPAS_ORDEM.length - 1 ? ETAPAS_ORDEM[i + 1] : null
}

/** Rótulo do botão de avanço a partir da etapa atual: "Avançar para Coloração". */
export function rotuloAvanco(etapaAtual: string): string {
  const proxima = proximaEtapa(etapaAtual)
  return proxima ? `Avançar para ${etapaCurta(proxima)}` : 'Concluir OS'
}

export function guiaDaOS(f: FatosOS): GuiaOS {
  if (f.status === 'cancelada') {
    return { chip: 'cancelada', encerrada: true, primaria: null, secundaria: null, dicas: [] }
  }
  if (f.status === 'concluida') {
    const chip = ETAPAS_TERMINAIS.includes(f.etapaAtual)
      ? (f.etapaAtual === 'descarte' ? 'descartada' : 'arquivada')
      : 'concluída'
    return { chip, encerrada: true, primaria: null, secundaria: null, dicas: [] }
  }

  const chip = `aguardando ${etapaCurta(f.etapaAtual).toLowerCase()}`
  const avancar: AcaoGuia = { tipo: 'avancar', rotulo: rotuloAvanco(f.etapaAtual), habilitada: true }

  const dicas: string[] = []
  // A ação da etapa em que a OS está — o que a bancada faria agora.
  let daEtapa: AcaoGuia = avancar
  if (f.etapaAtual === 'laudo') {
    if (f.temPedido) {
      daEtapa = { tipo: 'solicitar_laudo', rotulo: 'Solicitar laudo', habilitada: true }
    } else {
      dicas.push('O laudo é solicitado pelo pedido — vincule o volume da Entrada ao pedido do cliente para liberar.')
    }
  } else if (f.etapaAtual === 'finalizacao') {
    // A conferência de saída vale para toda OS: lâminas bipadas uma a uma e o
    // código da própria OS como carimbo final de entrega.
    daEtapa = { tipo: 'conferencia', rotulo: 'Conferência de saída', habilitada: true }
    if (!f.temAmostra) {
      dicas.push('OS sem etiquetas: a saída é confirmada bipando o código da própria OS.')
    }
  } else if (f.etapaAtual === 'expedicao' && f.temPedido) {
    daEtapa = { tipo: 'notificar', rotulo: 'Notificar cliente', habilitada: true }
  }

  // Sem serviço definido, o dinheiro para: essa ação fura a fila da etapa.
  // (Guia sem travar — a bancada segue avançando; o destaque só aponta o buraco.)
  if (f.temServico === false) {
    dicas.push('Sem serviço definido, esta OS fica fora da cobrança do mês.')
    return {
      chip,
      encerrada: false,
      primaria: { tipo: 'definir_servico', rotulo: 'Definir serviço', habilitada: true },
      secundaria: daEtapa,
      dicas,
    }
  }

  return {
    chip,
    encerrada: false,
    primaria: daEtapa,
    secundaria: daEtapa.tipo === 'avancar' ? null : avancar,
    dicas,
  }
}
