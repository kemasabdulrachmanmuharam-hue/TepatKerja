import type {
  ActiveAlert,
  AlarmRuntimeState,
  CommuteAndReminderConfig,
  ComputedOccurrence,
  DateOverride,
  DayOfWeek,
  DaySchedulePreview,
  MonthlyCalendarDay,
  MonthlyRosterSummary,
  NonWorkCategory,
  ReminderMilestone,
  ReminderStageId,
  ShiftTemplate,
  TepatKerjaState,
} from '../types/schedule';

const HARI_INDONESIA = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

const HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const;

const BULAN_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

const BULAN_SINGKAT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

export function parseTimeToMinutes(hhmm: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

export function formatMinutesToTime(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatDateToTimeStr(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(baseDate: Date, days: number): Date {
  const next = new Date(baseDate.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function formatIndonesianDate(date: Date): string {
  const dayName = HARI_INDONESIA[date.getDay()];
  const dayNum = date.getDate();
  const monthName = BULAN_INDONESIA[date.getMonth()];
  return `${dayName}, ${dayNum} ${monthName} ${date.getFullYear()}`;
}

export function formatShortDate(date: Date): string {
  return `${date.getDate()} ${BULAN_SINGKAT[date.getMonth()]}`;
}

export function getDayName(dayOfWeek: DayOfWeek): string {
  return HARI_INDONESIA[dayOfWeek];
}

export function computeOccurrenceTimes(
  targetDate: Date,
  shiftName: string,
  jamMasukStr: string,
  durasiKerjaMenit: number,
  config: CommuteAndReminderConfig,
  source: 'rutin' | 'override',
): ComputedOccurrence | null {
  const checkInMinutes = parseTimeToMinutes(jamMasukStr);
  if (checkInMinutes === null) {
    return null;
  }

  const hours = Math.floor(checkInMinutes / 60);
  const minutes = checkInMinutes % 60;
  const checkInAt = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    hours,
    minutes,
    0,
    0,
  );

  const totalCommuteOffsetMin =
    Math.max(0, config.durasiPerjalananMenit) +
    Math.max(0, config.bufferKeterlambatanMenit);
  const departAt = new Date(checkInAt.getTime() - totalCommuteOffsetMin * 60_000);
  const prepStartAt = new Date(
    departAt.getTime() - Math.max(0, config.durasiPersiapanMenit) * 60_000,
  );
  const workEndAt = new Date(
    checkInAt.getTime() + Math.max(60, durasiKerjaMenit) * 60_000,
  );

  const dateKey = formatDateKey(targetDate);
  const isOvernight =
    workEndAt.getFullYear() !== checkInAt.getFullYear() ||
    workEndAt.getMonth() !== checkInAt.getMonth() ||
    workEndAt.getDate() !== checkInAt.getDate();

  return {
    occurrenceKey: `${dateKey}__${jamMasukStr}`,
    dateKey,
    dateLabel: formatIndonesianDate(targetDate),
    shortDayLabel: HARI_SINGKAT[targetDate.getDay()],
    shiftName,
    source,
    jamMasukStr,
    jamBerangkatStr: formatDateToTimeStr(departAt),
    jamPersiapanStr: formatDateToTimeStr(prepStartAt),
    jamPulangStr: formatDateToTimeStr(workEndAt),
    isOvernight,
    durasiKerjaMenit: Math.max(60, durasiKerjaMenit),
    prepStartAt,
    departAt,
    checkInAt,
    workEndAt,
  };
}

export function resolveOccurrenceForDate(
  targetDate: Date,
  state: TepatKerjaState,
): ComputedOccurrence | null {
  const dateKey = formatDateKey(targetDate);
  const override = state.dateOverrides.find((item) => item.dateKey === dateKey);

  if (override) {
    if (override.tipe === 'libur') {
      return null;
    }
    const matchedTemplate = override.shiftId
      ? state.shiftTemplates.find((s) => s.id === override.shiftId)
      : undefined;
    const jamMasuk = override.jamMasukKustom || matchedTemplate?.jamMasuk;
    if (!jamMasuk) {
      return null;
    }
    const shiftName =
      override.label?.trim() ||
      matchedTemplate?.nama ||
      'Shift Khusus';
    const durasi =
      typeof override.durasiKustomMenit === 'number' &&
      Number.isFinite(override.durasiKustomMenit)
        ? Math.max(60, Math.min(960, Math.round(override.durasiKustomMenit)))
        : (matchedTemplate?.durasiKerjaMenit ?? 480);
    return computeOccurrenceTimes(
      targetDate,
      shiftName,
      jamMasuk,
      durasi,
      state.config,
      'override',
    );
  }

  const dayOfWeek = targetDate.getDay() as DayOfWeek;
  const rule = state.weeklyRules.find((r) => r.dayOfWeek === dayOfWeek);
  if (!rule || !rule.aktif || !rule.shiftId) {
    return null;
  }

  const template = state.shiftTemplates.find((s) => s.id === rule.shiftId);
  if (!template) {
    return null;
  }

  return computeOccurrenceTimes(
    targetDate,
    template.nama,
    template.jamMasuk,
    template.durasiKerjaMenit,
    state.config,
    'rutin',
  );
}

export function findNextActiveOccurrence(
  now: Date,
  state: TepatKerjaState,
  departedOccurrenceKey: string | null = null,
): ComputedOccurrence | null {
  const checkInGraceMs = 30 * 60_000;

  for (let offset = 0; offset <= 14; offset += 1) {
    const candidateDate = addDays(
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0),
      offset,
    );
    const occurrence = resolveOccurrenceForDate(candidateDate, state);
    if (!occurrence) {
      continue;
    }
    if (departedOccurrenceKey && occurrence.occurrenceKey === departedOccurrenceKey) {
      continue;
    }
    if (now.getTime() <= occurrence.checkInAt.getTime() + checkInGraceMs) {
      return occurrence;
    }
  }

  return null;
}

export function findCurrentWorkingOccurrence(
  now: Date,
  state: TepatKerjaState,
): ComputedOccurrence | null {
  const nowMs = now.getTime();
  // Check yesterday (-1) first to catch overnight shifts (e.g., Shift 3 20:00-05:00, Shift 4 22:00-07:00), then today (0).
  for (const offset of [-1, 0]) {
    const candidateDate = addDays(
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0),
      offset,
    );
    const occurrence = resolveOccurrenceForDate(candidateDate, state);
    if (!occurrence) {
      continue;
    }
    if (
      nowMs >= occurrence.checkInAt.getTime() &&
      nowMs < occurrence.workEndAt.getTime()
    ) {
      return occurrence;
    }
  }
  return null;
}

export function getUpcomingWeekSchedule(
  now: Date,
  state: TepatKerjaState,
  days = 7,
): DaySchedulePreview[] {
  const result: DaySchedulePreview[] = [];
  const todayKey = formatDateKey(now);

  for (let i = 0; i < days; i += 1) {
    const date = addDays(
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0),
      i,
    );
    const dateKey = formatDateKey(date);
    const override = state.dateOverrides.find((item) => item.dateKey === dateKey);
    const occurrence = resolveOccurrenceForDate(date, state);

    const kategoriStatus: NonWorkCategory | 'shift' = occurrence
      ? 'shift'
      : override?.tipe === 'libur'
        ? override.kategoriStatus ?? 'off'
        : 'off';

    result.push({
      dateKey,
      dayName: HARI_INDONESIA[date.getDay()],
      dateShort: formatShortDate(date),
      isToday: dateKey === todayKey,
      isOff: occurrence === null,
      hasOverride: Boolean(override),
      source: override
        ? override.tipe === 'libur'
          ? 'libur'
          : 'override'
        : occurrence
          ? 'rutin'
          : 'libur',
      kategoriStatus,
      occurrence,
      overrideLabel: override?.label,
    });
  }

  return result;
}

export function getNonWorkCategoryLabel(category: NonWorkCategory): string {
  switch (category) {
    case 'cuti':
      return 'Cuti';
    case 'izin':
      return 'Izin';
    case 'sakit':
      return 'Sakit';
    case 'libur':
      return 'Libur Nasional';
    case 'off':
    default:
      return 'Off';
  }
}

export function formatMonthYearIndonesian(year: number, monthIndex: number): string {
  const safeMonth = ((monthIndex % 12) + 12) % 12;
  return `${BULAN_INDONESIA[safeMonth]} ${year}`;
}

export function getMonthlyCalendarGrid(
  year: number,
  monthIndex: number,
  state: TepatKerjaState,
  now: Date = new Date(),
): MonthlyCalendarDay[] {
  const firstOfMonth = new Date(year, monthIndex, 1, 12, 0, 0, 0);
  const daysInMonth = new Date(year, monthIndex + 1, 0, 12, 0, 0, 0).getDate();
  const todayKey = formatDateKey(now);

  // Monday-first grid: Mon=0 .. Sun=6
  const startDayMondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const totalCells = Math.ceil((startDayMondayOffset + daysInMonth) / 7) * 7;

  const grid: MonthlyCalendarDay[] = [];
  for (let idx = 0; idx < totalCells; idx += 1) {
    const cellDate = addDays(firstOfMonth, idx - startDayMondayOffset);
    const dateKey = formatDateKey(cellDate);
    const isCurrentMonth =
      cellDate.getFullYear() === year && cellDate.getMonth() === monthIndex;
    const override = state.dateOverrides.find((item) => item.dateKey === dateKey);
    const occurrence = resolveOccurrenceForDate(cellDate, state);
    const kategoriStatus: NonWorkCategory | 'shift' = occurrence
      ? 'shift'
      : override?.tipe === 'libur'
        ? override.kategoriStatus ?? 'off'
        : 'off';

    grid.push({
      dateKey,
      dayNumber: cellDate.getDate(),
      dayOfWeek: cellDate.getDay() as DayOfWeek,
      isToday: dateKey === todayKey,
      isCurrentMonth,
      isOff: occurrence === null,
      source: override
        ? override.tipe === 'libur'
          ? 'libur'
          : 'override'
        : occurrence
          ? 'rutin'
          : 'libur',
      kategoriStatus,
      occurrence,
      override,
    });
  }

  return grid;
}

export function computeMonthlyRosterSummary(
  grid: MonthlyCalendarDay[],
): MonthlyRosterSummary {
  const byCategory: Record<NonWorkCategory, number> = {
    off: 0,
    cuti: 0,
    izin: 0,
    sakit: 0,
    libur: 0,
  };
  const shiftMap = new Map<string, number>();

  let totalWorkingDays = 0;
  let totalWorkMinutes = 0;

  for (const cell of grid) {
    if (!cell.isCurrentMonth) {
      continue;
    }
    if (cell.occurrence) {
      totalWorkingDays += 1;
      totalWorkMinutes += cell.occurrence.durasiKerjaMenit ?? 480;
      shiftMap.set(
        cell.occurrence.shiftName,
        (shiftMap.get(cell.occurrence.shiftName) ?? 0) + 1,
      );
    } else {
      const cat = cell.kategoriStatus === 'shift' ? 'off' : cell.kategoriStatus;
      byCategory[cat] += 1;
    }
  }

  const totalOffDays = byCategory.off;
  const totalLeaveDays =
    byCategory.cuti + byCategory.izin + byCategory.sakit + byCategory.libur;

  const byShift = Array.from(shiftMap.entries()).map(([shiftName, count]) => ({
    shiftName,
    count,
  }));

  return {
    totalWorkingDays,
    totalOffDays,
    totalLeaveDays,
    totalWorkHours: Math.round(totalWorkMinutes / 60),
    byCategory,
    byShift,
  };
}

export type MonthlyRotationPattern =
  | 'fixed_5_2'
  | 'cycle_4_2'
  | 'cycle_5_1'
  | 'weekly_rotate_1_4'
  | 'custom_cycle';

export function getShiftCompactBadge(shiftName: string): string {
  const trimmed = shiftName.trim();
  if (!trimmed) {
    return 'Kerja';
  }
  const shiftNum = /^shift\s*(\d+)/i.exec(trimmed);
  if (shiftNum) {
    return `S${shiftNum[1]}`;
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes('reguler') || lower.includes('kantor')) {
    return 'Reg';
  }
  if (lower.includes('middle')) {
    return 'Mid';
  }
  if (lower.includes('pagi')) {
    return 'Pagi';
  }
  if (lower.includes('siang')) {
    return 'Siang';
  }
  if (lower.includes('sore')) {
    return 'Sore';
  }
  if (lower.includes('malam')) {
    return 'Mlm';
  }
  const firstWord = trimmed.split(/\s+/)[0] || trimmed;
  return firstWord.slice(0, 5);
}

export function generateCustomCycleOverrides(
  year: number,
  monthIndex: number,
  workDays: number,
  offDays: number,
  shiftSequenceIds: string[],
): DateOverride[] {
  const safeWork = Math.max(1, Math.min(14, Math.round(workDays)));
  const safeOff = Math.max(0, Math.min(7, Math.round(offDays)));
  const validSeq = shiftSequenceIds.filter(Boolean);
  if (validSeq.length === 0) {
    return [];
  }

  const daysInMonth = new Date(year, monthIndex + 1, 0, 12, 0, 0, 0).getDate();
  const cycleLength = safeWork + safeOff;
  const overrides: DateOverride[] = [];

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum += 1) {
    const date = new Date(year, monthIndex, dayNum, 12, 0, 0, 0);
    const dateKey = formatDateKey(date);
    const cycleIdx = Math.floor((dayNum - 1) / cycleLength);
    const posInCycle = (dayNum - 1) % cycleLength;

    if (posInCycle < safeWork) {
      const shiftId = validSeq[cycleIdx % validSeq.length];
      overrides.push({
        dateKey,
        tipe: 'shift',
        shiftId,
      });
    } else {
      overrides.push({
        dateKey,
        tipe: 'libur',
        kategoriStatus: 'off',
      });
    }
  }

  return overrides;
}

