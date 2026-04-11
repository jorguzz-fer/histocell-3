'use client'

import Link from 'next/link'
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
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-200">
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Histocell</h1>
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400 mt-0.5 font-medium">
            Gestão Laboratorial
          </p>
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
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                    isActive
                      ? 'text-blue-600'
                      : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                  strokeWidth={1.75}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
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
