import { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  CloudRain,
  Flame,
  Gauge,
  Maximize2,
  Navigation,
  RefreshCw,
  StickyNote,
  TrafficCone,
  Volume2,
} from 'lucide-react';
import {
  buildReminderMilestones,
  formatCountdown,
  getCountdownStatus,
  getNonWorkCategoryLabel,
} from '../utils/scheduleEngine';
import type { ThemeSettings } from '../utils/theme';
import {
  computePunctualityStreak,
  getChecklistProgress,
  inferQuickBufferPreset,
} from '../utils/workspaceFeatures';
import type {
  ActiveAlert,
  AmbientSoundPreset,
  AppTab,
  CommuteAndReminderConfig,
  ComputedOccurrence,
  DaySchedulePreview,
  DepartureLogEntry,
  EffectiveCommuteSummary,
  LiveCommuteConditions,
  QuickBufferPreset,
  ShiftTemplate,
  WorkspaceExtras,
} from '../types/schedule';
import { formatDistanceLabel, TRAVEL_MODE_LABELS } from '../utils/smartCommute';
import { AnalyticsSection } from './AnalyticsSection';
import {
  BansheeMediaPanel,
  DimensionalEmptySchedule3D,
} from './Creative3DAccents';
import { PreparationAndFocusGrid } from './PreparationAndFocusGrid';
import { ThreeWorkspaceScene } from './ThreeWorkspaceScene';
import {
  EmptyState,
  StatusBanner,
  tkInputClass,
  tkSelectClass,
} from './ui/DesignSystem';

interface DashboardViewProps {
  now: Date;
  currentWorkingShift: ComputedOccurrence | null;
  nextOccurrence: ComputedOccurrence | null;
  inlineNotice: ActiveAlert | null;
  upcomingWeek: DaySchedulePreview[];
  departureLogs: DepartureLogEntry[];
  shiftTemplates: ShiftTemplate[];
  config: CommuteAndReminderConfig;
  theme: ThemeSettings;
  extras: WorkspaceExtras;
  alarmActive: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  testFeedback: string | null;
  focusMode: 'work' | 'break';
  focusRunning: boolean;
  focusSecondsLeft: number;
  onToggleFocusRunning: () => void;
  onResetFocusTimer: () => void;
  onSelectFocusPreset: (workMin: number, breakMin: number) => void;
  onEnterZenMode: () => void;
  onRequestNotification: () => void;
  onTestAlarm: () => void;
  onDismissInlineNotice: (alertKey: string) => void;
  onMarkDeparted: (occurrenceKey: string) => void;
  onSetDateOverride: (
    dateKey: string,
    mode: 'rutin' | 'libur' | string,
  ) => void;
  onSelectQuickBuffer: (preset: QuickBufferPreset) => void;
  onUpdateShiftNote: (dateKey: string, note: string) => void;
  onToggleChecklistItem: (itemId: string) => void;
  onAddChecklistItem: (label: string) => void;
  onRemoveChecklistItem: (itemId: string) => void;
  onChangeAmbientPreset: (preset: AmbientSoundPreset) => void;
  onExportScheduleIcs: () => { filename: string; eventCount: number };
  onNavigateTab: (tab: AppTab) => void;
  liveCommute: LiveCommuteConditions | null;
  liveCommuteLoading: boolean;
  commuteSummary: EffectiveCommuteSummary;
  onOpenAccount: () => void;
  onRefreshLiveCommute: () => void;
  gpsChecking?: boolean;
}

const QUICK_BUFFER_PRESETS: Array<{
  id: QuickBufferPreset;
  label: string;
  detail: string;
  Icon: typeof Gauge;
}> = [
  { id: 'normal', label: 'Lancar +10m', detail: 'Kondisi normal', Icon: Gauge },
  { id: 'padat', label: 'Padat +20m', detail: 'Lalu lintas ramai', Icon: TrafficCone },
  { id: 'hujan', label: 'Hujan +30m', detail: 'Cuaca/darurat', Icon: CloudRain },
];

