import { CalendarCheck, CheckCircle2, Flame } from 'lucide-react';
import type { ComputedOccurrence } from '../types/schedule';
import { getCountdownStatus } from '../utils/scheduleEngine';
import {
  getThemePresetById,
  type ColorMode,
  type ThemePresetId,
  type ThemeSettings,
} from '../utils/theme';
import { BansheeMediaPanel } from './Creative3DAccents';
import { ThreeWorkspaceScene } from './ThreeWorkspaceScene';

interface Studio3DViewProps {
  theme: ThemeSettings;
  now: Date;
  nextOccurrence: ComputedOccurrence | null;
  checklistPercent: number;
  alarmActive: boolean;
  streakCount: number;
  onChangeColorMode?: (mode: ColorMode) => void;
  onChangePreset?: (presetId: ThemePresetId) => void;
}

export function Studio3DView({
  theme,
  now,
  nextOccurrence,
  checklistPercent,
  alarmActive,
  streakCount,
}: Studio3DViewProps) {
  const status = nextOccurrence ? getCountdownStatus(now, nextOccurrence) : null;
  const activePreset = getThemePresetById(theme.presetId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-wider text-[var(--tk-text)]">
            Hangar Unit RX-0[N] Banshee 3D
          </h1>
          <p className="text-sm text-[var(--tk-text-muted)] mt-1">
            Visualisasi robot Gundam 3D interaktif yang mengikuti warna armor pilihan, waktu malam otomatis, kesiapan checklist, dan urgensi jadwal.
          </p>
        </div>

        <span className="tk-3d-badge inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[var(--tk-surface)] border border-[var(--tk-border)] text-[var(--tk-text)]">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-[1px] shadow-xs"
            style={{ backgroundColor: activePreset.swatchHex }}
          />
          <span>
            {activePreset.name} · {theme.colorMode === 'dark' ? 'Gelap' : 'Terang'}
          </span>
        </span>
      </div>

      <ThreeWorkspaceScene
        theme={theme}
        now={now}
        urgencyTone={status?.tone ?? 'neutral'}
        checklistPercent={checklistPercent}
        alarmActive={alarmActive}
        shiftTitle={nextOccurrence?.shiftName ?? 'Belum Ada Shift Aktif'}
        departTimeStr={nextOccurrence?.jamBerangkatStr ?? null}
        heightClassName="h-[400px] sm:h-[520px]"
        compactMode={false}
      />

      {/* Connected 3D Telemetry Summary Strip + Reference Video Feed */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        <div className="md:col-span-3 tk-animate-card tk-stagger-1">
          <BansheeMediaPanel className="h-36 md:h-full min-h-[112px] w-full" />
        </div>

        <div className="md:col-span-3 tk-animate-card tk-stagger-1 tk-card tk-card-interactive p-4 sm:p-5 flex items-center gap-3.5">
          <div className="tk-3d-badge h-10 w-10 bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] text-[var(--tk-accent-text)] flex items-center justify-center shrink-0">
            <CalendarCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--tk-text-subtle)]">Target Jadwal</p>
            <p className="font-display text-xs sm:text-sm font-bold text-[var(--tk-text)] leading-snug mt-0.5">
              {nextOccurrence ? nextOccurrence.shiftName : 'Hari Libur / Off'}
            </p>
            {nextOccurrence && (
              <p className="text-[11px] font-mono tabular-nums text-[var(--tk-accent-text)] mt-0.5">
                Masuk {nextOccurrence.jamMasukStr} · Berangkat {nextOccurrence.jamBerangkatStr}
              </p>
            )}
          </div>
        </div>

        <div className="md:col-span-3 tk-animate-card tk-stagger-2 tk-card tk-card-interactive p-4 sm:p-5 flex items-center gap-3.5">
          <div className="tk-3d-badge h-10 w-10 bg-[var(--tk-success-soft)] border border-[var(--tk-success-border)] text-[var(--tk-success-text)] flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--tk-text-subtle)]">Kesiapan Suar 3D</p>
            <p className="text-sm font-bold text-[var(--tk-text)] font-mono tabular-nums mt-0.5">
              {checklistPercent}% Checklist Selesai
            </p>
          </div>
        </div>

        <div className="md:col-span-3 tk-animate-card tk-stagger-3 tk-card tk-card-interactive p-4 sm:p-5 flex items-center gap-3.5">
          <div className="tk-3d-badge h-10 w-10 bg-[var(--tk-warning-soft)] border border-[var(--tk-warning-border)] text-[var(--tk-warning-text)] flex items-center justify-center shrink-0">
            <Flame className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--tk-text-subtle)]">Streak Tepat Waktu</p>
            <p className="text-sm font-bold text-[var(--tk-text)] font-mono tabular-nums mt-0.5">
              {streakCount} Hari Beruntun
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
