'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import type { ApexOptions } from 'apexcharts'
import {
  ClipboardList,
  PackageOpen,
  ShieldCheck,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'

// ApexCharts precisa rodar só no client (window não existe no SSR)
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

/* --------------- hook: cores dos gráficos dependentes do tema --------------- */

function useChartTheme() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  return {
    isDark,
    gridColor: isDark ? '#1E293B' : '#ECEEF2', // slate-800 / stone-100-ish
    textColor: isDark ? '#94A3B8' : '#64748B', // slate-400 / slate-500
    secondarySeries: isDark ? '#334155' : '#CBD5E1', // slate-700 / slate-300
  }
}

/* ----------------------------- KPIs ----------------------------- */

type Trend = 'up' | 'down' | 'flat'

type KPI = {
  label: string
  valor: string
  delta: string
  trend: Trend
  color: string
  sparkline: number[]
  Icon: LucideIcon
}

// TODO: trocar por dados reais quando a API tiver endpoints de métricas
const kpis: KPI[] = [
  {
    label: 'Pedidos hoje',
    valor: '12',
    delta: '+16%',
    trend: 'up',
    color: '#2563eb',
    sparkline: [8, 15, 12, 20, 18, 22, 12],
    Icon: ClipboardList,
  },
  {
    label: 'Amostras em processo',
    valor: '34',
    delta: '−8%',
    trend: 'down',
    color: '#FFC107',
    sparkline: [40, 38, 42, 35, 45, 36, 34],
    Icon: PackageOpen,
  },
  {
    label: 'Laudos prontos',
    valor: '5',
    delta: '+25%',
    trend: 'up',
    color: '#25B003',
    sparkline: [3, 5, 4, 6, 5, 8, 5],
    Icon: ShieldCheck,
  },
  {
    label: 'Faturamento do mês',
    valor: 'R$ 48,2k',
    delta: '+12%',
    trend: 'up',
    color: '#605DFF',
    sparkline: [35, 40, 38, 45, 42, 48, 48],
    Icon: Wallet,
  },
]

function sparklineOptions(color: string): ApexOptions {
  return {
    chart: {
      type: 'area',
      sparkline: { enabled: true },
      animations: { enabled: true, speed: 400 },
    },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0,
        stops: [0, 100],
      },
    },
    colors: [color],
    tooltip: { enabled: false },
  }
}

function KpiCard({ kpi }: { kpi: KPI }) {
  const { label, valor, delta, trend, color, sparkline, Icon } = kpi

  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus
  const trendColor =
    trend === 'up'
      ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10'
      : trend === 'down'
      ? 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10'
      : 'text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800'

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-5 flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{label}</p>
          <p className="text-[28px] font-semibold text-slate-900 dark:text-white mt-1 tabular-nums leading-none">
            {valor}
          </p>
        </div>
        <div
          className="p-2.5 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color }} strokeWidth={2} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold ${trendColor}`}
        >
          <TrendIcon className="h-3 w-3" strokeWidth={2.5} />
          {delta}
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">vs. semana anterior</span>
      </div>

      <div className="mt-3 -mx-3 -mb-3">
        <Chart
          options={sparklineOptions(color)}
          series={[{ name: label, data: sparkline }]}
          type="area"
          height={60}
        />
      </div>
    </div>
  )
}

/* -------------------------- Gráfico principal -------------------------- */

