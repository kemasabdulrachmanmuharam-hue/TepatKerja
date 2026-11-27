import { useId, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DepartureLogEntry } from '../types/schedule';
import {
  compute30DayPunctualityTrend,
  computeWeeklyPunctualityTrend,
  type PunctualityTrendPoint,
  type WeeklyPunctualityPoint,
} from '../utils/analytics';
import { getActivePaletteTokens, type ThemeSettings } from '../utils/theme';

interface PunctualityTrendAreaChartProps {
  logs: DepartureLogEntry[];
  theme: ThemeSettings;
}

type TrendMetricMode = 'rate' | 'delta';

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PunctualityTrendPoint }>;
  mode: TrendMetricMode;
}

function TrendTooltip({ active, payload, mode }: TrendTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const point = payload[0].payload;
  const deltaText =
    point.deltaMinutes === 0
      ? 'Tepat sesuai target'
      : point.deltaMinutes < 0
        ? `${Math.abs(point.deltaMinutes)} mnt lebih awal`
        : `${point.deltaMinutes} mnt melewati target`;

  return (
    <div className="tk-glass rounded-[3px] px-3.5 py-2.5 text-xs">
      <p className="font-semibold text-[var(--tk-text)]">
        {point.fullLabel} · {point.shiftName}
      </p>
      <p className="mt-1 text-[var(--tk-text-muted)]">
        Aktual{' '}
        <span className="font-mono tabular-nums font-semibold text-[var(--tk-text)]">
          {point.actualDepartStr}
        </span>{' '}
        · Target{' '}
        <span className="font-mono tabular-nums font-medium text-[var(--tk-text)]">
          {point.plannedDepartStr}
        </span>
      </p>
      <p
        className={`mt-1 font-medium ${
          point.onTime
            ? 'text-[var(--tk-success-text)]'
            : 'text-[var(--tk-error-text)]'
        }`}
      >
        {point.onTime ? 'Tepat Waktu' : 'Terlambat'} · {deltaText}
      </p>
      <p className="mt-1 pt-1 border-t border-[var(--tk-border-subtle)] text-[var(--tk-text-subtle)]">
        {mode === 'rate' ? (
          <>
            Konsistensi 5-hari:{' '}
            <span className="font-mono tabular-nums font-semibold text-[var(--tk-accent-text)]">
              {point.rollingPunctualityRate}%
            </span>
          </>
        ) : (
          <>
            Kumulatif tepat waktu:{' '}
            <span className="font-mono tabular-nums font-semibold text-[var(--tk-accent-text)]">
              {point.cumulativePunctualityRate}%
            </span>
          </>
        )}
      </p>
    </div>
  );
}

interface WeeklyTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: WeeklyPunctualityPoint }>;
}

function WeeklyPunctualityTooltip({ active, payload }: WeeklyTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const week = payload[0].payload;
  const deltaFormatted =
    week.averageDeltaMinutes === 0
      ? 'Tepat target (0 mnt)'
      : week.averageDeltaMinutes < 0
        ? `${Math.abs(week.averageDeltaMinutes)} mnt lebih awal`
        : `+${week.averageDeltaMinutes} mnt melewati target`;

  return (
    <div className="tk-glass rounded-[3px] px-3.5 py-2.5 text-xs">
      <p className="font-semibold text-[var(--tk-text)]">
        {week.rangeLabel}
      </p>
      <p className="mt-1 text-[var(--tk-text-muted)]">
        Ketepatan:{' '}
        <span className="font-mono tabular-nums font-bold text-[var(--tk-accent-text)]">
          {week.punctualityRate}%
        </span>{' '}
        ({week.onTimeDays}/{week.totalDays} hari)
      </p>
      <p className="mt-0.5 text-[var(--tk-text-subtle)]">
        Rata-rata selisih:{' '}
        <span className="font-mono tabular-nums font-medium text-[var(--tk-text)]">
          {deltaFormatted}
        </span>
      </p>
    </div>
  );
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: PunctualityTrendPoint;
  surfaceColor: string;
  successColor: string;
  errorColor: string;
}

