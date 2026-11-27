import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Headphones,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  StickyNote,
} from 'lucide-react';
import type {
  ActiveAlert,
  AmbientSoundPreset,
  ComputedOccurrence,
  EffectiveCommuteSummary,
  LiveCommuteConditions,
} from '../types/schedule';
import { formatCountdown, getCountdownStatus } from '../utils/scheduleEngine';

interface ZenFocusOverlayProps {
  now: Date;
  currentWorkingShift: ComputedOccurrence | null;
  nextOccurrence: ComputedOccurrence | null;
  inlineNotice: ActiveAlert | null;
  activeShiftNote: string;
  focusMode: 'work' | 'break';
  focusRunning: boolean;
  focusSecondsLeft: number;
  focusWorkMinutes: number;
  ambientPreset: AmbientSoundPreset;
  onToggleFocusRunning: () => void;
  onResetFocusTimer: () => void;
  onSelectFocusPreset: (workMin: number, breakMin: number) => void;
  onChangeAmbientPreset: (preset: AmbientSoundPreset) => void;
  onMarkDeparted: (occurrenceKey: string) => void;
  onDismissInlineNotice: (alertKey: string) => void;
  onExitZenMode: () => void;
  commuteSummary?: EffectiveCommuteSummary;
  liveCommute?: LiveCommuteConditions | null;
  gpsChecking?: boolean;
}

const AMBIENT_OPTIONS: Array<{ id: AmbientSoundPreset; label: string }> = [
  { id: 'off', label: 'Audio Mati' },
  { id: 'pagi_cerah', label: 'Harmoni Pagi' },
  { id: 'lofi_fokus', label: 'Lo-Fi Fokus' },
  { id: 'hujan_tenang', label: 'Hujan Tenang' },
  { id: 'white_noise', label: 'White Noise Kantor' },
];