export function generateMonthlyRotationOverrides(
  year: number,
  monthIndex: number,
  pattern: MonthlyRotationPattern,
  primaryShiftId: string,
  templates: ShiftTemplate[],
): DateOverride[] {
  if (pattern === 'custom_cycle') {
    return generateCustomCycleOverrides(year, monthIndex, 4, 2, [
      primaryShiftId || templates[0]?.id || '',
    ]);
  }
  const daysInMonth = new Date(year, monthIndex + 1, 0, 12, 0, 0, 0).getDate();
  const overrides: DateOverride[] = [];

  // Order for 1-4 rotation: Shift 1 -> Shift 2 -> Shift 3 -> Shift 4 (fallback to available)
  const preferredOrder = ['shift-1', 'shift-2', 'shift-3', 'shift-4'];
  const rotationPool = preferredOrder
    .map((id) => templates.find((t) => t.id === id))
    .filter((t): t is ShiftTemplate => Boolean(t));
  const effectivePool =
    rotationPool.length > 0 ? rotationPool : templates.slice(0, 4);

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum += 1) {
    const date = new Date(year, monthIndex, dayNum, 12, 0, 0, 0);
    const dateKey = formatDateKey(date);
    const dow = date.getDay(); // 0=Sun..6=Sat

    if (pattern === 'fixed_5_2') {
      if (dow === 0 || dow === 6) {
        overrides.push({
          dateKey,
          tipe: 'libur',
          kategoriStatus: 'off',
        });
      } else {
        overrides.push({
          dateKey,
          tipe: 'shift',
          shiftId: primaryShiftId,
        });
      }
      continue;
    }

    if (pattern === 'cycle_4_2') {
      const cyclePos = (dayNum - 1) % 6;
      if (cyclePos < 4) {
        overrides.push({
          dateKey,
          tipe: 'shift',
          shiftId: primaryShiftId,
        });
      } else {
        overrides.push({
          dateKey,
          tipe: 'libur',
          kategoriStatus: 'off',
        });
      }
      continue;
    }

    if (pattern === 'cycle_5_1') {
      const cyclePos = (dayNum - 1) % 6;
      if (cyclePos < 5) {
        overrides.push({
          dateKey,
          tipe: 'shift',
          shiftId: primaryShiftId,
        });
      } else {
        overrides.push({
          dateKey,
          tipe: 'libur',
          kategoriStatus: 'off',
        });
      }
      continue;
    }

    // weekly_rotate_1_4: Monday-Friday rotates Shift 1..4 by week, Sat-Sun Off
    if (dow === 0 || dow === 6) {
      overrides.push({
        dateKey,
        tipe: 'libur',
        kategoriStatus: 'off',
      });
    } else {
      const weekIndex = Math.floor((dayNum - 1) / 7);
      const chosen = effectivePool[weekIndex % effectivePool.length];
      overrides.push({
        dateKey,
        tipe: 'shift',
        shiftId: chosen.id,
      });
    }
  }

  return overrides;
}

