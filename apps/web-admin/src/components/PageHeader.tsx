import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** Título da página — ex: "Clientes" */
  title: string
  /** Legenda opcional abaixo do título — ex: "Cadastro de clientes e médicos" */
  subtitle?: string
  /** Ação opcional à direita do título — ex: um botão "Novo cliente" */
  action?: ReactNode
}

/**
 * Cabeçalho padrão de todas as páginas do painel admin.
 * Garante consistência visual (tipografia, spacing, dark mode) em todo lugar.
 *
 * Exemplo:
 *   <PageHeader
 *     title="Clientes"
 *     subtitle="Cadastro de clientes e médicos solicitantes"
 *     action={<button>Novo cliente</button>}
 *   />
 */
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
