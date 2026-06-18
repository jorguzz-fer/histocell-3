/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // logo é estático — sem otimização evita exigir 'sharp' e escrever em .next/cache
  images: { unoptimized: true },
}

module.exports = nextConfig
