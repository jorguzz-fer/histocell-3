'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  PackageOpen,
  Microscope,
  Tags,
  ShieldCheck,
  Briefcase,
  Wallet,
  LineChart,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

type MenuItem = {
  href: string
  label: string
  icon: LucideIcon
}

const menuItems: MenuItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cadastro', label: 'Clientes', icon: Users },
  { href: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/recebimento', label: 'Recebimento', icon: PackageOpen },
  { href: '/ordens', label: 'Ordens de Serviço', icon: Microscope },
  { href: '/etiquetas', label: 'Etiquetas', icon: Tags },
  { href: '/qualidade', label: 'Qualidade', icon: ShieldCheck },
  { href: '/comercial', label: 'Comercial', icon: Briefcase },
  { href: '/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/relatorios', label: 'Relatórios', icon: LineChart },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

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
          {menuItems.map((item) => {
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
