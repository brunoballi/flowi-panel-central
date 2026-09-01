'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface GrowthPoint {
  month: string // 'YYYY-MM'
  total: number // clientes activos/en prueba acumulados a fin de ese mes
}

// Área con total acumulado en vez de barras por mes: con pocos clientes,
// un gráfico de barras mensual se ve como puntos sueltos y no cuenta nada.
// El acumulado siempre se lee igual — "así viene creciendo la cartera" —
// sea 1 cliente o 100. Sigue la recomendación de la skill de UI para
// tendencias en el tiempo: line/area, no barras.
export function GrowthChart({ data }: { data: GrowthPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Todavía no hay clientes registrados.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'currentColor' }} className="text-zinc-500 dark:text-zinc-400" stroke="currentColor" />
        <YAxis
          allowDecimals={false}
          width={32}
          tick={{ fontSize: 12, fill: 'currentColor' }}
          className="text-zinc-500 dark:text-zinc-400"
          stroke="currentColor"
        />
        <Tooltip
          formatter={(value) => [`${value} cliente${value === 1 ? '' : 's'}`, 'Total']}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#2563eb"
          strokeWidth={2}
          fill="url(#growthFill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