export function ZenFocusOverlay({
  now,
  currentWorkingShift,
  nextOccurrence,
  inlineNotice,
  activeShiftNote,
  focusMode,
  focusRunning,
  focusSecondsLeft,
  focusWorkMinutes,
  ambientPreset,
  onToggleFocusRunning,
  onResetFocusTimer,
  onSelectFocusPreset,
  onChangeAmbientPreset,
  onMarkDeparted,
  onDismissInlineNotice,
  onExitZenMode,
  commuteSummary,
  liveCommute,
  gpsChecking = false,
}: ZenFocusOverlayProps) {
  const mm = String(Math.floor(focusSecondsLeft / 60)).padStart(2, '0');
  const ss = String(focusSecondsLeft % 60).padStart(2, '0');

  const workCountdown = currentWorkingShift
    ? formatCountdown(currentWorkingShift.workEndAt.getTime(), now.getTime())
    : null;

  const workProgressPercent = currentWorkingShift
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((now.getTime() - currentWorkingShift.checkInAt.getTime()) /
              Math.max(
                1,
                currentWorkingShift.workEndAt.getTime() -
                  currentWorkingShift.checkInAt.getTime(),
              )) *
              100,
          ),
        ),
      )
    : 0;

  const nextStatus = nextOccurrence ? getCountdownStatus(now, nextOccurrence) : null;
  const departCountdown = nextOccurrence
    ? formatCountdown(nextOccurrence.departAt.getTime(), now.getTime())
    : null;

  const showUrgentStatusNotice =
    !inlineNotice &&
    !currentWorkingShift &&
    nextOccurrence &&
    nextStatus &&
    (nextStatus.tone === 'amber' || nextStatus.tone === 'red');

  return (
    <div
      data-testid="zen-focus-overlay"
      role="region"
      aria-label="Mode Fokus Zen"
      className="tk-animate-fade relative z-10 min-h-screen flex flex-col justify-between px-4 sm:px-8 py-5 sm:py-7 max-w-4xl w-full mx-auto"
    >
      {/* Top Minimal Control Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tk-glass inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] font-display text-xs font-bold uppercase tracking-wider text-[var(--tk-text)]">
            <Sparkles
              className="h-3.5 w-3.5 text-[var(--tk-accent-text)]"
              aria-hidden="true"
            />
            Mode Fokus Zen
          </span>

          <span
            data-testid="zen-work-status-pill"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-xs font-semibold border ${
              currentWorkingShift
                ? 'bg-[var(--tk-success-soft)] text-[var(--tk-success-text)] border-[var(--tk-success-border)]'
                : 'bg-[var(--tk-surface)] text-[var(--tk-text-muted)] border-[var(--tk-border)]'
            }`}
          >
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {currentWorkingShift
                ? `Sedang Jam Kerja · ${currentWorkingShift.shiftName}`
                : nextOccurrence
                  ? `Menuju ${nextOccurrence.shiftName}`
                  : 'Fokus Mandiri'}
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[3px] bg-[var(--tk-surface)] border border-[var(--tk-border)] text-xs text-[var(--tk-text)]">
            <Headphones
              className="h-3.5 w-3.5 text-[var(--tk-accent-text)] shrink-0"
              aria-hidden="true"
            />
            <select
              aria-label="Audio latar Mode Fokus Zen"
              value={ambientPreset}
              onChange={(e) =>
                onChangeAmbientPreset(e.target.value as AmbientSoundPreset)
              }
              className="bg-transparent text-xs font-medium text-[var(--tk-text)] focus:outline-none"
            >
              {AMBIENT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            data-testid="exit-zen-button"
            onClick={onExitZenMode}
            className="tk-armor-cut-sm inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[var(--tk-text)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] transition-colors whitespace-nowrap"
          >
            <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Keluar Mode Zen</span>
            <span className="hidden sm:inline text-[10px] font-mono text-[var(--tk-text-subtle)] ml-1">
              (Esc)
            </span>
          </button>
        </div>
      </header>

      {/* Center Minimal Stack: Important Notifications + Countdown Timers */}
      <main className="my-auto py-6 space-y-5">
        {/* Important Notifications Slot */}
        {inlineNotice && (
          <div
            data-testid="zen-important-notice"
            role="status"
            className="tk-animate-notice bg-[var(--tk-warning-soft)] border border-[var(--tk-warning-border)] rounded-[3px] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs"
          >
            <div className="flex items-start gap-3 min-w-0">
              <AlertTriangle
                className="h-5 w-5 text-[var(--tk-warning-text)] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-[var(--tk-text)]">
                  Notifikasi Penting: {inlineNotice.title}
                </p>
                <p className="text-xs text-[var(--tk-text-muted)] mt-0.5">
                  {inlineNotice.message}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={gpsChecking}
                onClick={() => onMarkDeparted(inlineNotice.occurrenceKey)}
                className="tk-cta-3d tk-armor-cut-sm px-3.5 py-2 text-xs font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px] whitespace-nowrap disabled:opacity-60"
              >
                {gpsChecking ? 'Cek GPS...' : 'Sudah Berangkat'}
              </button>
              <button
                type="button"
                onClick={() => onDismissInlineNotice(inlineNotice.key)}
                className="tk-armor-cut-sm px-3.5 py-2 text-xs font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] whitespace-nowrap transition-colors"
              >
                Tandai Dibaca
              </button>
            </div>
          </div>
        )}

        {showUrgentStatusNotice && nextOccurrence && nextStatus && (
          <div
            data-testid="zen-important-notice"
            role="status"
            className={`tk-animate-notice rounded-[3px] p-4 sm:p-5 border flex flex-wrap items-center justify-between gap-4 shadow-xs ${
              nextStatus.tone === 'red'
                ? 'bg-[var(--tk-error-soft)] border-[var(--tk-error-border)]'
                : 'bg-[var(--tk-warning-soft)] border-[var(--tk-warning-border)]'
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <AlertTriangle
                className={`h-5 w-5 shrink-0 mt-0.5 ${
                  nextStatus.tone === 'red'
                    ? 'text-[var(--tk-error-text)]'
                    : 'text-[var(--tk-warning-text)]'
                }`}
                aria-hidden="true"
              />
              <div>
                <p className="font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-[var(--tk-text)]">
                  Notifikasi Penting: {nextStatus.label}
                </p>
                <p className="text-xs text-[var(--tk-text-muted)] mt-0.5">
                  {nextOccurrence.shiftName} · Target berangkat pukul{' '}
                  {nextOccurrence.jamBerangkatStr}, masuk pukul{' '}
                  {nextOccurrence.jamMasukStr}.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={gpsChecking}
              onClick={() => onMarkDeparted(nextOccurrence.occurrenceKey)}
              className="tk-cta-3d tk-armor-cut-sm inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px] whitespace-nowrap disabled:opacity-60"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {gpsChecking ? 'Cek GPS...' : 'Sudah Berangkat'}
            </button>
          </div>
        )}

        {/* Primary Hero Focus Session Countdown */}
        <section
          aria-label="Timer hitung mundur fokus"
          className="tk-animate-card tk-stagger-1 tk-card-elevated rounded-[3px] p-6 sm:p-10 text-center space-y-6"
        >
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-widest text-[var(--tk-accent-text)]">
              {focusMode === 'work' ? 'Sesi Fokus Kerja' : 'Waktu Istirahat Singkat'}
            </p>
            <div
              data-testid="zen-focus-timer"
              className="mt-3 font-display tabular-nums text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight text-[var(--tk-text)]"
            >
              {mm}:{ss}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              data-testid="zen-focus-toggle"
              onClick={onToggleFocusRunning}
              className="tk-cta-3d tk-armor-cut-sm inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px]"
            >
              {focusRunning ? (
                <>
                  <Pause className="h-4 w-4" aria-hidden="true" />
                  <span>Jeda Timer</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  <span>Mulai Fokus</span>
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="zen-focus-reset"
              onClick={onResetFocusTimer}
              className="tk-armor-cut-sm inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface-muted)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] transition-colors"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => onSelectFocusPreset(25, 5)}
              className={`tk-armor-cut-sm px-3 py-1.5 rounded-[2px] border font-medium transition-colors ${
                focusWorkMinutes === 25
                  ? 'bg-[var(--tk-accent-soft)] border-[var(--tk-accent)] text-[var(--tk-accent-text)]'
                  : 'border-[var(--tk-border)] text-[var(--tk-text-muted)] hover:bg-[var(--tk-surface-hover)]'
              }`}
            >
              25 / 5 mnt
            </button>
            <button
              type="button"
              onClick={() => onSelectFocusPreset(50, 10)}
              className={`tk-armor-cut-sm px-3 py-1.5 rounded-[2px] border font-medium transition-colors ${
                focusWorkMinutes === 50
                  ? 'bg-[var(--tk-accent-soft)] border-[var(--tk-accent)] text-[var(--tk-accent-text)]'
                  : 'border-[var(--tk-border)] text-[var(--tk-text-muted)] hover:bg-[var(--tk-surface-hover)]'
              }`}
            >
              50 / 10 mnt
            </button>
          </div>
        </section>

        {/* Secondary Countdown: Active Shift End or Next Departure */}
        <section
          data-testid="zen-shift-countdown"
          aria-label="Hitung mundur jadwal shift"
          className="tk-animate-card tk-stagger-2 tk-card rounded-[3px] p-5 sm:p-6 space-y-3"
        >
          {currentWorkingShift && workCountdown ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--tk-success-text)]">
                    Sisa Waktu Shift Kerja Berlangsung
                  </p>
                  <p className="mt-1 font-display text-sm sm:text-base font-bold uppercase tracking-wide text-[var(--tk-text)]">
                    {currentWorkingShift.shiftName}
                  </p>
                  <p className="text-xs text-[var(--tk-text-muted)] mt-0.5">
                    Masuk pukul{' '}
                    <span className="font-mono tabular-nums font-semibold">
                      {currentWorkingShift.jamMasukStr}
                    </span>{' '}
                    · Selesai pukul{' '}
                    <span className="font-mono tabular-nums font-semibold">
                      {currentWorkingShift.jamPulangStr}
                      {currentWorkingShift.isOvernight ? ' (+1 hari)' : ''}
                    </span>
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="font-display tabular-nums text-2xl sm:text-3xl font-bold text-[var(--tk-text)]">
                    {workCountdown.compactLabel}
                  </p>
                  <p className="text-[11px] text-[var(--tk-text-subtle)]">
                    {workProgressPercent}% waktu shift berjalan
                  </p>
                </div>
              </div>

              <div className="h-1.5 w-full rounded-[1px] bg-[var(--tk-surface-muted)] overflow-hidden">
                <div
                  className="h-full bg-[var(--tk-success)] transition-all duration-500"
                  style={{ width: `${workProgressPercent}%` }}
                />
              </div>
            </>
          ) : nextOccurrence && departCountdown ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--tk-text-subtle)]">
                  {departCountdown.isPast
                    ? 'Waktu Melewati Jam Berangkat'
                    : 'Hitung Mundur Jam Berangkat'}
                </p>
                <p className="mt-1 font-display text-sm sm:text-base font-bold uppercase tracking-wide text-[var(--tk-text)]">
                  {nextOccurrence.shiftName}
                </p>
                <p className="text-xs text-[var(--tk-text-muted)] mt-0.5">
                  Berangkat{' '}
                  <span className="font-mono tabular-nums font-semibold">
                    {nextOccurrence.jamBerangkatStr}
                  </span>{' '}
                  · Masuk{' '}
                  <span className="font-mono tabular-nums font-semibold">
                    {nextOccurrence.jamMasukStr}
                  </span>
                  {commuteSummary?.isAutoAdjusted && liveCommute
                    ? ` · Otomatis (${liveCommute.weatherDescription}, ${liveCommute.liveTravelMinutes} mnt)`
                    : ''}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`font-display tabular-nums text-2xl sm:text-3xl font-bold ${
                    departCountdown.isPast
                      ? 'text-[var(--tk-error-text)]'
                      : 'text-[var(--tk-text)]'
                  }`}
                >
                  {departCountdown.isPast
                    ? `+${departCountdown.compactLabel}`
                    : departCountdown.compactLabel}
                </span>

                <button
                  type="button"
                  disabled={gpsChecking}
                  onClick={() => onMarkDeparted(nextOccurrence.occurrenceKey)}
                  className="tk-cta-3d tk-armor-cut-sm px-3.5 py-2 text-xs font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px] whitespace-nowrap disabled:opacity-60"
                >
                  {gpsChecking ? 'Cek GPS...' : 'Sudah Berangkat'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--tk-text-muted)] text-center">
              Tidak ada shift terjadwal saat ini. Gunakan timer fokus di atas untuk sesi kerja mandiri.
            </p>
          )}

          {activeShiftNote.trim().length > 0 && (
            <div className="pt-3 border-t border-[var(--tk-border-subtle)] flex items-center gap-2 text-xs text-[var(--tk-text-muted)]">
              <StickyNote
                className="h-3.5 w-3.5 text-[var(--tk-accent-text)] shrink-0"
                aria-hidden="true"
              />
              <span className="truncate">Catatan Shift: {activeShiftNote}</span>
            </div>
          )}
        </section>
      </main>

      {/* Subtle Bottom Hint */}
      <footer className="text-center text-[11px] text-[var(--tk-text-subtle)]">
        Semua elemen non-esensial disembunyikan agar Anda fokus penuh. Tekan{' '}
        <span className="font-mono font-semibold text-[var(--tk-text-muted)]">
          Esc
        </span>{' '}
        untuk kembali ke ruang kerja.
      </footer>
    </div>
  );
}
