export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ReminderStageId =
  | 'prep_start'
  | 'depart_soon'
  | 'depart_now'
  | 'checkin_soon';

export type AlarmToneId = 'lonceng' | 'ritmis' | 'tegas';

export type AppTab = 'dashboard' | 'studio3d' | 'schedule' | 'commute';

export type QuickBufferPreset = 'normal' | 'padat' | 'hujan';

export type AmbientSoundPreset =
  | 'off'
  | 'pagi_cerah'
  | 'lofi_fokus'
  | 'hujan_tenang'
  | 'white_noise';

export type CameraPresetId = 'utama' | 'fokus_jam' | 'atas' | 'meja_santai';

export interface ChecklistItemDef {
  id: string;
  label: string;
}

export type CommuteTravelMode = 'DRIVE' | 'TWO_WHEELER' | 'TRANSIT' | 'WALK';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type DepartureLocationStatus =
  | 'valid_origin'
  | 'at_workplace'
  | 'mismatch_origin'
  | 'detected_unverified'
  | 'gps_denied'
  | 'gps_unavailable';

export interface DepartureLocationValidationResult {
  status: DepartureLocationStatus;
  currentCoords: GeoPoint | null;
  detectedLocationLabel: string | null;
  expectedOriginLabel: string | null;
  workplaceLabel: string | null;
  resolvedOriginCoords: GeoPoint | null;
  resolvedWorkplaceCoords: GeoPoint | null;
  distanceToOriginMeters: number | null;
  distanceToWorkplaceMeters: number | null;
  thresholdMeters: number;
  message: string;
  shouldConfirm: boolean;
}

export interface CommuteRouteProfile {
  autoAdjustEnabled: boolean;
  originAddress: string;
  destinationAddress: string;
  travelMode: CommuteTravelMode;
  originCoords?: GeoPoint | null;
  workplaceCoords?: GeoPoint | null;
  gpsValidationEnabled?: boolean;
  gpsRadiusMeters?: number;
}

export interface LiveCommuteConditions {
  fetchedAt: number;
  originLabel: string;
  destinationLabel: string;
  travelMode: CommuteTravelMode;
  distanceMeters: number;
  baseTravelMinutes: number;
  liveTravelMinutes: number;
  trafficDelayMinutes: number;
  weatherConditionType: string;
  weatherDescription: string;
  weatherIconUri?: string;
  temperatureCelsius: number | null;
  precipitationPercent: number;
  thunderstormPercent: number;
  windKmh: number | null;
  visibilityKm: number | null;
  weatherBufferMinutes: number;
  weatherReason: string;
  recommendedTotalMinutes: number;
  hasBetaRouteWarning: boolean;
}

export interface EffectiveCommuteSummary {
  effectiveConfig: CommuteAndReminderConfig;
  isAutoAdjusted: boolean;
  baselineTravelMinutes: number;
  baselineBufferMinutes: number;
  effectiveTravelMinutes: number;
  effectiveBufferMinutes: number;
  trafficDeltaMinutes: number;
  weatherDeltaMinutes: number;
  totalDeltaMinutes: number;
  adjustmentReasons: string[];
}

export interface WorkspaceExtras {
  checklistLabels: ChecklistItemDef[];
  checklistDoneKeys: string[];
  shiftNotes: Record<string, string>;
  quickBufferPreset: QuickBufferPreset;
  focusWorkMinutes: number;
  focusBreakMinutes: number;
  ambientPreset: AmbientSoundPreset;
  autoAdjustEnabled: boolean;
  originAddress: string;
  destinationAddress: string;
  travelMode: CommuteTravelMode;
  gpsValidationEnabled: boolean;
  gpsRadiusMeters: number;
  originCoords: GeoPoint | null;
  workplaceCoords: GeoPoint | null;
  themeScheduleMode: 'auto' | 'manual' | 'system';
  nightStartHour: number;
  nightEndHour: number;
}

export interface UserProfileData {
  ownerUid: string;
  displayName: string;
  roleTitle: string;
  workplaceName: string;
}

export interface ShiftTemplate {
  id: string;
  nama: string;
  jamMasuk: string; // HH:mm
  durasiKerjaMenit: number;
  catatan: string;
}

