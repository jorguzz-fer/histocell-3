'use client'

import { useState } from 'react'

export default function LoginClientePage() {
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

      if (!res.ok) throw new Error('Credenciais inválidas')

      const data = await res.json()
      localStorage.setItem('token', data.accessToken)
      localStorage.setItem('user', JSON.stringify(data.user))
      window.location.href = '/pedidos'
    } catch (err: any) {
      setErro(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-histocell-50 to-blue-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-sm border">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-histocell-900">Histocell</h1>
          <p className="text-gray-500 mt-1">Portal do Cliente</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-histocell-500"
              placeholder="seu@empresa.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-histocell-500"
              placeholder="••••••••"
              required
            />
          </div>

          {erro && <p className="text-red-500 text-sm">{erro}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-histocell-700 text-white rounded-lg hover:bg-histocell-800 disabled:opacity-50 font-medium"
          >
            {loading ? 'Entrando...' : 'Acessar Portal'}
          </button>
        </form>
      </div>
    </div>
  )
}
