import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Azul principal Histocell
        histocell: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a5f',
        },
        // Paleta semântica inspirada no Trezo Admin
        brand: {
          primary: '#2563eb', // azul Histocell
          success: '#25B003', // verde
          warning: '#FFC107', // amarelo
          danger: '#FF4023',  // vermelho-laranja
          info: '#0DCAF0',    // ciano
          purple: '#605DFF',  // roxo-azulado
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        card: '7px', // padrão do Trezo
      },
    },
  },
  plugins: [],
}
export default config
