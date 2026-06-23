import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Histocell - Portal do Cliente',
  description: 'Portal do Cliente - Acompanhe seus pedidos e laudos',
}

// aplica o tema salvo antes da pintura (evita flash)
const themeScript = `
(function(){try{var t=localStorage.getItem('tema');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-slate-50 dark:bg-slate-950">{children}</body>
    </html>
  )
}
