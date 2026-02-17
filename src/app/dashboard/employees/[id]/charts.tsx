"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function EmployeeDetailCharts({
  hoursPerDay,
}: {
  hoursPerDay: { date: string; hours: number }[];
}) {
  if (hoursPerDay.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No data yet
      </div>
    );
  }
  const data = hoursPerDay.map((d) => ({
    date: d.date.slice(5),
    hours: d.hours,
  }));
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number) => [`${value} h`, "Hours"]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
