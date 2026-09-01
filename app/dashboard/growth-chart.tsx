'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface GrowthPoint {
  month: string // 'YYYY-MM'
  total: number // clientes activos/en prueba acumulados a fin de ese mes
}

// Línea simple con puntos grandes y el número al lado de cada uno: se lee
// como una historia ("acá había 1, acá 2...") aunque haya pocos meses de
// datos, sin necesitar leer ejes con atención.
export function GrowthChart({ data }: { data: GrowthPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Todavía no hay clientes registrados.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 24, right: 16, left: -16, bottom: 0 }}>
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
        <Line
          type="monotone"
          dataKey="total"
          stroke="#2563eb"
          strokeWidth={3}
          dot={{ r: 5, fill: '#2563eb', strokeWidth: 2, stroke: 'var(--background)' }}
          activeDot={{ r: 7 }}
          label={{ position: 'top', fontSize: 12, fill: '#2563eb', fontWeight: 600 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
