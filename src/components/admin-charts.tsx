"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/utils";

type MonthCount = { label: string; count: number };
type MonthMoney = { label: string; cents: number };
type PlanSlice = { name: string; value: number; color: string };

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--foreground)",
  fontSize: 12,
} as const;

const axisTick = { fill: "var(--muted)", fontSize: 11 } as const;

/** Nouveaux comptes par mois (12 derniers mois) — série unique. */
export function SignupsChart({ data }: { data: MonthCount[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return <Empty>Aucune inscription sur la période.</Empty>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={axisTick}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={36}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-muted)" }}
          contentStyle={tooltipStyle}
          formatter={(v) => [`${v} compte${Number(v) > 1 ? "s" : ""}`, "Nouveaux"]}
        />
        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Encaissements FedaPay par mois (12 derniers mois) — série unique. */
export function RevenueChart({
  data,
  currency,
}: {
  data: MonthMoney[];
  currency: string;
}) {
  const total = data.reduce((s, d) => s + d.cents, 0);
  if (total === 0) {
    return <Empty>Aucun encaissement sur la période.</Empty>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -4, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={axisTick}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v) => formatMoney(Number(v), currency)}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-muted)" }}
          contentStyle={tooltipStyle}
          formatter={(v) => [formatMoney(Number(v), currency), "Encaissé"]}
        />
        <Bar dataKey="cents" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Répartition des comptes par plan — donut catégoriel (palette validée). */
export function PlanDonut({ data }: { data: PlanSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <Empty>Aucun compte.</Empty>;
  }
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-[170px] w-[170px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v, n) => [`${v} compte${Number(v) > 1 ? "s" : ""}`, n]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted">Comptes</span>
          <span className="text-lg font-bold">{total}</span>
        </div>
      </div>

      <ul className="w-full space-y-3">
        {data.map((d) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <li key={d.name} className="flex items-center gap-3 text-sm">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="flex-1 truncate font-medium">{d.name}</span>
              <span className="text-xs text-muted">{d.value}</span>
              <span className="w-10 text-right font-semibold tabular-nums">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[180px] items-center justify-center text-sm text-muted">
      {children}
    </div>
  );
}