export function DashboardView({
  now,
  currentWorkingShift,
  nextOccurrence,
  inlineNotice,
  upcomingWeek,
  departureLogs,
  shiftTemplates,
  config,
  theme,
  extras,
  alarmActive,
  notificationPermission,
  testFeedback,
  focusMode,
  focusRunning,
  focusSecondsLeft,
  onToggleFocusRunning,
  onResetFocusTimer,
  onSelectFocusPreset,
  onEnterZenMode,
  onRequestNotification,
  onTestAlarm,
  onDismissInlineNotice,
  onMarkDeparted,
  onSetDateOverride,
  onSelectQuickBuffer,
  onUpdateShiftNote,
  onToggleChecklistItem,
  onAddChecklistItem,
  onRemoveChecklistItem,
  onChangeAmbientPreset,
  onExportScheduleIcs,
  onNavigateTab,
  liveCommute,
  liveCommuteLoading,
  commuteSummary,
  onOpenAccount,
  onRefreshLiveCommute,
  gpsChecking = false,
}: DashboardViewProps) {
  const [icsNotice, setIcsNotice] = useState<string | null>(null);

  const status = nextOccurrence ? getCountdownStatus(now, nextOccurrence) : null;
  const countdown = nextOccurrence
    ? formatCountdown(nextOccurrence.departAt.getTime(), now.getTime())
    : null;
  const milestones = nextOccurrence
    ? buildReminderMilestones(nextOccurrence, config)
    : [];

  const totalCommuteMin =
    config.durasiPerjalananMenit + config.bufferKeterlambatanMenit;
  const streak = computePunctualityStreak(departureLogs);
  const checklistStats = getChecklistProgress(
    nextOccurrence?.occurrenceKey ?? null,
    extras.checklistLabels,
    extras.checklistDoneKeys,
  );
  const activeBufferMode = inferQuickBufferPreset(config.bufferKeterlambatanMenit);
  const activeShiftNote = nextOccurrence
    ? extras.shiftNotes[nextOccurrence.dateKey] ?? ''
    : '';

  return (
    <div className="space-y-6">
      {inlineNotice && (
        <StatusBanner
          tone="warning"
          title={`Pengingat Aktif: ${inlineNotice.title}`}
          message={inlineNotice.message}
          action={
            <>
              <button
                type="button"
                disabled={gpsChecking}
                onClick={() => onMarkDeparted(inlineNotice.occurrenceKey)}
                className="tk-cta-3d px-3.5 py-2 text-xs font-display font-bold uppercase tracking-wider text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] whitespace-nowrap disabled:opacity-60"
              >
                {gpsChecking ? 'Cek GPS...' : 'Sudah Berangkat'}
              </button>
              <button
                type="button"
                onClick={() => onDismissInlineNotice(inlineNotice.key)}
                className="tk-armor-cut-sm px-3.5 py-2 text-xs font-semibold text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] whitespace-nowrap transition-colors"
              >
                Tandai Dibaca
              </button>
            </>
          }
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Focal Card: RX-0 Banshee Command Deck */}
        <section
          aria-label="Ringkasan jadwal aktif berikutnya"
          className="tk-animate-card tk-stagger-1 lg:col-span-7 tk-card-elevated relative overflow-hidden"
        >
          <div className="tk-mecha-stripe w-full" aria-hidden="true" />
          <div className="p-5 sm:p-7 relative">
          {nextOccurrence && status && countdown ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--tk-accent-text)]">
                      {nextOccurrence.dateLabel}
                    </span>
                    <span aria-hidden="true" className="text-[var(--tk-text-subtle)]">
                      ·
                    </span>
                    <span className="text-[var(--tk-text-subtle)]">
                      {nextOccurrence.source === 'override'
                        ? 'Penyesuaian Khusus'
                        : 'Jadwal Rutin'}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
                    {currentWorkingShift && (
                      <>
                        <span
                          data-testid="working-now-badge"
                          className="inline-flex items-center gap-1.5 text-[var(--tk-success-text)]"
                        >
                          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            Sedang Jam Kerja · Selesai {currentWorkingShift.jamPulangStr}
                          </span>
                        </span>
                        <span aria-hidden="true" className="text-[var(--tk-text-subtle)]">
                          ·
                        </span>
                      </>
                    )}

                    <span
                      data-testid="streak-badge"
                      className="inline-flex items-center gap-1 text-[var(--tk-warning-text)]"
                    >
                      <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="font-mono tabular-nums">{streak.currentStreak}</span>{' '}
                      hari · {streak.levelTitle}
                    </span>

                    <span aria-hidden="true" className="text-[var(--tk-text-subtle)]">
                      ·
                    </span>

                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        status.tone === 'red'
                          ? 'text-[var(--tk-error-text)]'
                          : status.tone === 'amber'
                            ? 'text-[var(--tk-warning-text)]'
                            : 'text-[var(--tk-success-text)]'
                      }`}
                    >
                      {status.tone === 'red' ? (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      ) : status.tone === 'amber' ? (
                        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      )}
                      <span>{status.label}</span>
                    </div>
                  </div>

                  <h1 className="font-display mt-3 text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-[var(--tk-text)]">
                    {nextOccurrence.shiftName}
                  </h1>

                  {/* Primary Countdown Readout */}
                  <div className="mt-4">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--tk-text-subtle)]">
                      {countdown.isPast
                        ? 'Waktu melewati jam berangkat'
                        : 'Hitung mundur menuju jam berangkat'}
                    </p>
                    <div
                      data-testid="departure-countdown"
                      className={`mt-1.5 font-display tabular-nums text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold tracking-wide leading-tight ${
                        countdown.isPast
                          ? 'text-[var(--tk-error-text)]'
                          : 'text-[var(--tk-text)]'
                      }`}
                    >
                      {countdown.isPast
                        ? `+${countdown.compactLabel}`
                        : countdown.compactLabel}
                    </div>
                    <p className="mt-2 text-sm text-[var(--tk-text-muted)]">
                      Target berangkat pukul{' '}
                      <span className="font-mono tabular-nums font-semibold text-[var(--tk-text)]">
                        {nextOccurrence.jamBerangkatStr}
                      </span>{' '}
                      untuk masuk kerja pukul{' '}
                      <span className="font-mono tabular-nums font-semibold text-[var(--tk-text)]">
                        {nextOccurrence.jamMasukStr}
                      </span>
                      .
                    </p>
                  </div>
                </div>

                {/* RX-0 Banshee Reference Feed Window */}
                <BansheeMediaPanel className="w-full sm:w-44 md:w-48 h-32 sm:h-40 shrink-0" />
              </div>

              {/* 1-Tap Quick Traffic / Weather Buffer Adjuster + Auto-Adjust Telemetry */}
              <div className="mt-5 pt-4 border-t border-[var(--tk-border-subtle)] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <span className="text-xs font-semibold text-[var(--tk-text-muted)]">
                    Buffer Lalu Lintas &amp; Cuaca:
                  </span>
                  <div
                    role="group"
                    aria-label="Penyesuai cepat buffer jalan"
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    {QUICK_BUFFER_PRESETS.map(({ id, label, Icon }) => {
                      const isSelected = activeBufferMode === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onSelectQuickBuffer(id)}
                          aria-pressed={isSelected}
                          className={`tk-armor-cut-sm inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border transition-colors ${
                            isSelected
                              ? 'bg-[var(--tk-accent)] text-white border-[var(--tk-accent)]'
                              : 'bg-[var(--tk-surface)] text-[var(--tk-text-muted)] border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)]'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Weather & Traffic Auto-Adjust Banner */}
                <div
                  data-testid="dashboard-smart-commute-card"
                  className="rounded-[3px] bg-[var(--tk-surface-muted)] border border-[var(--tk-border-subtle)] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5"
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <Navigation
                      className="h-3.5 w-3.5 text-[var(--tk-accent-text)] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 text-xs">
                      {commuteSummary.isAutoAdjusted && liveCommute ? (
                        <>
                          <p className="font-semibold text-[var(--tk-text)]">
                            Penyesuaian Otomatis Aktif · {liveCommute.weatherDescription}
                            {liveCommute.temperatureCelsius !== null
                              ? ` (${liveCommute.temperatureCelsius}°C)`
                              : ''}
                          </p>
                          <p className="text-[11px] text-[var(--tk-text-muted)] mt-0.5">
                            {TRAVEL_MODE_LABELS[liveCommute.travelMode]} (
                            {formatDistanceLabel(liveCommute.distanceMeters)}):{' '}
                            {commuteSummary.adjustmentReasons.join(' · ')}
                          </p>
                          {liveCommute.hasBetaRouteWarning && (
                            <p className="text-[11px] text-[var(--tk-warning-text)] mt-0.5">
                              Catatan Beta: rute {TRAVEL_MODE_LABELS[liveCommute.travelMode].toLowerCase()} terkadang belum mencakup lajur khusus secara lengkap.
                            </p>
                          )}
                        </>
                      ) : extras.autoAdjustEnabled ? (
                        <>
                          <p className="font-semibold text-[var(--tk-text)]">
                            Penyesuaian Otomatis Menunggu Rute
                          </p>
                          <p className="text-[11px] text-[var(--tk-text-subtle)]">
                            Isi alamat asal &amp; tujuan di Pengaturan Profil untuk menghitung cuaca &amp; lalu lintas real-time.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-[var(--tk-text)]">
                            Penyesuaian Cuaca &amp; Lalu Lintas Real-Time
                          </p>
                          <p className="text-[11px] text-[var(--tk-text-subtle)]">
                            Aktifkan di Pengaturan Profil agar jam berangkat menyesuaikan macet &amp; cuaca secara otomatis.
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {extras.autoAdjustEnabled && liveCommute && (
                      <button
                        type="button"
                        data-testid="dashboard-refresh-commute-btn"
                        disabled={liveCommuteLoading}
                        onClick={onRefreshLiveCommute}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${liveCommuteLoading ? 'animate-spin' : ''}`}
                          aria-hidden="true"
                        />
                        Perbarui
                      </button>
                    )}
                    <button
                      type="button"
                      data-testid="dashboard-open-route-profile-btn"
                      onClick={onOpenAccount}
                      className="tk-armor-cut-sm px-2.5 py-1.5 text-[11px] font-semibold text-[var(--tk-accent-text)] bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] hover:opacity-90 whitespace-nowrap"
                    >
                      {extras.autoAdjustEnabled ? 'Ubah Rute' : 'Atur di Profil'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 3-Column Armored Timeline Deck separated by hairline dividers */}
              <div className="mt-5 pt-5 border-t border-[var(--tk-border)] grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--tk-border)]">
                <div className="pb-4 sm:pb-0 sm:pr-5">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--tk-text-subtle)]">
                    01 · Mulai Bersiap
                  </p>
                  <p className="mt-1 font-display tabular-nums text-xl sm:text-2xl font-extrabold text-[var(--tk-text)]">
                    {nextOccurrence.jamPersiapanStr}
                  </p>
                  <p className="mt-1 text-xs text-[var(--tk-text-subtle)]">
                    {config.durasiPersiapanMenit} menit sebelum berangkat
                  </p>
                </div>

                <div className="py-4 sm:py-0 sm:px-5">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--tk-text-subtle)]">
                    02 · Berangkat Maksimal
                  </p>
                  <p className="mt-1 font-display tabular-nums text-xl sm:text-2xl font-extrabold text-[var(--tk-accent-text)]">
                    {nextOccurrence.jamBerangkatStr}
                  </p>
                  <p className="mt-1 text-xs text-[var(--tk-text-subtle)]">
                    {config.durasiPerjalananMenit} mnt jalan +{' '}
                    {config.bufferKeterlambatanMenit} mnt buffer
                  </p>
                </div>

                <div className="pt-4 sm:pt-0 sm:pl-5">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--tk-text-subtle)]">
                    03 · Jam Masuk Kerja
                  </p>
                  <p className="mt-1 font-display tabular-nums text-xl sm:text-2xl font-extrabold text-[var(--tk-text)]">
                    {nextOccurrence.jamMasukStr}
                  </p>
                  <p className="mt-1 text-xs text-[var(--tk-text-subtle)]">
                    Perkiraan selesai pukul {nextOccurrence.jamPulangStr}
                    {nextOccurrence.isOvernight ? ' (+1 hari)' : ''}
                  </p>
                </div>
              </div>

              {/* Daily Shift Note */}
              <div className="mt-5 pt-4 border-t border-[var(--tk-border-subtle)]">
                <label
                  htmlFor="daily-shift-note"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[var(--tk-text-muted)]"
                >
                  <StickyNote className="h-3.5 w-3.5 text-[var(--tk-accent-text)]" aria-hidden="true" />
                  <span>Catatan Shift Tanggal {nextOccurrence.dateKey}</span>
                </label>
                <input
                  id="daily-shift-note"
                  type="text"
                  maxLength={200}
                  value={activeShiftNote}
                  onChange={(e) =>
                    onUpdateShiftNote(nextOccurrence.dateKey, e.target.value)
                  }
                  placeholder="Contoh: Bawa berkas presentasi, briefing jam 08:15, atau isi bensin..."
                  className={`mt-1.5 text-xs bg-[var(--tk-surface-muted)] ${tkInputClass}`}
                />
              </div>

              {/* Primary Workflow Controls */}
              <div className="mt-5 pt-5 border-t border-[var(--tk-border)] flex flex-wrap items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  data-testid="dashboard-mark-departed-btn"
                  disabled={gpsChecking}
                  onClick={() => onMarkDeparted(nextOccurrence.occurrenceKey)}
                  className="tk-cta-3d inline-flex items-center gap-2 px-4 py-2.5 text-xs font-display font-bold uppercase tracking-wider text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] whitespace-nowrap disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {gpsChecking ? 'Memeriksa Lokasi GPS...' : 'Sudah Berangkat'}
                </button>

                <button
                  type="button"
                  onClick={onTestAlarm}
                  className="tk-armor-cut-sm inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] transition-colors duration-150 whitespace-nowrap"
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  Uji Alarm
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onSetDateOverride(nextOccurrence.dateKey, 'libur')
                  }
                  className="tk-armor-cut-sm inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] transition-colors duration-150 whitespace-nowrap"
                >
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  Tandai Tanggal Ini Libur
                </button>

                <button
                  type="button"
                  data-testid="dashboard-zen-button"
                  onClick={onEnterZenMode}
                  className="tk-armor-cut-sm inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-[var(--tk-accent-text)] bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] hover:opacity-90 transition-opacity duration-150 whitespace-nowrap"
                >
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                  Mode Fokus Zen
                </button>
              </div>

              {testFeedback && (
                <p
                  role="status"
                  data-testid="dashboard-status-feedback"
                  className="tk-animate-notice mt-4 text-xs font-medium text-[var(--tk-accent-text)] bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] rounded-[3px] px-3.5 py-2.5 leading-relaxed"
                >
                  {testFeedback}
                </p>
              )}
            </>
          ) : (
            <EmptyState
              visual={<DimensionalEmptySchedule3D />}
              title="Belum Ada Jadwal Kerja Aktif"
              description="Seluruh hari dalam 14 hari ke depan sedang ditandai libur atau belum memiliki shift aktif. Atur jadwal mingguan atau shift khusus untuk mulai memantau waktu berangkat."
              action={
                <>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('schedule')}
                    className="tk-cta-3d px-5 py-2.5 text-xs font-display font-bold uppercase tracking-wider text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)]"
                  >
                    Atur Jadwal Kerja
                  </button>
                  <button
                    type="button"
                    data-testid="dashboard-zen-button"
                    onClick={onEnterZenMode}
                    className="tk-armor-cut-sm inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-[var(--tk-accent-text)] bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] hover:opacity-90 transition-opacity duration-150"
                  >
                    <Maximize2 className="h-4 w-4" aria-hidden="true" />
                    Mode Fokus Zen
                  </button>
                </>
              }
            />
          )}
          </div>
        </section>

        {/* Right Column: Embedded 3D Chronometer + Staged Reminders */}
        <div className="lg:col-span-5 space-y-6">
          <ThreeWorkspaceScene
            theme={theme}
            now={now}
            urgencyTone={status?.tone ?? 'neutral'}
            checklistPercent={checklistStats.percent}
            alarmActive={alarmActive}
            shiftTitle={nextOccurrence?.shiftName ?? 'Hari Off / Libur'}
            departTimeStr={nextOccurrence?.jamBerangkatStr ?? null}
            heightClassName="h-[250px] sm:h-[268px]"
            compactMode
            onOpenFullStudio={() => onNavigateTab('studio3d')}
          />

          <aside
            aria-label="Status notifikasi dan tahapan pengingat"
            className="tk-animate-card tk-stagger-3 tk-card tk-card-interactive p-6"
          >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold uppercase tracking-wider text-[var(--tk-text)]">
              Pengingat Bertahap
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('commute')}
              className="text-xs font-semibold text-[var(--tk-accent-text)] hover:underline whitespace-nowrap"
            >
              Ubah Pengaturan
            </button>
          </div>

          <div className="mt-4 pb-4 border-b border-[var(--tk-border)]">
            <div className="flex items-start gap-2.5">
              <Bell
                className="h-4 w-4 text-[var(--tk-text-subtle)] mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--tk-text)]">
                  {notificationPermission === 'granted'
                    ? 'Notifikasi browser aktif'
                    : notificationPermission === 'denied'
                      ? 'Notifikasi browser diblokir'
                      : notificationPermission === 'unsupported'
                        ? 'Browser tidak mendukung notifikasi'
                        : 'Izin notifikasi belum aktif'}
                </p>
                <p className="mt-0.5 text-xs text-[var(--tk-text-subtle)] leading-relaxed">
                  {notificationPermission === 'granted'
                    ? 'Pengingat muncul di layar perangkat saat tab terbuka.'
                    : 'Alarm audio & peringatan di dalam halaman tetap berjalan.'}
                </p>
              </div>
            </div>

            {notificationPermission === 'default' && (
              <button
                type="button"
                onClick={onRequestNotification}
                className="tk-armor-cut-sm mt-3 w-full px-3.5 py-2 text-xs font-semibold text-[var(--tk-accent-text)] bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] hover:opacity-90 transition-colors duration-150"
              >
                Aktifkan Notifikasi Browser
              </button>
            )}
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium text-[var(--tk-text-subtle)]">
              Rangkaian waktu ({totalCommuteMin} mnt total perjalanan &amp; buffer)
            </p>

            {milestones.length > 0 ? (
              <ul className="mt-3 divide-y divide-[var(--tk-border-subtle)]">
                {milestones.map((m) => (
                  <li
                    key={m.stageId}
                    className="py-2.5 flex items-baseline justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          m.enabled
                            ? 'text-[var(--tk-text)]'
                            : 'text-[var(--tk-text-subtle)] line-through opacity-60'
                        }`}
                      >
                        {m.label}
                      </p>
                      <p className="text-xs text-[var(--tk-text-subtle)]">
                        {m.enabled ? 'Aktif' : 'Nonaktif'}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums text-sm font-semibold text-[var(--tk-text)] shrink-0">
                      {m.triggerTimeStr}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--tk-text-subtle)]">
                Tahapan pengingat akan tampil saat ada jadwal kerja aktif.
              </p>
            )}
          </div>
        </aside>
        </div>
      </div>

      {/* Group 2: Interactive Preparation Checklist, Focus Timer & Audio Studio, AI Briefing */}
      <PreparationAndFocusGrid
        nextOccurrence={nextOccurrence}
        checklistItems={extras.checklistLabels}
        checklistDoneKeys={extras.checklistDoneKeys}
        checklistPercent={checklistStats.percent}
        onToggleChecklistItem={onToggleChecklistItem}
        onAddChecklistItem={onAddChecklistItem}
        onRemoveChecklistItem={onRemoveChecklistItem}
        focusWorkMinutes={extras.focusWorkMinutes}
        focusMode={focusMode}
        focusRunning={focusRunning}
        focusSecondsLeft={focusSecondsLeft}
        onToggleFocusRunning={onToggleFocusRunning}
        onResetFocusTimer={onResetFocusTimer}
        onSelectFocusPreset={onSelectFocusPreset}
        onEnterZenMode={onEnterZenMode}
        ambientPreset={extras.ambientPreset}
        onChangeAmbientPreset={onChangeAmbientPreset}
        travelMin={config.durasiPerjalananMenit}
        bufferMin={config.bufferKeterlambatanMenit}
        quickBufferPreset={activeBufferMode}
        streakCount={streak.currentStreak}
        activeShiftNote={activeShiftNote}
      />

      {/* Recharts Analytics Section */}
      <AnalyticsSection
        logs={departureLogs}
        upcomingWeek={upcomingWeek}
        theme={theme}
      />

      {/* 7-Day Upcoming Schedule Table */}
      <section
        aria-label="Jadwal 7 hari ke depan"
        className="tk-animate-card tk-stagger-5 tk-card overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[var(--tk-border)] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold uppercase tracking-wider text-[var(--tk-text)]">
              Jadwal 7 Hari Ke Depan
            </h2>
            <p className="text-xs text-[var(--tk-text-subtle)] mt-0.5">
              Ubah shift per tanggal secara fleksibel tanpa mengubah pola mingguan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-testid="dashboard-export-ics-button"
              onClick={() => {
                const { filename, eventCount } = onExportScheduleIcs();
                if (eventCount === 0) {
                  setIcsNotice(
                    'Belum ada jadwal shift aktif dalam 30 hari ke depan untuk diekspor.',
                  );
                } else {
                  setIcsNotice(
                    `${eventCount} jadwal shift (30 hari ke depan) diekspor ke ${filename}. Siap diimpor ke Google Calendar atau aplikasi kalender HP.`,
                  );
                }
              }}
              className="tk-armor-cut-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--tk-accent-text)] bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] hover:opacity-90 whitespace-nowrap"
            >
              <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Ekspor Jadwal .ics
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('schedule')}
              className="text-sm font-semibold text-[var(--tk-accent-text)] hover:underline whitespace-nowrap"
            >
              Kelola Pola Mingguan
            </button>
          </div>
        </div>

        {icsNotice && (
          <p
            role="status"
            className="tk-animate-notice px-6 py-2.5 text-xs font-medium text-[var(--tk-accent-text)] bg-[var(--tk-accent-soft)]/50 border-b border-[var(--tk-border)]"
          >
            {icsNotice}
          </p>
        )}

        {/* Mobile stacked list (no horizontal scroll on phones) */}
        <div className="md:hidden divide-y divide-[var(--tk-border-subtle)]">
          {upcomingWeek.map((day) => {
            const nonWorkLabel = getNonWorkCategoryLabel(
              day.kategoriStatus && day.kategoriStatus !== 'shift'
                ? day.kategoriStatus
                : 'off',
            );
            const currentSelectValue = day.hasOverride
              ? day.source === 'libur'
                ? `nonwork:${day.kategoriStatus && day.kategoriStatus !== 'shift' ? day.kategoriStatus : 'off'}`
                : shiftTemplates.find(
                    (s) =>
                      s.jamMasuk === day.occurrence?.jamMasukStr &&
                      s.nama === day.occurrence?.shiftName,
                  )?.id || 'rutin'
              : 'rutin';

            return (
              <div key={day.dateKey} className="px-4 py-3.5 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-[var(--tk-text)]">
                      {day.dayName}
                    </span>
                    <span className="text-xs text-[var(--tk-text-subtle)] ml-1.5">
                      {day.dateShort}
                      {day.isToday ? ' · Hari Ini' : ''}
                    </span>
                  </div>

                  {day.occurrence ? (
                    <span className="text-xs font-semibold text-[var(--tk-text)]">
                      {day.occurrence.shiftName}
                      {day.source === 'override' ? ' · Khusus' : ''}
                    </span>
                  ) : (
                    <span
                      className={`text-xs font-medium ${
                        day.kategoriStatus &&
                        day.kategoriStatus !== 'off' &&
                        day.kategoriStatus !== 'shift'
                          ? 'text-[var(--tk-warning-text)]'
                          : 'text-[var(--tk-text-subtle)]'
                      }`}
                    >
                      {day.overrideLabel
                        ? `${nonWorkLabel} (${day.overrideLabel})`
                        : nonWorkLabel}
                    </span>
                  )}
                </div>

                {day.occurrence && (
                  <p className="text-xs text-[var(--tk-text-muted)] font-mono tabular-nums">
                    Siap {day.occurrence.jamPersiapanStr} · Berangkat{' '}
                    <span className="font-semibold text-[var(--tk-text)]">
                      {day.occurrence.jamBerangkatStr}
                    </span>{' '}
                    · Masuk {day.occurrence.jamMasukStr}
                    {day.occurrence.isOvernight ? ' (+1)' : ''}
                  </p>
                )}

                <select
                  aria-label={`Penyesuaian mobile ${day.dayName} ${day.dateShort}`}
                  value={currentSelectValue}
                  onChange={(e) =>
                    onSetDateOverride(day.dateKey, e.target.value)
                  }
                  className={`text-xs font-medium ${tkSelectClass}`}
                >
                  <option value="rutin">Ikuti Pola Rutin</option>
                  <optgroup label="Jadwal Shift">
                    {shiftTemplates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.nama} ({tpl.jamMasuk})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Off &amp; Cuti">
                    <option value="nonwork:off">Off</option>
                    <option value="nonwork:cuti">Cuti</option>
                    <option value="nonwork:izin">Izin</option>
                    <option value="nonwork:sakit">Sakit</option>
                    <option value="nonwork:libur">Libur Nasional</option>
                  </optgroup>
                </select>
              </div>
            );
          })}
        </div>

        {/* Desktop 6-column table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--tk-border)] bg-[var(--tk-surface-muted)] text-xs font-semibold text-[var(--tk-text-muted)]">
                <th className="py-3 px-6">Hari &amp; Tanggal</th>
                <th className="py-3 px-4">Jadwal / Shift</th>
                <th className="py-3 px-4 text-right">Bersiap</th>
                <th className="py-3 px-4 text-right">Berangkat</th>
                <th className="py-3 px-4 text-right">Masuk</th>
                <th className="py-3 px-6 text-right">Penyesuaian Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--tk-border-subtle)] text-sm">
              {upcomingWeek.map((day) => {
                const nonWorkLabel = getNonWorkCategoryLabel(
                  day.kategoriStatus && day.kategoriStatus !== 'shift'
                    ? day.kategoriStatus
                    : 'off',
                );
                const currentSelectValue = day.hasOverride
                  ? day.source === 'libur'
                    ? `nonwork:${day.kategoriStatus && day.kategoriStatus !== 'shift' ? day.kategoriStatus : 'off'}`
                    : shiftTemplates.find(
                        (s) =>
                          s.jamMasuk === day.occurrence?.jamMasukStr &&
                          s.nama === day.occurrence?.shiftName,
                      )?.id || 'rutin'
                  : 'rutin';

                return (
                  <tr
                    key={day.dateKey}
                    className="hover:bg-[var(--tk-surface-hover)] transition-colors"
                  >
                    <td className="py-3 px-6 whitespace-nowrap">
                      <span className="font-semibold text-[var(--tk-text)]">
                        {day.dayName}
                      </span>
                      <span className="text-[var(--tk-text-subtle)] ml-2">
                        {day.dateShort}
                        {day.isToday ? ' · Hari Ini' : ''}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {day.occurrence ? (
                        <div>
                          <span className="font-medium text-[var(--tk-text)]">
                            {day.occurrence.shiftName}
                          </span>
                          {day.source === 'override' && (
                            <span className="ml-2 text-xs text-[var(--tk-accent-text)] font-medium">
                              · Khusus
                            </span>
                          )}
                        </div>
                      ) : (
                        <span
                          className={
                            day.kategoriStatus &&
                            day.kategoriStatus !== 'off' &&
                            day.kategoriStatus !== 'shift'
                              ? 'text-[var(--tk-warning-text)] font-medium'
                              : 'text-[var(--tk-text-subtle)]'
                          }
                        >
                          {day.overrideLabel
                            ? `${nonWorkLabel} (${day.overrideLabel})`
                            : nonWorkLabel}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[var(--tk-text-muted)]">
                      {day.occurrence ? day.occurrence.jamPersiapanStr : '—'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[var(--tk-text)]">
                      {day.occurrence ? day.occurrence.jamBerangkatStr : '—'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[var(--tk-text-muted)]">
                      {day.occurrence
                        ? `${day.occurrence.jamMasukStr}${day.occurrence.isOvernight ? ' (+1)' : ''}`
                        : '—'}
                    </td>

                    <td className="py-3 px-6 text-right">
                      <select
                        aria-label={`Penyesuaian jadwal ${day.dayName} ${day.dateShort}`}
                        value={currentSelectValue}
                        onChange={(e) =>
                          onSetDateOverride(day.dateKey, e.target.value)
                        }
                        className="px-2.5 py-1.5 text-xs font-medium bg-[var(--tk-surface)] border border-[var(--tk-border)] rounded-[2px] text-[var(--tk-text)] focus:outline-none focus:border-[var(--tk-accent)]"
                      >
                        <option value="rutin">Ikuti Pola Rutin</option>
                        <optgroup label="Jadwal Shift">
                          {shiftTemplates.map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>
                              {tpl.nama} ({tpl.jamMasuk})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Off &amp; Cuti">
                          <option value="nonwork:off">Off</option>
                          <option value="nonwork:cuti">Cuti</option>
                          <option value="nonwork:izin">Izin</option>
                          <option value="nonwork:sakit">Sakit</option>
                          <option value="nonwork:libur">Libur Nasional</option>
                        </optgroup>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
