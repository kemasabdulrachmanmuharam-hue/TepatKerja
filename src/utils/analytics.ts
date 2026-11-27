import type {
  ComputedOccurrence,
  DaySchedulePreview,
  DepartureLocationStatus,
  DepartureLogEntry,
} from '../types/schedule';
import {
  formatDateKey,
  formatDateToTimeStr,
  formatMinutesToTime,
  formatShortDate,
  parseTimeToMinutes,
} from './scheduleEngine';

const HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const;

export interface DepartureChartPoint {
  dateKey: string;
  label: string;
  shiftName: string;
  plannedDepartStr: string;
  actualDepartStr: string;
  plannedMinutes: number;
  actualMinutes: number;
  deltaMinutes: number;
  onTime: boolean;
}

export interface PunctualityTrendPoint {
  dateKey: string;
  label: string;
  fullLabel: string;
  shiftName: string;
  plannedDepartStr: string;
  actualDepartStr: string;
  deltaMinutes: number;
  onTime: boolean;
  rollingPunctualityRate: number;
  cumulativePunctualityRate: number;
}

export interface PunctualityTrendSummary {
  windowStartKey: string;
  windowEndKey: string;
  totalDaysInWindow: number;
  onTimeDays: number;
  lateDays: number;
  overallRate: number;
  latestRollingRate: number;
  averageDeltaMinutes: number;
  trendDirection: 'naik' | 'stabil' | 'turun' | 'kosong';
  trendDeltaPercent: number;
  trendLabel: string;
  points: PunctualityTrendPoint[];
}

export interface WeeklyPunctualityPoint {
  weekKey: string;
  weekLabel: string;
  rangeLabel: string;
  totalDays: number;
  onTimeDays: number;
  lateDays: number;
  punctualityRate: number;
  averageDeltaMinutes: number;
}

export interface WeeklyPunctualitySummary {
  totalWeeks: number;
  totalDays: number;
  overallRate: number;
  latestWeekRate: number;
  bestWeekLabel: string | null;
  trendDirection: 'naik' | 'stabil' | 'turun' | 'kosong';
  trendDeltaPercent: number;
  trendLabel: string;
  points: WeeklyPunctualityPoint[];
}

export interface DashboardAnalytics {
  totalLoggedDays: number;
  scheduledWeekdaysCount: number;
  onTimeCount: number;
  lateCount: number;
  onTimeRate: number;
  averageDepartTimeStr: string;
  averageDeltaMinutes: number;
  averageDeltaLabel: string;
  targetReferenceMinutes: number | null;
  targetReferenceStr: string | null;
  chartPoints: DepartureChartPoint[];
}

export function createDepartureLogFromOccurrence(
  occurrence: ComputedOccurrence,
  departedAt: Date,
  gpsMeta?: {
    gpsStatus?: DepartureLocationStatus;
    gpsDistanceMeters?: number | null;
    gpsLocationLabel?: string | null;
  },
): DepartureLogEntry {
  const actualDepartStr = formatDateToTimeStr(departedAt);
  const deltaMinutes = Math.round(
    (departedAt.getTime() - occurrence.departAt.getTime()) / 60_000,
  );

  const [year, month, day] = occurrence.dateKey.split('-').map(Number);
  const occDate = new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);

  return {
    id: `log-${occurrence.dateKey}`,
    dateKey: occurrence.dateKey,
    dateLabelShort: formatShortDate(occDate),
    dayShort: HARI_SINGKAT[occDate.getDay()],
    shiftName: occurrence.shiftName,
    plannedDepartStr: occurrence.jamBerangkatStr,
    actualDepartStr,
    plannedCheckInStr: occurrence.jamMasukStr,
    deltaMinutes,
    onTime: deltaMinutes <= 0,
    ...(gpsMeta?.gpsStatus ? { gpsStatus: gpsMeta.gpsStatus } : {}),
    ...(typeof gpsMeta?.gpsDistanceMeters === 'number'
      ? { gpsDistanceMeters: gpsMeta.gpsDistanceMeters }
      : {}),
    ...(gpsMeta?.gpsLocationLabel
      ? { gpsLocationLabel: gpsMeta.gpsLocationLabel.slice(0, 160) }
      : {}),
  };
}

export function formatAverageDeltaLabel(avgDelta: number): string {
  const rounded = Math.round(avgDelta);
  if (rounded === 0) {
    return 'Tepat sesuai target berangkat';
  }
  if (rounded < 0) {
    return `${Math.abs(rounded)} mnt lebih awal dari target`;
  }
  return `${rounded} mnt lebih lambat dari target`;
}

