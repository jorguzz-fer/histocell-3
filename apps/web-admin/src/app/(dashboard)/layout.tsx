'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/cadastro', label: 'Clientes', icon: '👥' },
  { href: '/pedidos', label: 'Pedidos', icon: '📋' },
  { href: '/recebimento', label: 'Recebimento', icon: '📦' },
  { href: '/ordens', label: 'Ordens de Serviço', icon: '🔬' },
  { href: '/etiquetas', label: 'Etiquetas', icon: '🏷️' },
  { href: '/qualidade', label: 'Qualidade', icon: '✅' },
  { href: '/comercial', label: 'Comercial', icon: '💼' },
  { href: '/financeiro', label: 'Financeiro', icon: '💰' },
  { href: '/relatorios', label: 'Relatórios', icon: '📈' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-histocell-900 text-white flex flex-col">
        <div className="p-4 border-b border-histocell-800">
          <h1 className="text-lg font-bold">Histocell</h1>
          <p className="text-xs text-histocell-100/60">Gestão Laboratorial</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-histocell-700 text-white'
                  : 'text-histocell-100/70 hover:bg-histocell-800 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-histocell-800">
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-histocell-100/70 hover:text-white hover:bg-histocell-800 rounded-lg text-left"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
