import { useState, type FormEvent } from 'react';
import {
  CheckSquare,
  Headphones,
  Maximize2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  Timer,
  Trash2,
} from 'lucide-react';
import type {
  AmbientSoundPreset,
  ChecklistItemDef,
  ComputedOccurrence,
} from '../types/schedule';
import { getTimeOfDayMood } from '../utils/workspaceFeatures';
import { tkInputClass, tkSelectClass } from './ui/DesignSystem';

interface PreparationAndFocusGridProps {
  nextOccurrence: ComputedOccurrence | null;
  checklistItems: ChecklistItemDef[];
  checklistDoneKeys: string[];
  checklistPercent: number;
  onToggleChecklistItem: (itemId: string) => void;
  onAddChecklistItem: (label: string) => void;
  onRemoveChecklistItem: (itemId: string) => void;
  focusWorkMinutes: number;
  focusMode: 'work' | 'break';
  focusRunning: boolean;
  focusSecondsLeft: number;
  onToggleFocusRunning: () => void;
  onResetFocusTimer: () => void;
  onSelectFocusPreset: (workMin: number, breakMin: number) => void;
  onEnterZenMode: () => void;
  ambientPreset: AmbientSoundPreset;
  onChangeAmbientPreset: (preset: AmbientSoundPreset) => void;
  travelMin: number;
  bufferMin: number;
  quickBufferPreset: string;
  streakCount: number;
  activeShiftNote: string;
}

interface BriefingResponse {
  headline: string;
  checklistFocus: string;
  commuteAdvice: string;
  energyTip: string;
}

const AMBIENT_OPTIONS: Array<{ id: AmbientSoundPreset; label: string }> = [
  { id: 'off', label: 'Audio Mati' },
  { id: 'pagi_cerah', label: 'Harmoni Pagi' },
  { id: 'lofi_fokus', label: 'Lo-Fi Fokus' },
  { id: 'hujan_tenang', label: 'Hujan Tenang' },
  { id: 'white_noise', label: 'White Noise Kantor' },
];

