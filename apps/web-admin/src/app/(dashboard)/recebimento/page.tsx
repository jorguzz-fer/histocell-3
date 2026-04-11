import { PageHeader } from '@/components/PageHeader'

export default function RecebimentoPage() {
  return (
    <div>
      <PageHeader
        title="Recebimento"
        subtitle="Entrada e conferência de amostras no laboratório"
      />
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-16 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Módulo em desenvolvimento</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Esta página será construída em breve.
        </p>
      </div>
    </div>
  )
}
