import { clienteCor, iniciais } from '@/lib/clienteVisual'

/**
 * Avatar do cliente: círculo com a cor única do cliente + as iniciais.
 * A cor vem do `seed` (use o id do cliente para garantir cor única e estável);
 * as iniciais vêm do `nome` (nomeFantasia ou nome). Acompanha o pedido em
 * todas as telas.
 */
export function ClienteAvatar({
  nome,
  seed,
  size = 28,
  className = '',
}: {
  nome: string
  seed?: string | number
  size?: number
  className?: string
}) {
  const { bg } = clienteCor(seed ?? nome)
  return (
    <span
      title={nome}
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white leading-none select-none ${className}`}
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.4) }}
    >
      {iniciais(nome)}
    </span>
  )
}
