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
  DoorOpen,
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
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import { UserMenu, type UsuarioLogado } from '@/components/UserMenu'

type MenuItem = {
  href: string
  label: string
  icon: LucideIcon
  /** Chave de permissão (área). Item só aparece se o usuário tiver a permissão. */
  perm?: string
  /** Fallback legado por perfil (usado quando o usuário ainda não tem permissões). */
  roles?: string[]
}

// Menu em grupos, na ordem do fluxo (plano "O próximo passo"):
// FLUXO é a sequência da operação — a mesma do mapa em /mapa; APOIO são os
// cadastros que alimentam o fluxo; GESTÃO é quem olha o conjunto. A ordem do
// menu vira o "onde estou" implícito de quem trabalha de cima para baixo.
type MenuGrupo = { titulo: string; itens: MenuItem[] }

const menuGrupos: MenuGrupo[] = [
  {
    titulo: 'Fluxo',
    itens: [
      { href: '/pedidos-legado', label: 'Novo Pedido', icon: FileSpreadsheet, perm: 'orcamento', roles: ['gerencia', 'recepcao', 'financeiro'] },
      // Porta de entrada física: identifica o cliente + o objeto que chegou e
      // imprime a etiqueta do volume, antes de existir orçamento. Compartilha a
      // permissão de Recebimento (é a etapa anterior dele).
      { href: '/entrada', label: 'Entrada', icon: DoorOpen, perm: 'recebimento' },
      { href: '/recebimento', label: 'Recebimento', icon: PackageOpen, perm: 'recebimento' },
      // A OS é o centro do fluxo: nasce na Entrada, é onde se define o serviço e
      // de onde a execução é tocada. Substituiu a antiga /ordens (que redireciona).
      { href: '/os', label: 'Ordem de Serviço', icon: ClipboardList, perm: 'ordens' },
      { href: '/fila', label: 'Fila', icon: Inbox, perm: 'fila' },
      { href: '/rastreio', label: 'Rastreio', icon: ScanLine, perm: 'rastreio' },
      { href: '/laudos', label: 'Laudos', icon: FileText, perm: 'laudos' },
    ],
  },
  {
    titulo: 'Apoio',
    itens: [
      // Clientes fica em Apoio por ser cadastro; se a recepção o tratar como
      // passo zero do dia, é uma linha para subir ao topo do Fluxo.
      { href: '/cadastro', label: 'Clientes', icon: Users, perm: 'clientes' },
      { href: '/servicos', label: 'Cadastro Serviço', icon: FlaskConical, perm: 'orcamento', roles: ['gerencia'] },
      { href: '/etiquetas', label: 'Etiquetas', icon: Tags, perm: 'etiquetas' },
      { href: '/pacotes', label: 'Pacotes', icon: Boxes, perm: 'pacotes', roles: ['gerencia', 'recepcao', 'financeiro'] },
      { href: '/motivos', label: 'Motivos', icon: MessageSquare, perm: 'motivos', roles: ['gerencia'] },
      // Qualidade: não usado hoje — fica no fim do Apoio (implementar depois).
      { href: '/qualidade', label: 'Qualidade', icon: ShieldCheck, perm: 'qualidade' },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard', roles: ['gerencia'] },
      { href: '/relatorios', label: 'Relatórios', icon: LineChart, perm: 'relatorios', roles: ['gerencia', 'financeiro'] },
      { href: '/comercial', label: 'Orçamentos', icon: Briefcase, perm: 'comercial', roles: ['gerencia', 'financeiro'] },
      { href: '/financeiro', label: 'Financeiro', icon: Wallet, perm: 'financeiro', roles: ['gerencia', 'financeiro'] },
      { href: '/contratos', label: 'Contratos', icon: FileSignature, perm: 'financeiro', roles: ['gerencia', 'financeiro'] },
      { href: '/usuarios', label: 'Usuários e Acessos', icon: UserCog, perm: 'usuarios', roles: ['gerencia'] },
    ],
  },
]

// Lista plana: a guarda de rota e o fallback de permissão não mudam com os grupos.
const menuItems: MenuItem[] = menuGrupos.flatMap((g) => g.itens)

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)
  const [permissoes, setPermissoes] = useState<string[] | null>(null)
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      setRole(u?.role ?? null)
      setPermissoes(Array.isArray(u?.permissoes) ? u.permissoes : null)
      setUsuario(u?.nome || u?.email ? u : null)
    } catch {
      setRole(null)
      setPermissoes(null)
      setUsuario(null)
    }
  }, [])

  // Acesso baseado em permissões (fonte de verdade). Fallback por perfil quando
  // o usuário ainda não tem permissões no storage (sessão antiga, pré-login novo).
  const podeAcessar = (item: MenuItem): boolean => {
    if (permissoes && permissoes.length > 0) return !item.perm || permissoes.includes(item.perm)
    return !item.roles || (role != null && item.roles.includes(role))
  }

  // Grupos com só os itens que o usuário pode ver; grupo vazio não aparece.
  const gruposVisiveis = menuGrupos
    .map((g) => ({ ...g, itens: g.itens.filter(podeAcessar) }))
    .filter((g) => g.itens.length > 0)

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

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 dark:bg-slate-950">
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

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {gruposVisiveis.map((grupo, gi) => (
            <div key={grupo.titulo} className={gi > 0 ? 'mt-4' : ''}>
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 select-none">
                {grupo.titulo}
              </p>
              <div className="space-y-0.5">
                {grupo.itens.map((item) => {
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
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra do topo: só a área do usuário — o que é da conta (tema,
            senha, sair) sai do menu lateral, que fica só com a operação. */}
        <header className="h-14 shrink-0 border-b border-slate-200 bg-white px-6 flex items-center justify-end dark:border-slate-800 dark:bg-slate-900">
          <UserMenu usuario={usuario} />
        </header>
        <main className="flex-1 overflow-auto">
          <div className="max-w-[1400px] mx-auto px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