export function buildReminderMilestones(
  occurrence: ComputedOccurrence,
  config: CommuteAndReminderConfig,
): ReminderMilestone[] {
  const departSoonAt = new Date(occurrence.departAt.getTime() - 15 * 60_000);
  const checkInSoonAt = new Date(occurrence.checkInAt.getTime() - 10 * 60_000);

  return [
    {
      stageId: 'prep_start',
      label: 'Mulai Bersiap',
      description: `${config.durasiPersiapanMenit} menit sebelum berangkat untuk persiapan pribadi.`,
      triggerAt: occurrence.prepStartAt,
      triggerTimeStr: formatDateToTimeStr(occurrence.prepStartAt),
      enabled: config.tahapanAktif.prep_start,
    },
    {
      stageId: 'depart_soon',
      label: '15 Menit Sebelum Berangkat',
      description: 'Pastikan perlengkapan kerja siap sebelum keluar rumah.',
      triggerAt: departSoonAt,
      triggerTimeStr: formatDateToTimeStr(departSoonAt),
      enabled: config.tahapanAktif.depart_soon,
    },
    {
      stageId: 'depart_now',
      label: 'Waktunya Berangkat',
      description: `Estimasi perjalanan ${config.durasiPerjalananMenit} mnt + cadangan ${config.bufferKeterlambatanMenit} mnt.`,
      triggerAt: occurrence.departAt,
      triggerTimeStr: occurrence.jamBerangkatStr,
      enabled: config.tahapanAktif.depart_now,
    },
    {
      stageId: 'checkin_soon',
      label: '10 Menit Sebelum Jam Masuk',
      description: `Target masuk kerja pukul ${occurrence.jamMasukStr}.`,
      triggerAt: checkInSoonAt,
      triggerTimeStr: formatDateToTimeStr(checkInSoonAt),
      enabled: config.tahapanAktif.checkin_soon,
    },
  ];
}

