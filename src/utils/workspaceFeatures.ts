import type {
  ChecklistItemDef,
  ComputedOccurrence,
  DaySchedulePreview,
  DepartureLogEntry,
  MonthlyCalendarDay,
  QuickBufferPreset,
  TepatKerjaState,
} from '../types/schedule';
import { getUpcomingWeekSchedule } from './scheduleEngine';
import { getThemePresetById, type ThemeSettings } from './theme';

export interface PunctualityStreakStats {
  currentStreak: number;
  bestStreak: number;
  recentOnTimeCount: number;
  levelTitle: string;
}

export type TimeOfDayMoodId = 'pagi' | 'siang' | 'sore' | 'malam';

export interface TimeOfDayMoodInfo {
  id: TimeOfDayMoodId;
  label: string;
  greeting: string;
  subtitle: string;
}

export interface ThreeScenePalette {
  backgroundHex: string;
  fogHex: string;
  deskHex: string;
  plinthHex: string;
  bezelHex: string;
  dialHex: string;
  handHex: string;
  accentHex: string;
  beaconHex: string;
  keyLightHex: string;
  hemiSkyHex: string;
  hemiGroundHex: string;
  lampShadeHex: string;
  mugHex: string;
  armorWhiteHex: string;
  armorBlueHex: string;
  armorRedHex: string;
  armorGoldHex: string;
  visorHex: string;
}

export function computePunctualityStreak(
  logs: DepartureLogEntry[],
): PunctualityStreakStats {
  if (!logs || logs.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      recentOnTimeCount: 0,
      levelTitle: 'Pemula Disiplin',
    };
  }

  const sorted = [...logs].sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  let currentStreak = 0;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (sorted[i].onTime) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  let bestStreak = 0;
  let running = 0;
  for (const item of sorted) {
    if (item.onTime) {
      running += 1;
      if (running > bestStreak) {
        bestStreak = running;
      }
    } else {
      running = 0;
    }
  }

  const recentOnTimeCount = sorted.slice(-7).filter((item) => item.onTime).length;

  let levelTitle = 'Pemula Disiplin';
  if (bestStreak >= 20 || currentStreak >= 14) {
    levelTitle = 'Master Ketepatan';
  } else if (bestStreak >= 10 || currentStreak >= 7) {
    levelTitle = 'Profesional Andal';
  } else if (bestStreak >= 4 || currentStreak >= 3) {
    levelTitle = 'Komuter Konsisten';
  }

  return {
    currentStreak,
    bestStreak,
    recentOnTimeCount,
    levelTitle,
  };
}

export function getBufferMinutesForPreset(preset: QuickBufferPreset): number {
  switch (preset) {
    case 'padat':
      return 20;
    case 'hujan':
      return 30;
    case 'normal':
    default:
      return 10;
  }
}

export function inferQuickBufferPreset(
  bufferMinutes: number,
): QuickBufferPreset | 'custom' {
  if (bufferMinutes === 10) {
    return 'normal';
  }
  if (bufferMinutes === 20) {
    return 'padat';
  }
  if (bufferMinutes === 30) {
    return 'hujan';
  }
  return 'custom';
}

export function getTimeOfDayMood(date: Date = new Date()): TimeOfDayMoodInfo {
  const hour = date.getHours();
  if (hour >= 4 && hour < 11) {
    return {
      id: 'pagi',
      label: 'Suasana Pagi',
      greeting: 'Selamat Pagi',
      subtitle: 'Cahaya pagi cerah untuk memulai persiapan kerja tepat waktu.',
    };
  }
  if (hour >= 11 && hour < 15) {
    return {
      id: 'siang',
      label: 'Suasana Siang',
      greeting: 'Selamat Siang',
      subtitle: 'Tetap fokus dan jaga ritme kerja atau persiapkan shift siang.',
    };
  }
  if (hour >= 15 && hour < 18) {
    return {
      id: 'sore',
      label: 'Suasana Sore',
      greeting: 'Selamat Sore',
      subtitle: 'Transisi sore yang hangat untuk persiapan shift sore maupun evaluasi.',
    };
  }
  return {
    id: 'malam',
    label: 'Suasana Malam',
    greeting: 'Selamat Malam',
    subtitle: 'Atur jadwal esok atau bersiap tenang untuk jadwal shift malam.',
  };
}

