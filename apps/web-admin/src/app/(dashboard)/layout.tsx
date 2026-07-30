'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Boxes,
  FlaskConical,
  PackageOpen,
  Inbox,
  Tags,
  ClipboardList,
  ScanLine,
  FileText,
  MessageSquare,
  ShieldCheck,
  Briefcase,
  Wallet,
  LineChart,
  FileSignature,
  LogOut,
  UserCog,
  KeyRound,
  type LucideIcon,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

type MenuItem = {
  href: string
  label: string
  icon: LucideIcon
  /** Chave de permissão (área). Item só aparece se o usuário tiver a permissão. */
  perm?: string
  /** Fallback legado por perfil (usado quando o usuário ainda não tem permissões). */
  roles?: string[]
}

// Ordem alinhada à sequência operacional definida na 3ª homologação (Célio):
// Cliente → Recebimento → Orçamento → Etiquetas → Ordem de Serviço → Rastreio …
const menuItems: MenuItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard', roles: ['gerencia'] },
  { href: '/cadastro', label: 'Clientes', icon: Users, perm: 'clientes' },
  // Orçamento entre Clientes e Recebimento (ordem do fluxo: cadastra → orça → recebe).
  // Telas com valores: ocultas para o perfil técnico (sem valores).
  { href: '/pedidos-legado', label: 'Orçamento', icon: FileSpreadsheet, perm: 'orcamento', roles: ['gerencia', 'recepcao', 'financeiro'] },
  { href: '/recebimento', label: 'Recebimento', icon: PackageOpen, perm: 'recebimento' },
  { href: '/fila', label: 'Fila', icon: Inbox, perm: 'fila' },
  // Itens removidos do menu (rotas/códigos mantidos): '/pedidos' e '/pedidos-guiado'
  { href: '/pacotes', label: 'Pacotes', icon: Boxes, perm: 'pacotes', roles: ['gerencia', 'recepcao', 'financeiro'] },
  { href: '/etiquetas', label: 'Etiquetas', icon: Tags, perm: 'etiquetas' },
  { href: '/ordens', label: 'Ordem de Serviço', icon: ClipboardList, perm: 'ordens' },
  { href: '/rastreio', label: 'Rastreio', icon: ScanLine, perm: 'rastreio' },
  { href: '/laudos', label: 'Laudos', icon: FileText, perm: 'laudos' },
  // Cadastro de serviços (criar/editar/arquivar) — tirado de dentro do Orçamento.
  { href: '/servicos', label: 'Cadastro Serviço', icon: FlaskConical, perm: 'orcamento', roles: ['gerencia'] },
  { href: '/relatorios', label: 'Relatórios', icon: LineChart, perm: 'relatorios', roles: ['gerencia', 'financeiro'] },
  { href: '/motivos', label: 'Motivos', icon: MessageSquare, perm: 'motivos', roles: ['gerencia'] },
  { href: '/comercial', label: 'Comercial', icon: Briefcase, perm: 'comercial', roles: ['gerencia', 'financeiro'] },
  // Qualidade: não usado hoje — fica no rodapé do menu (implementar depois).
  { href: '/qualidade', label: 'Qualidade', icon: ShieldCheck, perm: 'qualidade' },
  // Financeiro por último.
  { href: '/financeiro', label: 'Financeiro', icon: Wallet, perm: 'financeiro', roles: ['gerencia', 'financeiro'] },
  { href: '/contratos', label: 'Contratos', icon: FileSignature, perm: 'financeiro', roles: ['gerencia', 'financeiro'] },
  // Administração de usuários, papéis e permissões (gerência).
  { href: '/usuarios', label: 'Usuários e Acessos', icon: UserCog, perm: 'usuarios', roles: ['gerencia'] },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)
  const [permissoes, setPermissoes] = useState<string[] | null>(null)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      setRole(u?.role ?? null)
      setPermissoes(Array.isArray(u?.permissoes) ? u.permissoes : null)
    } catch {
      setRole(null)
      setPermissoes(null)
    }
  }, [])

  // Acesso baseado em permissões (fonte de verdade). Fallback por perfil quando
  // o usuário ainda não tem permissões no storage (sessão antiga, pré-login novo).
  const podeAcessar = (item: MenuItem): boolean => {
    if (permissoes && permissoes.length > 0) return !item.perm || permissoes.includes(item.perm)
    return !item.roles || (role != null && item.roles.includes(role))
  }

  const visibleItems = menuItems.filter(podeAcessar)

  // Guarda de rota: quem tenta abrir uma tela sem permissão via URL é
  // redirecionado para a primeira tela permitida.
  useEffect(() => {
    if (role == null) return
    const restrito = menuItems.find(
      (item) => (item.perm || item.roles) && pathname.startsWith(item.href) && !podeAcessar(item),
    )
    if (restrito) {
      const destino = menuItems.find(podeAcessar)
      window.location.href = destino?.href ?? '/recebimento'
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, permissoes, pathname])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800">
          {/* Logo — versão escura (preto) no tema light */}
          <Image
            src="/logo-light.png"
            alt="Histocell — Soluções em Anatomia Patológica"
            width={638}
            height={199}
            priority
            className="w-auto h-10 block dark:hidden"
          />
          {/* Logo — versão clara (branco) no tema dark */}
          <Image
            src="/logo-dark.png"
            alt="Histocell — Soluções em Anatomia Patológica"
            width={638}
            height={199}
            priority
            className="w-auto h-10 hidden dark:block"
          />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                  }`}
                  strokeWidth={1.75}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800 space-y-0.5">
          <ThemeToggle />
          <Link
            href="/trocar-senha"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60 transition-all"
          >
            <KeyRound className="h-[18px] w-[18px] text-slate-400" strokeWidth={1.75} />
            <span>Trocar senha</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60 transition-all"
          >
            <LogOut className="h-[18px] w-[18px] text-slate-400" strokeWidth={1.75} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
