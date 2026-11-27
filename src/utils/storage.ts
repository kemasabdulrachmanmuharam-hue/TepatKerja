import type {
  AlarmRuntimeState,
  CommuteTravelMode,
  DepartureLogEntry,
  GeoPoint,
  LiveCommuteConditions,
  TepatKerjaState,
  WorkspaceExtras,
} from '../types/schedule';
import {
  addDays,
  formatDateKey,
  formatMinutesToTime,
  formatShortDate,
  validateImportedState,
} from './scheduleEngine';
import {
  DEFAULT_NIGHT_END_HOUR,
  DEFAULT_NIGHT_START_HOUR,
  clampNightEndHour,
  clampNightStartHour,
} from './theme';

const STORAGE_KEY = 'tepatkerja_state_v1';
const RUNTIME_STORAGE_KEY = 'tepatkerja_runtime_v1';
const EXTRAS_STORAGE_KEY = 'tepatkerja_extras_v1';
const LIVE_COMMUTE_STORAGE_KEY = 'tepatkerja_live_commute_v1';
const HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const;

const VALID_TRAVEL_MODES: ReadonlySet<CommuteTravelMode> = new Set([
  'DRIVE',
  'TWO_WHEELER',
  'TRANSIT',
  'WALK',
]);

export function createSeedDepartureLogs(
  referenceDate: Date = new Date(),
): DepartureLogEntry[] {
  // ~20 working days across the last 30 calendar days, showing realistic improvement in consistency
  const sampleDeltas = [
    7, -1, 4, -2, -5,
    6, -3, -1, 3, -4,
    -2, -4, -2, 0, 5,
    -6, -3, -2, -5, -1,
  ];
  const entries: DepartureLogEntry[] = [];
  let cursor = addDays(
    new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate(),
      12,
      0,
      0,
      0,
    ),
    -1,
  );
  let idx = 0;

  while (entries.length < sampleDeltas.length && idx < 29) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      const delta = sampleDeltas[sampleDeltas.length - 1 - entries.length];
      const plannedMin = 7 * 60 + 15;
      const actualMin = plannedMin + delta;
      const dateKey = formatDateKey(cursor);
      entries.unshift({
        id: `seed-${dateKey}`,
        dateKey,
        dateLabelShort: formatShortDate(cursor),
        dayShort: HARI_SINGKAT[day],
        shiftName: 'Kantor Reguler',
        plannedDepartStr: '07:15',
        actualDepartStr: formatMinutesToTime(actualMin),
        plannedCheckInStr: '08:00',
        deltaMinutes: delta,
        onTime: delta <= 0,
      });
    }
    cursor = addDays(cursor, -1);
    idx += 1;
  }

  return entries;
}

export const STANDARD_SHIFT_TEMPLATES: TepatKerjaState['shiftTemplates'] = [
  {
    id: 'shift-1',
    nama: 'Shift 1 (Pagi)',
    jamMasuk: '07:00',
    durasiKerjaMenit: 540,
    catatan: 'Jam kerja 07:00–16:00',
  },
  {
    id: 'middle-pagi',
    nama: 'Middle Pagi',
    jamMasuk: '10:00',
    durasiKerjaMenit: 540,
    catatan: 'Jam kerja 10:00–19:00',
  },
  {
    id: 'shift-2',
    nama: 'Shift 2 (Siang)',
    jamMasuk: '13:00',
    durasiKerjaMenit: 540,
    catatan: 'Jam kerja 13:00–22:00',
  },
  {
    id: 'shift-3',
    nama: 'Shift 3 (Malam Awal)',
    jamMasuk: '20:00',
    durasiKerjaMenit: 540,
    catatan: 'Jam kerja 20:00–05:00 (+1 hari)',
  },
  {
    id: 'shift-4',
    nama: 'Shift 4 (Malam Larut)',
    jamMasuk: '22:00',
    durasiKerjaMenit: 540,
    catatan: 'Jam kerja 22:00–07:00 (+1 hari)',
  },
  {
    id: 'kantor-reguler',
    nama: 'Kantor Reguler',
    jamMasuk: '08:00',
    durasiKerjaMenit: 540,
    catatan: 'Jadwal kerja standar 08:00–17:00',
  },
];