export function filterAndSortDepartureLogs(
  logs: DepartureLogEntry[],
  limitDays: 7 | 14 | 30 | 0 = 0,
): DepartureLogEntry[] {
  const sorted = [...logs].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return limitDays > 0 ? sorted.slice(-limitDays) : sorted;
}

export function compute30DayPunctualityTrend(
  logs: DepartureLogEntry[],
  referenceDate: Date = new Date(),
): PunctualityTrendSummary {
  const refNoon = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    12,
    0,
    0,
    0,
  );
  const startDate = new Date(refNoon);
  startDate.setDate(startDate.getDate() - 29);

  const windowStartKey = formatDateKey(startDate);
  const windowEndKey = formatDateKey(refNoon);

  // Deduplicate by dateKey (latest wins) and filter to last 30 calendar days
  const byDate = new Map<string, DepartureLogEntry>();
  for (const entry of logs) {
    if (entry.dateKey >= windowStartKey && entry.dateKey <= windowEndKey) {
      byDate.set(entry.dateKey, entry);
    }
  }

  const windowLogs = Array.from(byDate.values()).sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey),
  );

  if (windowLogs.length === 0) {
    return {
      windowStartKey,
      windowEndKey,
      totalDaysInWindow: 0,
      onTimeDays: 0,
      lateDays: 0,
      overallRate: 0,
      latestRollingRate: 0,
      averageDeltaMinutes: 0,
      trendDirection: 'kosong',
      trendDeltaPercent: 0,
      trendLabel: 'Belum ada data keberangkatan dalam 30 hari terakhir',
      points: [],
    };
  }

  let cumulativeOnTime = 0;
  let totalDelta = 0;
  const points: PunctualityTrendPoint[] = [];

  for (let i = 0; i < windowLogs.length; i += 1) {
    const entry = windowLogs[i];
    if (entry.onTime) {
      cumulativeOnTime += 1;
    }
    totalDelta += entry.deltaMinutes;

    const rollingStart = Math.max(0, i - 4);
    const rollingSlice = windowLogs.slice(rollingStart, i + 1);
    const rollingOnTime = rollingSlice.filter((item) => item.onTime).length;
    const rollingPunctualityRate = Math.round(
      (rollingOnTime / rollingSlice.length) * 100,
    );
    const cumulativePunctualityRate = Math.round(
      (cumulativeOnTime / (i + 1)) * 100,
    );

    points.push({
      dateKey: entry.dateKey,
      label: entry.dateLabelShort,
      fullLabel: `${entry.dayShort}, ${entry.dateLabelShort}`,
      shiftName: entry.shiftName,
      plannedDepartStr: entry.plannedDepartStr,
      actualDepartStr: entry.actualDepartStr,
      deltaMinutes: entry.deltaMinutes,
      onTime: entry.onTime,
      rollingPunctualityRate,
      cumulativePunctualityRate,
    });
  }

  const totalDaysInWindow = windowLogs.length;
  const onTimeDays = cumulativeOnTime;
  const lateDays = totalDaysInWindow - onTimeDays;
  const overallRate = Math.round((onTimeDays / totalDaysInWindow) * 100);
  const latestRollingRate = points[points.length - 1].rollingPunctualityRate;
  const averageDeltaMinutes = Math.round(totalDelta / totalDaysInWindow);

  let trendDirection: PunctualityTrendSummary['trendDirection'] = 'stabil';
  let trendDeltaPercent = 0;
  let trendLabel = `Stabil di ${overallRate}% tepat waktu`;

  if (totalDaysInWindow === 1) {
    trendLabel = `${overallRate}% tepat waktu (${onTimeDays}/${totalDaysInWindow} hari)`;
  } else {
    const mid = Math.floor(totalDaysInWindow / 2);
    const firstHalf = windowLogs.slice(0, mid);
    const secondHalf = windowLogs.slice(mid);
    const firstRate = Math.round(
      (firstHalf.filter((item) => item.onTime).length / firstHalf.length) * 100,
    );
    const secondRate = Math.round(
      (secondHalf.filter((item) => item.onTime).length / secondHalf.length) * 100,
    );
    trendDeltaPercent = secondRate - firstRate;

    if (trendDeltaPercent >= 5) {
      trendDirection = 'naik';
      trendLabel = `Konsistensi meningkat +${trendDeltaPercent}%`;
    } else if (trendDeltaPercent <= -5) {
      trendDirection = 'turun';
      trendLabel = `Konsistensi turun ${trendDeltaPercent}%`;
    } else {
      trendDirection = 'stabil';
      trendLabel = `Konsistensi stabil (${overallRate}%)`;
    }
  }

  return {
    windowStartKey,
    windowEndKey,
    totalDaysInWindow,
    onTimeDays,
    lateDays,
    overallRate,
    latestRollingRate,
    averageDeltaMinutes,
    trendDirection,
    trendDeltaPercent,
    trendLabel,
    points,
  };
}

