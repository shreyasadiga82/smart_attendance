import React from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface SessionDonutProps {
  data: {
    name: string
    value: number
  }[]
}

export const SessionDonut = ({ data }: SessionDonutProps) => {
  if (!data || data.length === 0) {
    return <div className="text-center py-8">No data available</div>
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value, percent }) => `${name}: ${Math.round(percent)}%`}
          innerRadius="60%"
          outerRadius="80%"
          paddingAngle={2}
        >
          {/* Define colors for each slice */}
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#10b981'} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}