export function getChecklistProgress(
  occurrenceKey: string | null,
  items: ChecklistItemDef[],
  doneKeys: string[],
): { doneCount: number; totalCount: number; percent: number } {
  const totalCount = items.length;
  if (!occurrenceKey || totalCount === 0) {
    return { doneCount: 0, totalCount, percent: 0 };
  }
  const doneSet = new Set(doneKeys);
  const doneCount = items.filter((item) =>
    doneSet.has(`${occurrenceKey}__${item.id}`),
  ).length;
  const percent = Math.round((doneCount / totalCount) * 100);
  return { doneCount, totalCount, percent };
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatIcsLocalDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${hh}${mm}${ss}`;
}

function formatIcsUtcDateTime(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function buildIcsCalendarFromOccurrences(
  occurrences: ComputedOccurrence[],
  calendarName = 'Jadwal Kerja TepatKerja',
  shiftNotes: Record<string, string> = {},
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TepatKerja//Jadwal Kerja & Shift//ID',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const stamp = formatIcsUtcDateTime(new Date());

  for (const occ of occurrences) {
    const note = shiftNotes[occ.dateKey]?.trim();
    const leadMinutes = Math.max(
      5,
      Math.round((occ.checkInAt.getTime() - occ.departAt.getTime()) / 60_000),
    );
    const descParts = [
      `Mulai bersiap: ${occ.jamPersiapanStr}`,
      `Target berangkat: ${occ.jamBerangkatStr}`,
      `Masuk: ${occ.jamMasukStr}`,
      `Pulang: ${occ.jamPulangStr}${occ.isOvernight ? ' (+1 hari)' : ''}`,
    ];
    if (note) {
      descParts.push(`Catatan: ${note}`);
    }

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${occ.occurrenceKey}@tepatkerja.app`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${formatIcsLocalDateTime(occ.checkInAt)}`);
    lines.push(`DTEND:${formatIcsLocalDateTime(occ.workEndAt)}`);
    lines.push('STATUS:CONFIRMED');
    lines.push(
      `SUMMARY:${escapeIcsText(`${occ.shiftName} (Berangkat ${occ.jamBerangkatStr})`)}`,
    );
    lines.push(`DESCRIPTION:${escapeIcsText(descParts.join(' | '))}`);
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push(
      `DESCRIPTION:${escapeIcsText(`Waktunya bersiap menuju ${occ.shiftName}`)}`,
    );
    lines.push(`TRIGGER:-PT${leadMinutes}M`);
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function generateIcsCalendarContent(
  days: MonthlyCalendarDay[],
  calendarName = 'Jadwal Kerja TepatKerja',
  shiftNotes: Record<string, string> = {},
): string {
  const occurrences = days
    .filter((day) => day.isCurrentMonth && day.occurrence !== null)
    .map((day) => day.occurrence as ComputedOccurrence);
  return buildIcsCalendarFromOccurrences(occurrences, calendarName, shiftNotes);
}

export function generateUpcomingIcsCalendarContent(
  days: DaySchedulePreview[],
  calendarName = 'Jadwal Kerja TepatKerja',
  shiftNotes: Record<string, string> = {},
): string {
  const occurrences = days
    .filter((day) => day.occurrence !== null)
    .map((day) => day.occurrence as ComputedOccurrence);
  return buildIcsCalendarFromOccurrences(occurrences, calendarName, shiftNotes);
}

function triggerIcsDownload(content: string, filename: string): string {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return filename;
}

export function downloadMonthlyIcs(
  days: MonthlyCalendarDay[],
  monthLabel: string,
  shiftNotes: Record<string, string> = {},
): { filename: string; eventCount: number } {
  const eventCount = days.filter(
    (day) => day.isCurrentMonth && day.occurrence !== null,
  ).length;
  const safeSlug = monthLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = `tepatkerja-jadwal-${safeSlug}.ics`;
  if (eventCount === 0) {
    return { filename, eventCount: 0 };
  }
  const content = generateIcsCalendarContent(
    days,
    `TepatKerja · ${monthLabel}`,
    shiftNotes,
  );
  triggerIcsDownload(content, filename);
  return { filename, eventCount };
}

export function downloadUpcomingIcs(
  state: TepatKerjaState,
  daysCount = 30,
  shiftNotes: Record<string, string> = {},
): { filename: string; eventCount: number } {
  const preview = getUpcomingWeekSchedule(new Date(), state, daysCount);
  const eventCount = preview.filter((day) => day.occurrence !== null).length;
  const filename = `tepatkerja-jadwal-${daysCount}-hari.ics`;
  if (eventCount === 0) {
    return { filename, eventCount: 0 };
  }
  const content = generateUpcomingIcsCalendarContent(
    preview,
    `TepatKerja · ${daysCount} Hari Ke Depan`,
    shiftNotes,
  );
  triggerIcsDownload(content, filename);
  return { filename, eventCount };
}

export function get3DThemeScenePalette(
  settings: ThemeSettings,
  timeMood: TimeOfDayMoodId,
  urgencyTone: 'neutral' | 'green' | 'amber' | 'red',
): ThreeScenePalette {
  const preset = getThemePresetById(settings.presetId);
  const isDark = settings.colorMode === 'dark';

  const presetBaseById: Record<
    ThemeSettings['presetId'],
    {
      lightBg: string;
      darkBg: string;
      plinthLight: string;
      plinthDark: string;
      bezelLight: string;
      bezelDark: string;
      mugHex: string;
      armorWhiteLight: string;
      armorWhiteDark: string;
      armorBlue: string;
      armorRed: string;
      armorGold: string;
      visorHex: string;
    }
  > = {
    klasik: {
      lightBg: '#DCE7F7',
      darkBg: '#070C18',
      plinthLight: '#E5ECF5',
      plinthDark: '#162135',
      bezelLight: '#283548',
      bezelDark: '#64748B',
      mugHex: '#F8FAFC',
      armorWhiteLight: '#F4F7FB',
      armorWhiteDark: '#DCE6F4',
      armorBlue: '#1D4ED8',
      armorRed: '#DC2626',
      armorGold: '#F59E0B',
      visorHex: '#10B981',
    },
    grafit: {
      lightBg: '#D8E1EB',
      darkBg: '#080D14',
      plinthLight: '#DCE3EC',
      plinthDark: '#16202C',
      bezelLight: '#1E293B',
      bezelDark: '#7C8FA6',
      mugHex: '#E2E8F0',
      armorWhiteLight: '#EEF2F7',
      armorWhiteDark: '#CBD5E1',
      armorBlue: '#0369A1',
      armorRed: '#DC2626',
      armorGold: '#F59E0B',
      visorHex: '#06B6D4',
    },
    karbon: {
      lightBg: '#EAE3D8',
      darkBg: '#090A10',
      plinthLight: '#DDD5C8',
      plinthDark: '#171923',
      bezelLight: '#2A2D3B',
      bezelDark: '#5B6278',
      mugHex: '#181A24',
      armorWhiteLight: '#262938',
      armorWhiteDark: '#161823',
      armorBlue: '#1D2030',
      armorRed: '#EA580C',
      armorGold: '#FFB703',
      visorHex: '#FF7A1A',
    },
    mawar: {
      lightBg: '#F4E4ED',
      darkBg: '#160C14',
      plinthLight: '#F3E9EE',
      plinthDark: '#291D26',
      bezelLight: '#523444',
      bezelDark: '#C48CA6',
      mugHex: '#FFF5F9',
      armorWhiteLight: '#FAF1F6',
      armorWhiteDark: '#EBD9E3',
      armorBlue: '#BE185D',
      armorRed: '#9D174D',
      armorGold: '#F59E0B',
      visorHex: '#10B981',
    },
    sage: {
      lightBg: '#DCECE4',
      darkBg: '#07130E',
      plinthLight: '#E3EFE8',
      plinthDark: '#162720',
      bezelLight: '#243C32',
      bezelDark: '#72A58D',
      mugHex: '#F3FAF6',
      armorWhiteLight: '#EDF6F1',
      armorWhiteDark: '#CCE0D6',
      armorBlue: '#047857',
      armorRed: '#DC2626',
      armorGold: '#F59E0B',
      visorHex: '#2DD4BF',
    },
  };

  const base = presetBaseById[settings.presetId] ?? presetBaseById.klasik;

  const keyLightByMood: Record<TimeOfDayMoodId, string> = {
    pagi: '#FFEAD2',
    siang: '#FFF6E8',
    sore: '#FFD3AC',
    malam: '#DCE8FF',
  };

  const hemiSkyByMood: Record<TimeOfDayMoodId, string> = {
    pagi: '#B9D9FF',
    siang: '#CBE4FF',
    sore: '#E8C5B8',
    malam: '#4A6899',
  };

  const beaconByTone: Record<'neutral' | 'green' | 'amber' | 'red', string> = {
    neutral: '#10B981',
    green: '#10B981',
    amber: '#F59E0B',
    red: '#EF4444',
  };

  const backgroundHex = isDark ? base.darkBg : base.lightBg;

  return {
    backgroundHex,
    fogHex: backgroundHex,
    deskHex: isDark ? '#0D1320' : '#D0DAE8',
    plinthHex: isDark ? base.plinthDark : base.plinthLight,
    bezelHex: isDark ? base.bezelDark : base.bezelLight,
    dialHex: isDark ? '#0E1524' : '#FFFFFF',
    handHex: isDark ? '#F8FAFC' : '#0F172A',
    accentHex: preset.swatchHex,
    beaconHex: beaconByTone[urgencyTone],
    keyLightHex: keyLightByMood[timeMood],
    hemiSkyHex: hemiSkyByMood[timeMood],
    hemiGroundHex: isDark ? '#1A202C' : '#94A3B8',
    lampShadeHex: preset.swatchHex,
    mugHex: base.mugHex,
    armorWhiteHex: isDark ? base.armorWhiteDark : base.armorWhiteLight,
    armorBlueHex: base.armorBlue,
    armorRedHex: base.armorRed,
    armorGoldHex: base.armorGold,
    visorHex: urgencyTone === 'red' ? '#EF4444' : urgencyTone === 'amber' ? '#F59E0B' : base.visorHex,
  };
}
