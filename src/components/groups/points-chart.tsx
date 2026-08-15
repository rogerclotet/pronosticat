"use client";

import { useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { PointsHistory } from "@/lib/queries/points-history";

/**
 * Distinct enough to tell apart on a phone. The viewer always gets teal so
 * their own line reads the same as everywhere else in the app.
 */
const SERIES_COLORS = [
  "var(--color-teal-dark)",
  "var(--color-danger)",
  "var(--color-border-strong)",
  "var(--color-muted)",
  "var(--color-text-secondary)",
];

const VIEWER_COLOR = "var(--color-teal)";

type PointsChartProps = {
  history: PointsHistory;
  viewerUserId: string;
  nonce?: string;
};

export function PointsChart({
  history,
  viewerUserId,
  nonce,
}: PointsChartProps) {
  const t = useTranslations("group");

  // Synthetic keys: user ids end up in CSS custom property names, and a raw
  // UUID is a poor thing to put there.
  const series = history.members.map((member, index) => ({
    key: `p${index}`,
    userId: member.userId,
    name: member.name,
    isViewer: member.userId === viewerUserId,
  }));

  let colorIndex = 0;
  const config: ChartConfig = {};
  for (const item of series) {
    config[item.key] = {
      label: item.name,
      color: item.isViewer
        ? VIEWER_COLOR
        : SERIES_COLORS[colorIndex++ % SERIES_COLORS.length],
    };
  }

  // Recharts wants one flat object per x value.
  const data = history.points.map((point) => {
    const row: Record<string, number> = { matchday: point.matchday };
    for (const item of series) {
      row[item.key] = point.totals[item.userId] ?? 0;
    }
    return row;
  });

  return (
    <div className="border-2 border-border bg-surface p-3">
      <div className="label-mono mb-2">{t("chartTitle")}</div>
      <ChartContainer
        config={config}
        nonce={nonce}
        className="aspect-[4/3] w-full"
      >
        <LineChart data={data} margin={{ left: -16, right: 8, top: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="matchday"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => `J${value}`}
          />
          <YAxis tickLine={false} axisLine={false} tickMargin={4} width={44} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label) => t("chartRound", { round: label })}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {series.map((item) => (
            <Line
              key={item.key}
              dataKey={item.key}
              type="monotone"
              stroke={`var(--color-${item.key})`}
              strokeWidth={item.isViewer ? 2.5 : 1.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  );
}