export function evaluateDueReminder(
  now: Date,
  occurrence: ComputedOccurrence | null,
  config: CommuteAndReminderConfig,
  runtime: AlarmRuntimeState,
  sessionStartMs = 0,
): ActiveAlert | null {
  if (
    runtime.snoozedUntil !== null &&
    runtime.snoozedAlert !== null &&
    now.getTime() >= runtime.snoozedUntil
  ) {
    return runtime.snoozedAlert;
  }

  if (!occurrence) {
    return null;
  }

  const milestones = buildReminderMilestones(occurrence, config);
  const activeWindowMs = 20 * 60_000;
  const nowMs = now.getTime();
  const isDeparted = runtime.departedOccurrenceKey === occurrence.occurrenceKey;

  // Determine the highest-index milestone already acknowledged for this occurrence
  let highestAcknowledgedIdx = -1;
  milestones.forEach((m, idx) => {
    const key = `${occurrence.occurrenceKey}__${m.stageId}`;
    if (runtime.triggeredKeys.includes(key)) {
      highestAcknowledgedIdx = idx;
    }
  });

  // Evaluate from latest milestone backwards so the most urgent unacknowledged milestone wins
  for (let i = milestones.length - 1; i >= 0; i -= 1) {
    const m = milestones[i];
    if (!m.enabled) {
      continue;
    }
    if (i <= highestAcknowledgedIdx) {
      break;
    }
    if (isDeparted && m.stageId !== 'checkin_soon') {
      continue;
    }

    const triggerMs = m.triggerAt.getTime();
    // Do not auto-popup an alarm whose trigger time already passed before the user opened this session
    if (sessionStartMs > 0 && triggerMs < sessionStartMs - 5_000) {
      continue;
    }

    if (nowMs >= triggerMs && nowMs <= triggerMs + activeWindowMs) {
      const key = `${occurrence.occurrenceKey}__${m.stageId}`;
      return {
        key,
        occurrenceKey: occurrence.occurrenceKey,
        stageId: m.stageId,
        title: m.label,
        message: `${occurrence.shiftName} · Jam berangkat ${occurrence.jamBerangkatStr}, jam masuk ${occurrence.jamMasukStr}.`,
        shiftName: occurrence.shiftName,
        departTimeStr: occurrence.jamBerangkatStr,
        checkInTimeStr: occurrence.jamMasukStr,
      };
    }
  }

  return null;
}

