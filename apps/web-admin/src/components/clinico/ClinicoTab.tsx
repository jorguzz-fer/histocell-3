'use client'

import { useMemo, useState } from 'react'
import { Dna, Palette } from 'lucide-react'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import { buildClinicalIndex } from '@/lib/clinica/resolver'
import type { ClinicalIntelligenceJson } from '@/lib/clinica/types'
import ciJson from '@/lib/clinica/clinical-intelligence.json'
import { IHCPanel } from './IHCPanel'
import { ColoracaoPanel } from './ColoracaoPanel'

type SubTab = 'ihc' | 'coloracao'

interface Props {
  servicos: Servico[]
  onSelect: (s: Servico) => void | Promise<void>
  onServicoCriado: (s: Servico) => void
}

export function ClinicoTab({ servicos, onSelect, onServicoCriado }: Props) {
  const [sub, setSub] = useState<SubTab>('ihc')

  const index = useMemo(
    () => buildClinicalIndex(servicos, ciJson as unknown as ClinicalIntelligenceJson),
    [servicos],
  )

  const subTabs: { key: SubTab; label: string; icon: React.ElementType }[] = [
    { key: 'ihc',       label: 'Imunohistoquímica', icon: Dna },
    { key: 'coloracao', label: 'Colorações',        icon: Palette },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {subTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSub(key)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
              sub === key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {sub === 'ihc' && (
        <IHCPanel index={index} onSelect={onSelect} onServicoCriado={onServicoCriado} />
      )}
      {sub === 'coloracao' && (
        <ColoracaoPanel index={index} onSelect={onSelect} onServicoCriado={onServicoCriado} />
      )}
    </div>
  )
}