export function PreparationAndFocusGrid({
  nextOccurrence,
  checklistItems,
  checklistDoneKeys,
  checklistPercent,
  onToggleChecklistItem,
  onAddChecklistItem,
  onRemoveChecklistItem,
  focusWorkMinutes,
  focusMode,
  focusRunning,
  focusSecondsLeft,
  onToggleFocusRunning,
  onResetFocusTimer,
  onSelectFocusPreset,
  onEnterZenMode,
  ambientPreset,
  onChangeAmbientPreset,
  travelMin,
  bufferMin,
  quickBufferPreset,
  streakCount,
  activeShiftNote,
}: PreparationAndFocusGridProps) {
  const [newTaskLabel, setNewTaskLabel] = useState('');

  const [briefing, setBriefing] = useState<BriefingResponse | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  const occKey = nextOccurrence?.occurrenceKey ?? 'default';
  const doneSet = new Set(checklistDoneKeys);

  const handleAddChecklist = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newTaskLabel.trim();
    if (!trimmed) {
      return;
    }
    onAddChecklistItem(trimmed);
    setNewTaskLabel('');
  };

  const handleGenerateBriefing = async () => {
    setBriefingLoading(true);
    setBriefingError(null);
    try {
      const doneCount = checklistItems.filter((item) =>
        doneSet.has(`${occKey}__${item.id}`),
      ).length;
      const res = await fetch('/api/coach/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftName: nextOccurrence?.shiftName ?? 'Jadwal Kerja',
          jamMasuk: nextOccurrence?.jamMasukStr ?? '08:00',
          jamBerangkat: nextOccurrence?.jamBerangkatStr ?? '07:15',
          travelMin,
          bufferMin,
          prepDoneCount: doneCount,
          prepTotalCount: checklistItems.length,
          streakCount,
          quickBufferPreset,
          shiftNote: activeShiftNote,
          timeOfDay: getTimeOfDayMood(new Date()).id,
        }),
      });
      const data = (await res.json()) as BriefingResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memuat briefing AI.');
      }
      setBriefing(data);
    } catch (err) {
      setBriefingError(
        err instanceof Error ? err.message : 'Gagal menghubungi asisten AI.',
      );
    } finally {
      setBriefingLoading(false);
    }
  };

  const mm = String(Math.floor(focusSecondsLeft / 60)).padStart(2, '0');
  const ss = String(focusSecondsLeft % 60).padStart(2, '0');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* 1. Interactive Morning Preparation Checklist */}
      <section
        aria-label="Checklist persiapan kerja interaktif"
        className="tk-animate-card tk-stagger-2 lg:col-span-4 tk-card tk-card-interactive p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="tk-3d-badge flex h-9 w-9 items-center justify-center bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] text-[var(--tk-accent-text)] shrink-0">
              <CheckSquare className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-[var(--tk-text)]">
                Checklist Persiapan
              </h2>
              <p className="text-xs text-[var(--tk-text-subtle)] mt-0.5">
                Terhubung ke suar optik RX-0 Banshee 3D.
              </p>
            </div>
          </div>
          <span className="font-mono tabular-nums text-xs font-bold text-[var(--tk-accent-text)]">
            {checklistPercent}%
          </span>
        </div>

        <div className="h-1.5 w-full rounded-[1px] bg-[var(--tk-surface-muted)] overflow-hidden">
          <div
            className="h-full bg-[var(--tk-accent)] transition-all duration-300"
            style={{ width: `${checklistPercent}%` }}
          />
        </div>

        <ul className="divide-y divide-[var(--tk-border-subtle)] max-h-60 overflow-y-auto pr-1">
          {checklistItems.map((item) => {
            const fullKey = `${occKey}__${item.id}`;
            const checked = doneSet.has(fullKey);
            return (
              <li
                key={item.id}
                className="py-2.5 flex items-center justify-between gap-2"
              >
                <button
                  type="button"
                  onClick={() => onToggleChecklistItem(item.id)}
                  aria-pressed={checked}
                  className="flex items-center gap-2.5 text-left min-w-0 flex-1"
                >
                  {checked ? (
                    <CheckSquare
                      className="h-4 w-4 text-[var(--tk-accent-text)] shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <Square
                      className="h-4 w-4 text-[var(--tk-text-subtle)] shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`text-xs font-medium leading-snug ${
                      checked
                        ? 'line-through text-[var(--tk-text-subtle)]'
                        : 'text-[var(--tk-text)]'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
                {checklistItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveChecklistItem(item.id)}
                    aria-label={`Hapus item ${item.label}`}
                    className="p-1 text-[var(--tk-text-subtle)] hover:text-[var(--tk-error-text)] rounded transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <form onSubmit={handleAddChecklist} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            maxLength={60}
            value={newTaskLabel}
            onChange={(e) => setNewTaskLabel(e.target.value)}
            placeholder="Tambah checklist (mis. Bawa payung)"
            aria-label="Tambah item checklist persiapan"
            className={`flex-1 min-w-0 text-xs ${tkInputClass}`}
          />
          <button
            type="submit"
            disabled={!newTaskLabel.trim() || checklistItems.length >= 15}
            aria-label="Tambahkan checklist"
            className="tk-cta-3d p-2 text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] disabled:opacity-40 shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </section>

      {/* 2. Work Focus Sprint Timer & Web Audio Focus Soundscape Studio */}
      <section
        aria-label="Mode fokus kerja dan audio ambient"
        className="tk-animate-card tk-stagger-3 lg:col-span-4 tk-card tk-card-interactive p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="tk-3d-badge flex h-9 w-9 items-center justify-center bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] text-[var(--tk-accent-text)] shrink-0">
              <Timer className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-[var(--tk-text)]">
                Mode Fokus &amp; Audio
              </h2>
              <p className="text-xs text-[var(--tk-text-subtle)] mt-0.5">
                Timer produktivitas &amp; suara latar.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[3px] p-4 bg-[var(--tk-surface-muted)] border border-[var(--tk-border)] flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--tk-text-subtle)]">
              {focusMode === 'work' ? 'Sesi Fokus Kerja' : 'Waktu Istirahat'}
            </p>
            <p
              data-testid="focus-timer-display"
              className="font-display tabular-nums text-2xl sm:text-3xl font-extrabold text-[var(--tk-text)] mt-0.5"
            >
              {mm}:{ss}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleFocusRunning}
              aria-label={focusRunning ? 'Jeda timer fokus' : 'Mulai timer fokus'}
              className="tk-cta-3d inline-flex items-center gap-1.5 px-3 py-2 text-xs font-display font-bold uppercase tracking-wider text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)]"
            >
              {focusRunning ? (
                <>
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Jeda</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Mulai</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onResetFocusTimer}
              aria-label="Reset timer fokus"
              className="tk-armor-cut-sm p-2 text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectFocusPreset(25, 5)}
              className={`tk-armor-cut-sm px-2.5 py-1.5 border font-medium ${
                focusWorkMinutes === 25
                  ? 'bg-[var(--tk-accent-soft)] border-[var(--tk-accent)] text-[var(--tk-accent-text)]'
                  : 'border-[var(--tk-border)] text-[var(--tk-text-muted)]'
              }`}
            >
              25 / 5 mnt
            </button>
            <button
              type="button"
              onClick={() => onSelectFocusPreset(50, 10)}
              className={`tk-armor-cut-sm px-2.5 py-1.5 border font-medium ${
                focusWorkMinutes === 50
                  ? 'bg-[var(--tk-accent-soft)] border-[var(--tk-accent)] text-[var(--tk-accent-text)]'
                  : 'border-[var(--tk-border)] text-[var(--tk-text-muted)]'
              }`}
            >
              50 / 10 mnt
            </button>
          </div>

          <button
            type="button"
            data-testid="enter-zen-button"
            onClick={onEnterZenMode}
            className="tk-armor-cut-sm inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--tk-accent-border)] bg-[var(--tk-accent-soft)] text-[var(--tk-accent-text)] font-semibold hover:opacity-90 transition-opacity"
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Mode Fokus Zen</span>
          </button>
        </div>

        <div className="pt-3 border-t border-[var(--tk-border-subtle)] space-y-2">
          <label
            htmlFor="ambient-preset-select"
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--tk-text-muted)]"
          >
            <Headphones className="h-3.5 w-3.5 text-[var(--tk-accent-text)]" aria-hidden="true" />
            <span>Studio Audio Latar (Web Audio)</span>
          </label>
          <select
            id="ambient-preset-select"
            value={ambientPreset}
            onChange={(e) =>
              onChangeAmbientPreset(e.target.value as AmbientSoundPreset)
            }
            className={`text-xs font-medium ${tkSelectClass}`}
          >
            {AMBIENT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* 3. Smart Departure Strategy Assistant (Server-Side Gemini 4 Hydrogen) */}
      <section
        aria-label="Asisten strategi berangkat AI"
        className="tk-animate-card tk-stagger-4 lg:col-span-4 tk-card tk-card-interactive p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="tk-3d-badge flex h-9 w-9 items-center justify-center bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] text-[var(--tk-accent-text)] shrink-0">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-[var(--tk-text)]">
                Strategi Berangkat
              </h2>
              <p className="text-xs text-[var(--tk-text-subtle)] mt-0.5">
                Rekomendasi shift, buffer jalan, &amp; catatan.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleGenerateBriefing()}
          disabled={briefingLoading}
          className="tk-cta-3d w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-display font-bold uppercase tracking-wider text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] disabled:opacity-60"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {briefingLoading
            ? 'Menyusun Strategi...'
            : 'Buat Briefing Keberangkatan AI'}
        </button>

        {briefingError && (
          <p
            role="status"
            className="tk-animate-notice text-xs font-medium text-[var(--tk-warning-text)] bg-[var(--tk-warning-soft)] border border-[var(--tk-warning-border)] rounded-[3px] px-3 py-2.5 leading-relaxed"
          >
            {briefingError}
          </p>
        )}

        {briefing ? (
          <div className="tk-animate-notice space-y-2.5 text-xs">
            <p className="font-bold text-[var(--tk-text)]">{briefing.headline}</p>
            <div className="rounded-[3px] bg-[var(--tk-surface-muted)] p-3 space-y-1.5 text-[var(--tk-text-muted)]">
              <p>
                <span className="font-semibold text-[var(--tk-text)]">Persiapan: </span>
                {briefing.checklistFocus}
              </p>
              <p>
                <span className="font-semibold text-[var(--tk-text)]">Perjalanan: </span>
                {briefing.commuteAdvice}
              </p>
              <p>
                <span className="font-semibold text-[var(--tk-text)]">Energi Kerja: </span>
                {briefing.energyTip}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-[3px] bg-[var(--tk-surface-muted)] border border-[var(--tk-border-subtle)] p-3.5 text-xs text-[var(--tk-text-muted)] space-y-1.5">
            <p className="font-semibold text-[var(--tk-text)]">
              Ringkasan Kesiapan Saat Ini
            </p>
            <p>
              • Shift target:{' '}
              <span className="font-semibold text-[var(--tk-text)]">
                {nextOccurrence ? `${nextOccurrence.shiftName} (${nextOccurrence.jamMasukStr})` : 'Belum ada shift'}
              </span>
            </p>
            <p>
              • Buffer rute: <span className="font-mono tabular-nums">{travelMin + bufferMin} mnt</span>{' '}
              ({quickBufferPreset})
            </p>
            <p>
              • Streak disiplin: <span className="font-mono tabular-nums">{streakCount} hari beruntun</span>
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