export function getActiveInlineReminderNotice(
  now: Date,
  occurrence: ComputedOccurrence | null,
  config: CommuteAndReminderConfig,
  runtime: AlarmRuntimeState,
): ActiveAlert | null {
  if (!occurrence) {
    return null;
  }
  const milestones = buildReminderMilestones(occurrence, config);
  const nowMs = now.getTime();
  const activeWindowMs = 25 * 60_000;
  const isDeparted = runtime.departedOccurrenceKey === occurrence.occurrenceKey;

  let highestAcknowledgedIdx = -1;
  milestones.forEach((m, idx) => {
    const key = `${occurrence.occurrenceKey}__${m.stageId}`;
    if (runtime.triggeredKeys.includes(key)) {
      highestAcknowledgedIdx = idx;
    }
  });

  for (let i = milestones.length - 1; i >= 0; i -= 1) {
    const m = milestones[i];
    if (!m.enabled || i <= highestAcknowledgedIdx) {
      if (i <= highestAcknowledgedIdx) {
        break;
      }
      continue;
    }
    if (isDeparted && m.stageId !== 'checkin_soon') {
      continue;
    }
    const triggerMs = m.triggerAt.getTime();
    if (nowMs >= triggerMs && nowMs <= triggerMs + activeWindowMs) {
      return {
        key: `${occurrence.occurrenceKey}__${m.stageId}`,
        occurrenceKey: occurrence.occurrenceKey,
        stageId: m.stageId,
        title: m.label,
        message: `${occurrence.shiftName} · Jam berangkat ${occurrence.jamBerangkatStr}, jam masuk ${occurrence.jamMasukStr}.`,
        shiftName: occurrence.shiftName,
        departTimeStr: occurrence.jamBerangkatStr,
        checkInTimeStr: occurrence.jamMasukStr,
      };
    }
  }
  return null;
}

