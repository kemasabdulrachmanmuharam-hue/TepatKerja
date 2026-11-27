import { useMemo, useState } from 'react';
import { Download, Flame } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DaySchedulePreview, DepartureLogEntry } from '../types/schedule';
import {
  computeDashboardAnalytics,
  downloadDepartureLogsCsv,
  filterAndSortDepartureLogs,
  type DepartureChartPoint,
} from '../utils/analytics';
import { formatMinutesToTime } from '../utils/scheduleEngine';
import { getActivePaletteTokens, type ThemeSettings } from '../utils/theme';
import { computePunctualityStreak } from '../utils/workspaceFeatures';
import { PunctualityTrendAreaChart } from './PunctualityTrendAreaChart';

interface AnalyticsSectionProps {
  logs: DepartureLogEntry[];
  upcomingWeek: DaySchedulePreview[];
  theme: ThemeSettings;
}

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DepartureChartPoint }>;
}

function DepartureTooltip({ active, payload }: BarTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const point = payload[0].payload;
  const deltaText =
    point.deltaMinutes === 0
      ? 'Tepat pada target'
      : point.deltaMinutes < 0
        ? `${Math.abs(point.deltaMinutes)} mnt lebih awal`
        : `${point.deltaMinutes} mnt melewati target`;

  return (
    <div className="tk-glass rounded-[3px] px-3.5 py-2.5 text-xs">
      <p className="font-semibold text-[var(--tk-text)]">
        {point.label} · {point.shiftName}
      </p>
      <p className="mt-1 text-[var(--tk-text-muted)]">
        Berangkat aktual:{' '}
        <span className="font-mono tabular-nums font-semibold text-[var(--tk-text)]">
          {point.actualDepartStr}
        </span>
      </p>
      <p className="text-[var(--tk-text-muted)]">
        Target berangkat:{' '}
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
    </div>
  );
}

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}

function PunctualityPieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const item = payload[0];
  return (
    <div className="tk-glass rounded-[3px] px-3 py-2 text-xs">
      <span className="font-semibold text-[var(--tk-text)]">{item.name}: </span>
      <span className="font-mono tabular-nums text-[var(--tk-text-muted)]">
        {item.value} hari
      </span>
    </div>
  );
}

