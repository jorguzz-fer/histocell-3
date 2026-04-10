import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Histocell Admin',
  description: 'Painel Administrativo - Sistema de Gestão Laboratorial',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