export function formatCountdown(targetMs: number, nowMs: number): {
  isPast: boolean;
  days: number;
  hours: string;
  minutes: string;
  seconds: string;
  compactLabel: string;
} {
  const diff = targetMs - nowMs;
  const isPast = diff < 0;
  const absSec = Math.floor(Math.abs(diff) / 1000);

  const days = Math.floor(absSec / 86400);
  const hoursNum = Math.floor((absSec % 86400) / 3600);
  const minutesNum = Math.floor((absSec % 3600) / 60);
  const secondsNum = absSec % 60;

  const hours = String(hoursNum).padStart(2, '0');
  const minutes = String(minutesNum).padStart(2, '0');
  const seconds = String(secondsNum).padStart(2, '0');

  const compactLabel =
    days > 0 ? `${days} hr ${hours}:${minutes}:${seconds}` : `${hours}:${minutes}:${seconds}`;

  return {
    isPast,
    days,
    hours,
    minutes,
    seconds,
    compactLabel,
  };
}

export function getCountdownStatus(
  now: Date,
  occurrence: ComputedOccurrence,
): {
  phase: 'upcoming' | 'prep' | 'depart_soon' | 'depart_urgent' | 'overdue';
  label: string;
  tone: 'neutral' | 'green' | 'amber' | 'red';
} {
  const nowMs = now.getTime();
  const prepMs = occurrence.prepStartAt.getTime();
  const departMs = occurrence.departAt.getTime();
  const checkInMs = occurrence.checkInAt.getTime();

  if (nowMs > checkInMs) {
    return {
      phase: 'overdue',
      label: 'Melewati Jam Masuk',
      tone: 'red',
    };
  }
  if (nowMs >= departMs) {
    return {
      phase: 'depart_urgent',
      label: 'Waktunya Berangkat Sekarang',
      tone: 'red',
    };
  }
  if (departMs - nowMs <= 15 * 60_000) {
    return {
      phase: 'depart_soon',
      label: 'Segera Berangkat',
      tone: 'amber',
    };
  }
  if (nowMs >= prepMs) {
    return {
      phase: 'prep',
      label: 'Waktunya Bersiap',
      tone: 'amber',
    };
  }
  return {
    phase: 'upcoming',
    label: 'Jadwal Terpantau Aman',
    tone: 'green',
  };
}

