'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface MonthlyCount {
  month: string // 'YYYY-MM'
  count: number
}

export function MonthlySignupsChart({ data }: { data: MonthlyCount[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-zinc-500">Todavía no hay altas registradas.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#71717a" />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#71717a" />
        <Tooltip />
        <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