export function AnalyticsSection({
  logs,
  upcomingWeek,
  theme,
}: AnalyticsSectionProps) {
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30 | 0>(14);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const palette = useMemo(() => getActivePaletteTokens(theme), [theme]);

  const filteredLogs = useMemo(
    () => filterAndSortDepartureLogs(logs, rangeDays),
    [logs, rangeDays],
  );

  const analytics = useMemo(
    () => computeDashboardAnalytics(logs, upcomingWeek, rangeDays),
    [logs, upcomingWeek, rangeDays],
  );

  const streak = useMemo(() => computePunctualityStreak(logs), [logs]);

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      return;
    }
    const filename = downloadDepartureLogsCsv(filteredLogs);
    setExportNotice(
      `${filteredLogs.length} catatan riwayat keberangkatan diekspor (${filename}).`,
    );
  };

  const pieData = useMemo(
    () => [
      {
        name: 'Tepat Waktu',
        value: analytics.onTimeCount,
        color: palette.success,
      },
      {
        name: 'Terlambat',
        value: analytics.lateCount,
        color: palette.error,
      },
    ],
    [analytics.onTimeCount, analytics.lateCount, palette.success, palette.error],
  );

  const yDomain = useMemo<[number, number]>(() => {
    if (analytics.chartPoints.length === 0) {
      return [400, 480];
    }
    const mins = analytics.chartPoints.flatMap((p) => [
      p.actualMinutes,
      p.plannedMinutes,
    ]);
    const minVal = Math.min(...mins);
    const maxVal = Math.max(...mins);
    return [Math.max(0, minVal - 15), Math.min(1440, maxVal + 10)];
  }, [analytics.chartPoints]);

  return (
    <section
      aria-label="Statistik hari kerja dan ketepatan waktu"
      className="tk-animate-card tk-stagger-4 tk-card p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-base font-bold uppercase tracking-wider text-[var(--tk-text)]">
              Statistik Kehadiran &amp; Keberangkatan
            </h2>
            <span className="tk-3d-badge inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold bg-[var(--tk-warning-soft)] text-[var(--tk-warning-text)] border border-[var(--tk-warning-border)]">
              <Flame className="h-3 w-3" aria-hidden="true" />
              <span className="font-mono tabular-nums">{streak.currentStreak}</span> hari ·{' '}
              {streak.levelTitle}
            </span>
          </div>
          <p className="text-xs text-[var(--tk-text-subtle)] mt-0.5">
            Ringkasan jumlah hari kerja, rata-rata jam berangkat, dan tingkat
            ketepatan waktu Anda (rekor terbaik {streak.bestStreak} hari).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Rentang data statistik"
            className="flex items-center gap-1 p-1 bg-[var(--tk-surface-muted)] border border-[var(--tk-border)] rounded-[3px]"
          >
            {(
              [
                { value: 7, label: '7 Hari' },
                { value: 14, label: '14 Hari' },
                { value: 30, label: '30 Hari' },
                { value: 0, label: 'Semua' },
              ] as const
            ).map((opt) => {
              const active = rangeDays === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    setRangeDays(opt.value);
                    setExportNotice(null);
                  }}
                  aria-pressed={active}
                  className={`px-3 py-1.5 text-xs font-medium rounded-[2px] transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[var(--tk-surface)] text-[var(--tk-text)] border border-[var(--tk-accent-border)] shadow-sm'
                      : 'text-[var(--tk-text-muted)] hover:text-[var(--tk-text)] border border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="tk-armor-cut-sm inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Ekspor CSV
          </button>
        </div>
      </div>

      {exportNotice && (
        <p role="status" className="tk-animate-notice mt-3 text-xs font-medium text-[var(--tk-accent-text)]">
          {exportNotice}
        </p>
      )}

      {/* 3-Column Summary Metrics separated by hairline dividers */}
      <div className="mt-5 py-4 border-y border-[var(--tk-border)] grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--tk-border)]">
        <div className="pb-4 sm:pb-0 sm:pr-5">
          <p className="text-xs font-medium text-[var(--tk-text-subtle)]">
            Jumlah Hari Kerja Tercatat
          </p>
          <p
            data-testid="stat-workdays"
            className="mt-1 font-display tabular-nums text-xl sm:text-2xl font-extrabold text-[var(--tk-text)]"
          >
            {analytics.totalLoggedDays} hari
          </p>
          <p className="mt-1 text-xs text-[var(--tk-text-subtle)]">
            {analytics.scheduledWeekdaysCount} hari kerja terjadwal minggu ini
          </p>
        </div>

        <div className="py-4 sm:py-0 sm:px-5">
          <p className="text-xs font-medium text-[var(--tk-text-subtle)]">
            Rata-Rata Waktu Keberangkatan
          </p>
          <p
            data-testid="stat-avg-departure"
            className="mt-1 font-display tabular-nums text-xl sm:text-2xl font-extrabold text-[var(--tk-accent-text)]"
          >
            {analytics.averageDepartTimeStr}
          </p>
          <p className="mt-1 text-xs text-[var(--tk-text-subtle)]">
            {analytics.averageDeltaLabel}
          </p>
        </div>

        <div className="pt-4 sm:pt-0 sm:pl-5">
          <p className="text-xs font-medium text-[var(--tk-text-subtle)]">
            Tingkat Ketepatan Waktu
          </p>
          <p
            data-testid="stat-ontime-rate"
            className={`mt-1 font-display tabular-nums text-xl sm:text-2xl font-extrabold ${
              analytics.totalLoggedDays === 0
                ? 'text-[var(--tk-text)]'
                : analytics.onTimeRate >= 80
                  ? 'text-[var(--tk-success-text)]'
                  : 'text-[var(--tk-warning-text)]'
            }`}
          >
            {analytics.onTimeRate}%
          </p>
          <p className="mt-1 text-xs text-[var(--tk-text-subtle)]">
            {analytics.onTimeCount} tepat waktu · {analytics.lateCount} terlambat
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      {analytics.chartPoints.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Bar Chart: Daily Departure Time vs Target */}
          <div className="lg:col-span-8 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-[var(--tk-text)]">
                Grafik Jam Keberangkatan Harian
              </h3>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--tk-text-subtle)]">
                <span>Hijau: Tepat Waktu</span>
                <span>Merah: Lewat Target</span>
                {analytics.targetReferenceStr && (
                  <span>
                    Garis putus: Target {analytics.targetReferenceStr}
                  </span>
                )}
              </div>
            </div>

            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.chartPoints}
                  margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
                >
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
                    minTickGap={16}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={yDomain}
                    tickFormatter={(val: number) => formatMinutesToTime(val)}
                    tick={{ fontSize: 11, fill: palette.chartTick }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip
                    content={<DepartureTooltip />}
                    cursor={{ fill: palette.chartCursor }}
                  />
                  {analytics.targetReferenceMinutes !== null && (
                    <ReferenceLine
                      y={analytics.targetReferenceMinutes}
                      stroke={palette.chartRef}
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                  )}
                  <Bar
                    dataKey="actualMinutes"
                    name="Jam Berangkat"
                    radius={[2, 2, 0, 0]}
                    maxBarSize={36}
                    isAnimationActive={false}
                  >
                    {analytics.chartPoints.map((entry) => (
                      <Cell
                        key={entry.dateKey}
                        fill={entry.onTime ? palette.success : palette.error}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart: Punctuality Proportion */}
          <div className="lg:col-span-4 min-w-0 lg:border-l lg:border-[var(--tk-border)] lg:pl-6">
            <h3 className="text-sm font-semibold text-[var(--tk-text)] mb-3">
              Proporsi Ketepatan Waktu
            </h3>

            <div className="relative h-52 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    startAngle={90}
                    endAngle={-270}
                    innerRadius={56}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PunctualityPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display tabular-nums text-2xl font-extrabold text-[var(--tk-text)]">
                  {analytics.onTimeRate}%
                </span>
                <span className="text-xs text-[var(--tk-text-subtle)]">
                  Tepat Waktu
                </span>
              </div>
            </div>

            <div className="mt-2 pt-3 border-t border-[var(--tk-border-subtle)] flex items-center justify-around text-xs">
              <div className="text-center">
                <span className="block font-medium text-[var(--tk-success-text)]">
                  Tepat Waktu
                </span>
                <span className="font-mono tabular-nums font-bold text-[var(--tk-text)]">
                  {analytics.onTimeCount} hari
                </span>
              </div>
              <div className="text-center">
                <span className="block font-medium text-[var(--tk-error-text)]">
                  Terlambat
                </span>
                <span className="font-mono tabular-nums font-bold text-[var(--tk-text)]">
                  {analytics.lateCount} hari
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 py-8 text-center">
          <p className="text-sm font-medium text-[var(--tk-text)]">
            Belum ada data keberangkatan untuk ditampilkan pada grafik.
          </p>
          <p className="mt-1 text-xs text-[var(--tk-text-subtle)]">
            Tekan tombol &ldquo;Sudah Berangkat&rdquo; saat berangkat kerja untuk
            mulai mencatat statistik ketepatan waktu Anda.
          </p>
        </div>
      )}

      {/* 30-Day Punctuality Consistency Area Chart */}
      <PunctualityTrendAreaChart logs={logs} theme={theme} />
    </section>
  );
}
