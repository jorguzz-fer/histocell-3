import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Histocell - Portal do Cliente',
  description: 'Portal do Cliente - Acompanhe seus pedidos e laudos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