export function getMondayDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
  const day = dt.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diffToMonday);
  return formatDateKey(dt);
}

export function computeWeeklyPunctualityTrend(
  logs: DepartureLogEntry[],
  maxWeeks = 8,
): WeeklyPunctualitySummary {
  if (!logs || logs.length === 0) {
    return {
      totalWeeks: 0,
      totalDays: 0,
      overallRate: 0,
      latestWeekRate: 0,
      bestWeekLabel: null,
      trendDirection: 'kosong',
      trendDeltaPercent: 0,
      trendLabel: 'Belum ada data keberangkatan mingguan',
      points: [],
    };
  }

  // Deduplicate by dateKey (latest wins)
  const byDate = new Map<string, DepartureLogEntry>();
  for (const entry of logs) {
    byDate.set(entry.dateKey, entry);
  }
  const uniqueLogs = Array.from(byDate.values()).sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey),
  );

  // Group into Monday-Sunday weeks
  const weeksMap = new Map<string, DepartureLogEntry[]>();
  for (const entry of uniqueLogs) {
    const mondayKey = getMondayDateKey(entry.dateKey);
    const list = weeksMap.get(mondayKey) ?? [];
    list.push(entry);
    weeksMap.set(mondayKey, list);
  }

  const sortedWeekKeys = Array.from(weeksMap.keys()).sort((a, b) =>
    a.localeCompare(b),
  );
  const slicedWeekKeys =
    maxWeeks > 0 ? sortedWeekKeys.slice(-maxWeeks) : sortedWeekKeys;

  let totalDays = 0;
  let totalOnTime = 0;
  let bestRate = -1;
  let bestWeekLabel: string | null = null;

  const points: WeeklyPunctualityPoint[] = slicedWeekKeys.map((weekKey) => {
    const entries = weeksMap.get(weekKey) ?? [];
    const onTimeDays = entries.filter((item) => item.onTime).length;
    const weekTotal = entries.length;
    const lateDays = weekTotal - onTimeDays;
    const punctualityRate = Math.round((onTimeDays / weekTotal) * 100);
    const averageDeltaMinutes = Math.round(
      entries.reduce((acc, item) => acc + item.deltaMinutes, 0) / weekTotal,
    );

    const [y, m, d] = weekKey.split('-').map(Number);
    const monDate = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
    const sunDate = new Date(monDate);
    sunDate.setDate(sunDate.getDate() + 6);

    const monShort = formatShortDate(monDate);
    const sunShort = formatShortDate(sunDate);
    const weekLabel = monShort;
    const rangeLabel = `${monShort} – ${sunShort}`;

    totalDays += weekTotal;
    totalOnTime += onTimeDays;

    if (punctualityRate > bestRate) {
      bestRate = punctualityRate;
      bestWeekLabel = rangeLabel;
    }

    return {
      weekKey,
      weekLabel,
      rangeLabel,
      totalDays: weekTotal,
      onTimeDays,
      lateDays,
      punctualityRate,
      averageDeltaMinutes,
    };
  });

  const overallRate =
    totalDays > 0 ? Math.round((totalOnTime / totalDays) * 100) : 0;
  const latestWeekRate =
    points.length > 0 ? points[points.length - 1].punctualityRate : 0;

  let trendDirection: WeeklyPunctualitySummary['trendDirection'] = 'stabil';
  let trendDeltaPercent = 0;
  let trendLabel = `Stabil di ${overallRate}% tepat waktu`;

  if (points.length === 1) {
    trendLabel = `Minggu ini ${latestWeekRate}% tepat waktu (${points[0].onTimeDays}/${points[0].totalDays} hari)`;
  } else if (points.length >= 2) {
    const prevRate = points[points.length - 2].punctualityRate;
    trendDeltaPercent = latestWeekRate - prevRate;
    if (trendDeltaPercent >= 5) {
      trendDirection = 'naik';
      trendLabel = `Minggu terbaru naik +${trendDeltaPercent}% dibanding minggu lalu`;
    } else if (trendDeltaPercent <= -5) {
      trendDirection = 'turun';
      trendLabel = `Minggu terbaru turun ${trendDeltaPercent}% dibanding minggu lalu`;
    } else {
      trendDirection = 'stabil';
      trendLabel = `Performa mingguan stabil (${latestWeekRate}%)`;
    }
  }

  return {
    totalWeeks: points.length,
    totalDays,
    overallRate,
    latestWeekRate,
    bestWeekLabel,
    trendDirection,
    trendDeltaPercent,
    trendLabel,
    points,
  };
}