export function validateShiftInput(input: {
  nama: string;
  jamMasuk: string;
  durasiKerjaMenit: number;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!input.nama.trim()) {
    errors.nama = 'Nama shift wajib diisi.';
  } else if (input.nama.trim().length > 40) {
    errors.nama = 'Nama shift maksimal 40 karakter.';
  }

  if (parseTimeToMinutes(input.jamMasuk) === null) {
    errors.jamMasuk = 'Format jam masuk harus HH:MM (contoh 08:00).';
  }

  if (
    !Number.isFinite(input.durasiKerjaMenit) ||
    input.durasiKerjaMenit < 60 ||
    input.durasiKerjaMenit > 960
  ) {
    errors.durasiKerjaMenit = 'Durasi kerja harus antara 60 hingga 960 menit.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateImportedState(payload: unknown): payload is TepatKerjaState {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as Partial<TepatKerjaState>;
  if (
    !Array.isArray(candidate.shiftTemplates) ||
    !Array.isArray(candidate.weeklyRules) ||
    !Array.isArray(candidate.dateOverrides) ||
    !candidate.config ||
    typeof candidate.config !== 'object'
  ) {
    return false;
  }

  if (candidate.shiftTemplates.length === 0) {
    return false;
  }

  const validTemplates = candidate.shiftTemplates.every(
    (s) =>
      typeof s.id === 'string' &&
      typeof s.nama === 'string' &&
      parseTimeToMinutes(s.jamMasuk) !== null &&
      typeof s.durasiKerjaMenit === 'number',
  );

  const validRules = candidate.weeklyRules.length === 7;
  const validConfig =
    typeof candidate.config.durasiPersiapanMenit === 'number' &&
    typeof candidate.config.durasiPerjalananMenit === 'number' &&
    typeof candidate.config.bufferKeterlambatanMenit === 'number';

  return validTemplates && validRules && validConfig;
}