export function createDefaultState(): TepatKerjaState {
  return {
    version: 1,
    shiftTemplates: STANDARD_SHIFT_TEMPLATES.map((item) => ({ ...item })),
    weeklyRules: [
      { dayOfWeek: 0, aktif: false, shiftId: null },
      { dayOfWeek: 1, aktif: true, shiftId: 'kantor-reguler' },
      { dayOfWeek: 2, aktif: true, shiftId: 'kantor-reguler' },
      { dayOfWeek: 3, aktif: true, shiftId: 'kantor-reguler' },
      { dayOfWeek: 4, aktif: true, shiftId: 'kantor-reguler' },
      { dayOfWeek: 5, aktif: true, shiftId: 'kantor-reguler' },
      { dayOfWeek: 6, aktif: false, shiftId: null },
    ],
    dateOverrides: [],
    config: {
      durasiPersiapanMenit: 30,
      durasiPerjalananMenit: 35,
      bufferKeterlambatanMenit: 10,
      tahapanAktif: {
        prep_start: true,
        depart_soon: true,
        depart_now: true,
        checkin_soon: true,
      },
      nadaAlarm: 'lonceng',
      volume: 0.8,
      snoozeMenit: 5,
    },
    departureLogs: createSeedDepartureLogs(),
  };
}

export function createDefaultExtras(): WorkspaceExtras {
  return {
    checklistLabels: [
      { id: 'mandi', label: 'Mandi & siapkan pakaian kerja' },
      { id: 'sarapan', label: 'Sarapan / isi botol minum & bekal' },
      { id: 'perlengkapan', label: 'Cek ID Card, dompet, kunci & ponsel' },
      { id: 'kendaraan', label: 'Cek rute jalan atau perlengkapan kendaraan' },
    ],
    checklistDoneKeys: [],
    shiftNotes: {},
    quickBufferPreset: 'normal',
    focusWorkMinutes: 25,
    focusBreakMinutes: 5,
    ambientPreset: 'off',
    autoAdjustEnabled: false,
    originAddress: '',
    destinationAddress: '',
    travelMode: 'DRIVE',
    gpsValidationEnabled: true,
    gpsRadiusMeters: 500,
    originCoords: null,
    workplaceCoords: null,
    themeScheduleMode: 'auto',
    nightStartHour: DEFAULT_NIGHT_START_HOUR,
    nightEndHour: DEFAULT_NIGHT_END_HOUR,
  };
}

function parseStoredGeoPoint(raw: unknown): GeoPoint | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const lat = Number(obj.lat);
  const lng = Number(obj.lng);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return {
    lat: Math.round(lat * 100000) / 100000,
    lng: Math.round(lng * 100000) / 100000,
  };
}

export function createDefaultRuntime(): AlarmRuntimeState {
  return {
    triggeredKeys: [],
    departedOccurrenceKey: null,
    snoozedUntil: null,
    snoozedAlert: null,
  };
}

export function loadStateFromStorage(): TepatKerjaState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultState();
    }
    const parsed: unknown = JSON.parse(raw);
    if (validateImportedState(parsed)) {
      return {
        ...parsed,
        departureLogs: Array.isArray(parsed.departureLogs)
          ? parsed.departureLogs
          : createSeedDepartureLogs(),
      };
    }
    return createDefaultState();
  } catch {
    return createDefaultState();
  }
}