export function escapeCsvCell(value: string | number): string {
  if (typeof value === 'number') {
    return String(value);
  }
  const normalized = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function generateDepartureLogsCsv(logs: DepartureLogEntry[]): string {
  const headers = [
    'Tanggal',
    'Hari',
    'Shift',
    'Target Berangkat',
    'Berangkat Aktual',
    'Jam Masuk',
    'Selisih (Menit)',
    'Status Ketepatan',
  ];

  const sorted = filterAndSortDepartureLogs(logs, 0);
  const rows = sorted.map((entry) => [
    escapeCsvCell(entry.dateKey),
    escapeCsvCell(entry.dayShort),
    escapeCsvCell(entry.shiftName),
    escapeCsvCell(entry.plannedDepartStr),
    escapeCsvCell(entry.actualDepartStr),
    escapeCsvCell(entry.plannedCheckInStr),
    escapeCsvCell(entry.deltaMinutes),
    escapeCsvCell(entry.onTime ? 'Tepat Waktu' : 'Terlambat'),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export function downloadDepartureLogsCsv(
  logs: DepartureLogEntry[],
  referenceDate: Date = new Date(),
): string {
  const csvContent = generateDepartureLogsCsv(logs);
  const filename = `tepatkerja-riwayat-keberangkatan-${formatDateKey(referenceDate)}.csv`;
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return filename;
}

export function computeDashboardAnalytics(
  logs: DepartureLogEntry[],
  upcomingWeek: DaySchedulePreview[],
  limitDays: 7 | 14 | 30 | 0 = 14,
): DashboardAnalytics {
  const scheduledWeekdaysCount = upcomingWeek.filter((d) => !d.isOff).length;
  const sliced = filterAndSortDepartureLogs(logs, limitDays);

  const totalLoggedDays = sliced.length;
  if (totalLoggedDays === 0) {
    return {
      totalLoggedDays: 0,
      scheduledWeekdaysCount,
      onTimeCount: 0,
      lateCount: 0,
      onTimeRate: 0,
      averageDepartTimeStr: '—',
      averageDeltaMinutes: 0,
      averageDeltaLabel: 'Belum ada riwayat keberangkatan',
      targetReferenceMinutes: null,
      targetReferenceStr: null,
      chartPoints: [],
    };
  }

  let onTimeCount = 0;
  let totalActualMinutes = 0;
  let validActualCount = 0;
  let totalDeltaMinutes = 0;
  let totalPlannedMinutes = 0;
  let validPlannedCount = 0;

  const chartPoints: DepartureChartPoint[] = [];

  for (const entry of sliced) {
    if (entry.onTime) {
      onTimeCount += 1;
    }
    totalDeltaMinutes += entry.deltaMinutes;

    const actualMin = parseTimeToMinutes(entry.actualDepartStr);
    const plannedMin = parseTimeToMinutes(entry.plannedDepartStr);

    if (actualMin !== null) {
      totalActualMinutes += actualMin;
      validActualCount += 1;
    }
    if (plannedMin !== null) {
      totalPlannedMinutes += plannedMin;
      validPlannedCount += 1;
    }

    if (actualMin !== null && plannedMin !== null) {
      chartPoints.push({
        dateKey: entry.dateKey,
        label: `${entry.dayShort} ${entry.dateLabelShort}`,
        shiftName: entry.shiftName,
        plannedDepartStr: entry.plannedDepartStr,
        actualDepartStr: entry.actualDepartStr,
        plannedMinutes: plannedMin,
        actualMinutes: actualMin,
        deltaMinutes: entry.deltaMinutes,
        onTime: entry.onTime,
      });
    }
  }

  const lateCount = totalLoggedDays - onTimeCount;
  const onTimeRate = Math.round((onTimeCount / totalLoggedDays) * 100);
  const avgActualMin =
    validActualCount > 0 ? totalActualMinutes / validActualCount : null;
  const averageDepartTimeStr =
    avgActualMin !== null ? formatMinutesToTime(avgActualMin) : '—';
  const averageDeltaMinutes = Math.round(totalDeltaMinutes / totalLoggedDays);
  const targetReferenceMinutes =
    validPlannedCount > 0
      ? Math.round(totalPlannedMinutes / validPlannedCount)
      : null;

  return {
    totalLoggedDays,
    scheduledWeekdaysCount,
    onTimeCount,
    lateCount,
    onTimeRate,
    averageDepartTimeStr,
    averageDeltaMinutes,
    averageDeltaLabel: formatAverageDeltaLabel(averageDeltaMinutes),
    targetReferenceMinutes,
    targetReferenceStr:
      targetReferenceMinutes !== null
        ? formatMinutesToTime(targetReferenceMinutes)
        : null,
    chartPoints,
  };
}