export interface WeeklyRule {
  dayOfWeek: DayOfWeek;
  aktif: boolean;
  shiftId: string | null;
}

export type NonWorkCategory = 'off' | 'cuti' | 'izin' | 'sakit' | 'libur';

export interface DateOverride {
  dateKey: string; // YYYY-MM-DD
  tipe: 'shift' | 'libur';
  kategoriStatus?: NonWorkCategory;
  shiftId?: string;
  jamMasukKustom?: string;
  durasiKustomMenit?: number;
  label?: string;
}

export interface CommuteAndReminderConfig {
  durasiPersiapanMenit: number;
  durasiPerjalananMenit: number;
  bufferKeterlambatanMenit: number;
  tahapanAktif: Record<ReminderStageId, boolean>;
  nadaAlarm: AlarmToneId;
  volume: number; // 0 to 1
  snoozeMenit: 5 | 10 | 15;
}

export interface DepartureLogEntry {
  id: string;
  dateKey: string; // YYYY-MM-DD
  dateLabelShort: string; // e.g. "23 Nov"
  dayShort: string; // e.g. "Sen"
  shiftName: string;
  plannedDepartStr: string; // HH:mm
  actualDepartStr: string; // HH:mm
  plannedCheckInStr: string; // HH:mm
  deltaMinutes: number; // actualDepart - plannedDepart (<= 0 means on time)
  onTime: boolean;
  gpsStatus?: DepartureLocationStatus;
  gpsDistanceMeters?: number | null;
  gpsLocationLabel?: string | null;
}

export interface TepatKerjaState {
  version: number;
  shiftTemplates: ShiftTemplate[];
  weeklyRules: WeeklyRule[];
  dateOverrides: DateOverride[];
  config: CommuteAndReminderConfig;
  departureLogs?: DepartureLogEntry[];
}

export interface ComputedOccurrence {
  occurrenceKey: string; // YYYY-MM-DD__jamMasuk
  dateKey: string;
  dateLabel: string;
  shortDayLabel: string;
  shiftName: string;
  source: 'rutin' | 'override';
  jamMasukStr: string;
  jamBerangkatStr: string;
  jamPersiapanStr: string;
  jamPulangStr: string;
  isOvernight?: boolean;
  durasiKerjaMenit?: number;
  prepStartAt: Date;
  departAt: Date;
  checkInAt: Date;
  workEndAt: Date;
}

export interface ReminderMilestone {
  stageId: ReminderStageId;
  label: string;
  description: string;
  triggerAt: Date;
  triggerTimeStr: string;
  enabled: boolean;
}

export interface ActiveAlert {
  key: string;
  occurrenceKey: string;
  stageId: ReminderStageId;
  title: string;
  message: string;
  shiftName: string;
  departTimeStr: string;
  checkInTimeStr: string;
  isSimulation?: boolean;
}

export interface AlarmRuntimeState {
  triggeredKeys: string[];
  departedOccurrenceKey: string | null;
  snoozedUntil: number | null;
  snoozedAlert: ActiveAlert | null;
}

export interface DaySchedulePreview {
  dateKey: string;
  dayName: string;
  dateShort: string;
  isToday: boolean;
  isOff: boolean;
  hasOverride?: boolean;
  source: 'rutin' | 'override' | 'libur';
  kategoriStatus?: NonWorkCategory | 'shift';
  occurrence: ComputedOccurrence | null;
  overrideLabel?: string;
}

export interface MonthlyCalendarDay {
  dateKey: string;
  dayNumber: number;
  dayOfWeek: DayOfWeek;
  isToday: boolean;
  isCurrentMonth: boolean;
  isOff: boolean;
  source: 'rutin' | 'override' | 'libur';
  kategoriStatus: NonWorkCategory | 'shift';
  occurrence: ComputedOccurrence | null;
  override?: DateOverride;
}

export interface MonthlyRosterSummary {
  totalWorkingDays: number;
  totalOffDays: number;
  totalLeaveDays: number; // cuti + izin + sakit + libur nasional
  totalWorkHours: number;
  byCategory: Record<NonWorkCategory, number>;
  byShift: Array<{ shiftName: string; count: number }>;
}