export function saveStateToStorage(state: TepatKerjaState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadExtrasFromStorage(): WorkspaceExtras {
  const defaults = createDefaultExtras();
  try {
    const raw = window.localStorage.getItem(EXTRAS_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<WorkspaceExtras>;
    return {
      checklistLabels:
        Array.isArray(parsed.checklistLabels) && parsed.checklistLabels.length > 0
          ? parsed.checklistLabels.slice(0, 15)
          : defaults.checklistLabels,
      checklistDoneKeys: Array.isArray(parsed.checklistDoneKeys)
        ? parsed.checklistDoneKeys.slice(-40)
        : [],
      shiftNotes:
        parsed.shiftNotes && typeof parsed.shiftNotes === 'object'
          ? parsed.shiftNotes
          : {},
      quickBufferPreset:
        parsed.quickBufferPreset === 'padat' || parsed.quickBufferPreset === 'hujan'
          ? parsed.quickBufferPreset
          : 'normal',
      focusWorkMinutes:
        typeof parsed.focusWorkMinutes === 'number' &&
        parsed.focusWorkMinutes >= 5 &&
        parsed.focusWorkMinutes <= 120
          ? parsed.focusWorkMinutes
          : 25,
      focusBreakMinutes:
        typeof parsed.focusBreakMinutes === 'number' &&
        parsed.focusBreakMinutes >= 1 &&
        parsed.focusBreakMinutes <= 60
          ? parsed.focusBreakMinutes
          : 5,
      ambientPreset:
        parsed.ambientPreset === 'pagi_cerah' ||
        parsed.ambientPreset === 'lofi_fokus' ||
        parsed.ambientPreset === 'hujan_tenang' ||
        parsed.ambientPreset === 'white_noise'
          ? parsed.ambientPreset
          : 'off',
      autoAdjustEnabled: Boolean(parsed.autoAdjustEnabled),
      originAddress:
        typeof parsed.originAddress === 'string'
          ? parsed.originAddress.slice(0, 160)
          : '',
      destinationAddress:
        typeof parsed.destinationAddress === 'string'
          ? parsed.destinationAddress.slice(0, 160)
          : '',
      travelMode:
        typeof parsed.travelMode === 'string' &&
        VALID_TRAVEL_MODES.has(parsed.travelMode as CommuteTravelMode)
          ? (parsed.travelMode as CommuteTravelMode)
          : 'DRIVE',
      gpsValidationEnabled:
        typeof parsed.gpsValidationEnabled === 'boolean'
          ? parsed.gpsValidationEnabled
          : defaults.gpsValidationEnabled,
      gpsRadiusMeters:
        typeof parsed.gpsRadiusMeters === 'number' &&
        Number.isFinite(parsed.gpsRadiusMeters)
          ? Math.max(100, Math.min(5000, Math.round(parsed.gpsRadiusMeters)))
          : defaults.gpsRadiusMeters,
      originCoords: parseStoredGeoPoint(parsed.originCoords),
      workplaceCoords: parseStoredGeoPoint(parsed.workplaceCoords),
      themeScheduleMode:
        parsed.themeScheduleMode === 'manual'
          ? 'manual'
          : parsed.themeScheduleMode === 'system'
            ? 'system'
            : 'auto',
      nightStartHour:
        typeof parsed.nightStartHour === 'number' &&
        Number.isFinite(parsed.nightStartHour)
          ? clampNightStartHour(parsed.nightStartHour)
          : defaults.nightStartHour,
      nightEndHour:
        typeof parsed.nightEndHour === 'number' &&
        Number.isFinite(parsed.nightEndHour)
          ? clampNightEndHour(parsed.nightEndHour)
          : defaults.nightEndHour,
    };
  } catch {
    return defaults;
  }
}

export function saveExtrasToStorage(extras: WorkspaceExtras): void {
  try {
    window.localStorage.setItem(EXTRAS_STORAGE_KEY, JSON.stringify(extras));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadLiveCommuteFromStorage(): LiveCommuteConditions | null {
  try {
    const raw = window.localStorage.getItem(LIVE_COMMUTE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<LiveCommuteConditions>;
    if (
      typeof parsed.fetchedAt !== 'number' ||
      typeof parsed.liveTravelMinutes !== 'number' ||
      typeof parsed.weatherBufferMinutes !== 'number'
    ) {
      return null;
    }
    // Expire cached live weather/traffic telemetry after 3 hours
    if (Date.now() - parsed.fetchedAt > 3 * 60 * 60_000) {
      return null;
    }
    return parsed as LiveCommuteConditions;
  } catch {
    return null;
  }
}

export function saveLiveCommuteToStorage(
  conditions: LiveCommuteConditions | null,
): void {
  try {
    if (!conditions) {
      window.localStorage.removeItem(LIVE_COMMUTE_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      LIVE_COMMUTE_STORAGE_KEY,
      JSON.stringify(conditions),
    );
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadRuntimeFromStorage(): AlarmRuntimeState {
  try {
    const raw = window.localStorage.getItem(RUNTIME_STORAGE_KEY);
    if (!raw) {
      return createDefaultRuntime();
    }
    const parsed = JSON.parse(raw) as Partial<AlarmRuntimeState>;
    return {
      triggeredKeys: Array.isArray(parsed.triggeredKeys)
        ? parsed.triggeredKeys.slice(-80)
        : [],
      departedOccurrenceKey:
        typeof parsed.departedOccurrenceKey === 'string'
          ? parsed.departedOccurrenceKey
          : null,
      snoozedUntil:
        typeof parsed.snoozedUntil === 'number' ? parsed.snoozedUntil : null,
      snoozedAlert: parsed.snoozedAlert ?? null,
    };
  } catch {
    return createDefaultRuntime();
  }
}

export function saveRuntimeToStorage(runtime: AlarmRuntimeState): void {
  try {
    window.localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(runtime));
  } catch {
    // Ignore storage quota errors cleanly
  }
}
