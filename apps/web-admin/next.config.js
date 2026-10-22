/** @type {import('next').NextConfig} */

// Origem da API (build-time) liberada no connect-src da CSP.
const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''

// Consultas públicas que o cadastro de cliente faz DIRETO do navegador:
// ViaCEP (endereço pelo CEP) e BrasilAPI (razão social pelo CNPJ). Precisam
// estar no connect-src — sem elas a CSP bloqueia o fetch e a tela só diz
// "não foi possível consultar", sem pista do motivo.
const consultasPublicas = ['https://viacep.com.br', 'https://brasilapi.com.br']

// CSP — segunda camada contra XSS (defense-in-depth para o JWT ainda em
// localStorage). Next precisa de 'unsafe-inline'/'unsafe-eval' para hydration.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiUrl} ${consultasPublicas.join(' ')}`.replace(/\s+/g, ' ').trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // logo é estático — sem otimização evita exigir 'sharp' e escrever em .next/cache
  images: { unoptimized: true },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

module.exports = nextConfig
