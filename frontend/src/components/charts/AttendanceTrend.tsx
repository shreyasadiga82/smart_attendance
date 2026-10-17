import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts'

interface AttendanceTrendProps {
  data: {
    date: string
    present: number
    percentage: number
  }[]
}

export const AttendanceTrend = ({ data }: AttendanceTrendProps) => {
  if (!data || data.length === 0) {
    return <div className="text-center py-8">No data available</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
          label={{ value: 'Attendance %', position: 'insideLeft', offset: -20, angle: -90 }}
        />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="percentage" stroke="#4f46e5" strokeWidth={2} dot={false} />
        {/* Optional: show present count as a secondary line */}
        {/* <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} dot={false} /> */}
      </LineChart>
    </ResponsiveContainer>
  )
}