'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErro('')

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })

      if (!res.ok) {
        throw new Error('Credenciais inválidas')
      }

      const data = await res.json()
      localStorage.setItem('token', data.accessToken)
      localStorage.setItem('user', JSON.stringify(data.user))
      window.location.href = '/dashboard'
    } catch (err: any) {
      setErro(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-card border border-slate-200 dark:border-slate-800">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Histocell
          </h1>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Painel Administrativo
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-[13px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-3 py-2 text-[13px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          {erro && (
            <p className="text-[13px] text-rose-600 dark:text-rose-400">{erro}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium rounded-md disabled:opacity-50 transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