function PunctualityDot({
  cx,
  cy,
  payload,
  surfaceColor,
  successColor,
  errorColor,
}: CustomDotProps) {
  if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) {
    return null;
  }
  const fill = payload.onTime ? successColor : errorColor;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3.5}
      fill={fill}
      stroke={surfaceColor}
      strokeWidth={1.5}
    />
  );
}

export function PunctualityTrendAreaChart({
  logs,
  theme,
}: PunctualityTrendAreaChartProps) {
  const [mode, setMode] = useState<TrendMetricMode>('rate');
  const rawGradientId = useId();
  const gradientId = useMemo(
    () => `tk-trend-area-${rawGradientId.replace(/[^a-zA-Z0-9_-]/g, '')}`,
    [rawGradientId],
  );

  const palette = useMemo(() => getActivePaletteTokens(theme), [theme]);
  const summary = useMemo(() => compute30DayPunctualityTrend(logs), [logs]);
  const weeklySummary = useMemo(
    () => computeWeeklyPunctualityTrend(logs, 8),
    [logs],
  );

  const deltaDomain = useMemo<[number, number]>(() => {
    if (summary.points.length === 0) {
      return [-15, 15];
    }
    const vals = summary.points.map((p) => p.deltaMinutes);
    const minVal = Math.min(0, ...vals);
    const maxVal = Math.max(0, ...vals);
    return [minVal - 4, maxVal + 4];
  }, [summary.points]);

  const directionColorClass =
    summary.trendDirection === 'naik'
      ? 'text-[var(--tk-success-text)]'
      : summary.trendDirection === 'turun'
        ? 'text-[var(--tk-warning-text)]'
        : 'text-[var(--tk-accent-text)]';

  const weeklyDirectionColorClass =
    weeklySummary.trendDirection === 'naik'
      ? 'text-[var(--tk-success-text)]'
      : weeklySummary.trendDirection === 'turun'
        ? 'text-[var(--tk-warning-text)]'
        : 'text-[var(--tk-accent-text)]';

  const avgDeltaFormatted =
    summary.averageDeltaMinutes === 0
      ? '0 mnt'
      : summary.averageDeltaMinutes < 0
        ? `${summary.averageDeltaMinutes} mnt`
        : `+${summary.averageDeltaMinutes} mnt`;

  return (
    <div className="mt-6 pt-6 border-t border-[var(--tk-border)] space-y-6">
      {/* Weekly Punctuality Trend Chart (Recharts) */}
      <div data-testid="punctuality-trend-weekly-section">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-[var(--tk-text)]">
              Tren Ketepatan Waktu Mingguan
            </h3>
            <p className="mt-0.5 text-xs text-[var(--tk-text-subtle)]">
              <span
                data-testid="trend-weekly-direction"
                className={`font-semibold ${weeklyDirectionColorClass}`}
              >
                {weeklySummary.trendLabel}
              </span>
              {weeklySummary.totalWeeks > 0 && (
                <>
                  <span aria-hidden="true" className="mx-1.5">
                    ·
                  </span>
                  <span>
                    <span className="font-mono tabular-nums">
                      {weeklySummary.totalWeeks}
                    </span>{' '}
                    minggu terakhir · Rata-rata{' '}
                    <span className="font-mono tabular-nums font-semibold text-[var(--tk-text)]">
                      {weeklySummary.overallRate}%
                    </span>
                    {weeklySummary.bestWeekLabel && (
                      <> · Terbaik {weeklySummary.bestWeekLabel}</>
                    )}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {weeklySummary.points.length > 0 ? (
          <div
            data-testid="trend-weekly-bar-chart"
            className="mt-3 h-52 w-full min-w-0"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklySummary.points}
                margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={palette.chartGrid}
                />
                <XAxis
                  dataKey="weekLabel"
                  tick={{ fontSize: 11, fill: palette.chartTick }}
                  tickLine={false}
                  axisLine={{ stroke: palette.chartAxis }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(val: number) => `${val}%`}
                  tick={{ fontSize: 11, fill: palette.chartTick }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  content={<WeeklyPunctualityTooltip />}
                  cursor={{ fill: palette.chartCursor }}
                />
                <ReferenceLine
                  y={80}
                  stroke={palette.chartRef}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <Bar
                  dataKey="punctualityRate"
                  name="Ketepatan Mingguan (%)"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={42}
                  minPointSize={4}
                  isAnimationActive={false}
                >
                  {weeklySummary.points.map((week) => (
                    <Cell
                      key={week.weekKey}
                      fill={
                        week.punctualityRate >= 80
                          ? palette.success
                          : week.punctualityRate >= 60
                            ? palette.warning
                            : palette.error
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-3 py-6 text-center rounded-[3px] bg-[var(--tk-surface-muted)]/50">
            <p className="text-xs text-[var(--tk-text-subtle)]">
              Belum ada log keberangkatan mingguan. Catat keberangkatan Anda untuk melihat perbandingan mingguan.
            </p>
          </div>
        )}
      </div>

      {/* 30-Day Punctuality Rolling Trend Area Chart */}
      <div
        data-testid="punctuality-trend-30d-section"
        className="pt-6 border-t border-[var(--tk-border)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-[var(--tk-text)]">
              Tren Ketepatan Waktu 30 Hari Terakhir
            </h3>
            <p className="mt-0.5 text-xs text-[var(--tk-text-subtle)]">
              <span
                data-testid="trend-30d-direction"
                className={`font-semibold ${directionColorClass}`}
              >
                {summary.trendLabel}
              </span>
              {summary.totalDaysInWindow > 0 && (
                <>
                  <span aria-hidden="true" className="mx-1.5">
                    ·
                  </span>
                  <span>
                    <span className="font-mono tabular-nums">
                      {summary.totalDaysInWindow}
                    </span>{' '}
                    hari kerja tercatat ({summary.windowStartKey.slice(5)} s/d{' '}
                    {summary.windowEndKey.slice(5)})
                  </span>
                </>
              )}
            </p>
          </div>

          <div
            role="group"
            aria-label="Metrik grafik tren 30 hari"
            className="flex items-center gap-1 p-1 bg-[var(--tk-surface-muted)] border border-[var(--tk-border)] rounded-[3px]"
          >
            <button
              type="button"
              data-testid="trend-30d-mode-rate"
              aria-pressed={mode === 'rate'}
              onClick={() => setMode('rate')}
              className={`px-3 py-1.5 text-xs font-medium rounded-[2px] transition-colors whitespace-nowrap ${
                mode === 'rate'
                  ? 'bg-[var(--tk-surface)] text-[var(--tk-text)] border border-[var(--tk-accent-border)] shadow-sm'
                  : 'text-[var(--tk-text-muted)] hover:text-[var(--tk-text)] border border-transparent'
              }`}
            >
              Konsistensi (%)
            </button>
            <button
              type="button"
              data-testid="trend-30d-mode-delta"
              aria-pressed={mode === 'delta'}
              onClick={() => setMode('delta')}
              className={`px-3 py-1.5 text-xs font-medium rounded-[2px] transition-colors whitespace-nowrap ${
                mode === 'delta'
                  ? 'bg-[var(--tk-surface)] text-[var(--tk-text)] border border-[var(--tk-accent-border)] shadow-sm'
                  : 'text-[var(--tk-text-muted)] hover:text-[var(--tk-text)] border border-transparent'
              }`}
            >
              Selisih (mnt)
            </button>
          </div>
        </div>

        {summary.points.length > 0 ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--tk-text-subtle)]">
              <span>
                {mode === 'rate'
                  ? 'Area: Persentase ketepatan bergulir 5 hari kerja'
                  : 'Area: Selisih menit berangkat vs target (negatif = lebih awal)'}
              </span>
              <span aria-hidden="true">·</span>
              <span>Titik hijau: Tepat Waktu</span>
              <span>Titik merah: Terlambat</span>
              <span aria-hidden="true">·</span>
              <span>
                {mode === 'rate'
                  ? 'Garis putus: Target 80%'
                  : 'Garis putus: Tepat Target 0m'}
              </span>
            </div>

            <div
              data-testid="trend-30d-area-chart"
              className="mt-3 h-60 w-full min-w-0"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={summary.points}
                  margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={palette.accent} stopOpacity={0.34} />
                      <stop offset="95%" stopColor={palette.accent} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={palette.chartGrid}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: palette.chartTick }}
                    tickLine={false}
                    axisLine={{ stroke: palette.chartAxis }}
                    minTickGap={22}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={mode === 'rate' ? [0, 100] : deltaDomain}
                    tickFormatter={(val: number) =>
                      mode === 'rate' ? `${val}%` : `${val > 0 ? '+' : ''}${val}m`
                    }
                    tick={{ fontSize: 11, fill: palette.chartTick }}
                    tickLine={false}
                    axisLine={false}
                    width={46}
                  />
                  <Tooltip
                    content={<TrendTooltip mode={mode} />}
                    cursor={{ stroke: palette.chartAxis, strokeDasharray: '3 3' }}
                  />
                  <ReferenceLine
                    y={mode === 'rate' ? 80 : 0}
                    stroke={palette.chartRef}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                  <Area
                    type="monotone"
                    dataKey={
                      mode === 'rate' ? 'rollingPunctualityRate' : 'deltaMinutes'
                    }
                    name={
                      mode === 'rate'
                        ? 'Konsistensi 5-Hari (%)'
                        : 'Selisih (mnt)'
                    }
                    stroke={palette.accent}
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    dot={
                      <PunctualityDot
                        surfaceColor={palette.surface}
                        successColor={palette.success}
                        errorColor={palette.error}
                      />
                    }
                    activeDot={{ r: 5, strokeWidth: 2, stroke: palette.surface }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--tk-border)] grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--tk-border)]">
              <div className="pb-3 sm:pb-0 sm:pr-5">
                <p className="text-xs font-medium text-[var(--tk-text-subtle)]">
                  Konsistensi Terkini (5-Hari)
                </p>
                <p
                  data-testid="trend-30d-latest-rate"
                  className="mt-1 font-mono tabular-nums text-xl font-bold text-[var(--tk-accent-text)]"
                >
                  {summary.latestRollingRate}%
                </p>
              </div>

              <div className="py-3 sm:py-0 sm:px-5">
                <p className="text-xs font-medium text-[var(--tk-text-subtle)]">
                  Ketepatan 30 Hari
                </p>
                <p
                  data-testid="trend-30d-overall-rate"
                  className={`mt-1 font-mono tabular-nums text-xl font-bold ${
                    summary.overallRate >= 80
                      ? 'text-[var(--tk-success-text)]'
                      : 'text-[var(--tk-warning-text)]'
                  }`}
                >
                  {summary.overallRate}%
                  <span className="ml-2 text-xs font-sans font-normal text-[var(--tk-text-subtle)]">
                    ({summary.onTimeDays} tepat · {summary.lateDays} terlambat)
                  </span>
                </p>
              </div>

              <div className="pt-3 sm:pt-0 sm:pl-5">
                <p className="text-xs font-medium text-[var(--tk-text-subtle)]">
                  Rata-rata Selisih 30 Hari
                </p>
                <p className="mt-1 font-mono tabular-nums text-xl font-bold text-[var(--tk-text)]">
                  {avgDeltaFormatted}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 py-8 text-center">
            <p className="text-sm font-medium text-[var(--tk-text)]">
              Belum ada catatan keberangkatan dalam 30 hari terakhir.
            </p>
            <p className="mt-1 text-xs text-[var(--tk-text-subtle)]">
              Tekan &ldquo;Sudah Berangkat&rdquo; secara rutin agar tren konsistensi 30 hari Anda terbentuk otomatis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
