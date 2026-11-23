"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/lib/utils";

type Slice = { name: string; value: number; color: string };

export function CategoryChart({
  data,
  currency,
}: {
  data: Slice[];
  currency: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted">
        Aucune dépense ce mois-ci.
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-[200px] w-[200px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatMoney(Number(value), currency)}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--foreground)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted">Total</span>
          <span className="text-lg font-bold">
            {formatMoney(total, currency)}
          </span>
        </div>
      </div>

      <ul className="w-full space-y-2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="flex-1 truncate">{d.name}</span>
            <span className="font-medium">{formatMoney(d.value, currency)}</span>
            <span className="w-12 text-right text-xs text-muted">
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
