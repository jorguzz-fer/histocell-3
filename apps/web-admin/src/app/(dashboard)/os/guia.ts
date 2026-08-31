import type { FatosOS } from '@/lib/proximoPasso'
import type { OrdemServico } from './types'

/** Tradução do payload de /ordens para os fatos que o guia entende. */
export function fatosDaOS(os: OrdemServico): FatosOS {
  return {
    status: os.status,
    etapaAtual: os.etapaAtual,
    temServico: os.itens.length > 0,
    temAmostra: os.amostra != null,
    temPedido: os.amostra?.pedido != null,
  }
}