function MainChart() {
  const { gridColor, textColor, secondarySeries } = useChartTheme()

  const options: ApexOptions = {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'inherit',
      background: 'transparent',
    },
    stroke: { curve: 'smooth', width: [2.5, 2.5] },
    colors: ['#2563eb', secondarySeries],
    dataLabels: { enabled: false },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0,
        stops: [0, 90, 100],
      },
    },
    grid: {
      borderColor: gridColor,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
      axisTicks: { show: false },
      axisBorder: { show: false },
      labels: { style: { colors: textColor, fontSize: '12px' } },
    },
    yaxis: {
      labels: {
        style: { colors: textColor, fontSize: '12px' },
        formatter: (val) => `${val}`,
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
      labels: { colors: textColor },
      markers: { shape: 'circle', size: 5 },
      itemMargin: { horizontal: 10, vertical: 0 },
    },
    tooltip: {
      theme: 'light', // o tooltip fica branco mesmo no dark (melhor legibilidade)
      y: { formatter: (val) => `${val} pedidos` },
    },
  }

  const series = [
    { name: 'Este ano', data: [110, 145, 120, 165, 180, 150, 190, 205, 180, 220, 235, 210] },
    { name: 'Ano anterior', data: [95, 120, 105, 140, 155, 130, 160, 175, 155, 190, 200, 185] },
  ]

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Pedidos ao longo do ano
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Comparativo mensal — Este ano vs. Ano anterior
          </p>
        </div>
      </div>
      <Chart options={options} series={series} type="area" height={320} />
    </div>
  )
}

/* -------------------------- Últimos pedidos -------------------------- */

type RecentOrder = {
  codigo: string
  cliente: string
  servico: string
  status: 'Recebido' | 'Em processo' | 'Pronto' | 'Entregue'
  valor: string
}

// TODO: trocar por dados reais quando o endpoint GET /pedidos existir
const recentOrders: RecentOrder[] = [
  { codigo: 'PED-2026-0042', cliente: 'Clínica Vida', servico: 'Histopatológico',    status: 'Em processo', valor: 'R$ 120,00' },
  { codigo: 'PED-2026-0041', cliente: 'Dr. Souza',    servico: 'Citologia',          status: 'Pronto',      valor: 'R$ 45,00'  },
  { codigo: 'PED-2026-0040', cliente: 'Hospital SG',  servico: 'Imuno-histoquímica', status: 'Recebido',    valor: 'R$ 240,00' },
  { codigo: 'PED-2026-0039', cliente: 'Clínica Vida', servico: 'Biópsia',            status: 'Entregue',    valor: 'R$ 85,00'  },
  { codigo: 'PED-2026-0038', cliente: 'Dra. Lima',    servico: 'Histopatológico',    status: 'Em processo', valor: 'R$ 120,00' },
]

const statusStyles: Record<RecentOrder['status'], string> = {
  Recebido:     'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  'Em processo': 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  Pronto:       'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  Entregue:     'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

function RecentOrdersCard() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Últimos pedidos</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Atividade recente do laboratório
          </p>
        </div>
        <button className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300">
          Ver todos
        </button>
      </div>

      <table className="w-full">
        <thead className="bg-slate-50/50 dark:bg-slate-800/30">
          <tr>
            <th className="text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-3">
              Código
            </th>
            <th className="text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-3">
              Cliente
            </th>
            <th className="text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-3">
              Serviço
            </th>
            <th className="text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-3">
              Status
            </th>
            <th className="text-right text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-3">
              Valor
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {recentOrders.map((order) => (
            <tr key={order.codigo} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
              <td className="px-5 py-3.5 text-[13px] font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                {order.codigo}
              </td>
              <td className="px-5 py-3.5 text-[13px] text-slate-900 dark:text-white font-medium">
                {order.cliente}
              </td>
              <td className="px-5 py-3.5 text-[13px] text-slate-600 dark:text-slate-400">
                {order.servico}
              </td>
              <td className="px-5 py-3.5">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyles[order.status]}`}
                >
                  {order.status}
                </span>
              </td>
              <td className="px-5 py-3.5 text-[13px] text-slate-900 dark:text-white font-medium text-right tabular-nums">
                {order.valor}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------ Página ------------------------------ */

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral do laboratório" />

      {/* KPI cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-5">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </section>

      {/* Gráfico principal */}
      <section className="mb-5">
        <MainChart />
      </section>

      {/* Últimos pedidos */}
      <section>
        <RecentOrdersCard />
      </section>
    </div>
  )
}
