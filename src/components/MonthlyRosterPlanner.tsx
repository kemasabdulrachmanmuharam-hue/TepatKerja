import { useMemo, useState, type FormEvent } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Eraser,
  LayoutGrid,
  List,
  Paintbrush,
  Sparkles,
} from 'lucide-react';
import {
  computeMonthlyRosterSummary,
  formatMonthYearIndonesian,
  generateCustomCycleOverrides,
  generateMonthlyRotationOverrides,
  getDayName,
  getMonthlyCalendarGrid,
  getNonWorkCategoryLabel,
  type MonthlyRotationPattern,
} from '../utils/scheduleEngine';
import { downloadMonthlyIcs } from '../utils/workspaceFeatures';
import type {
  DateOverride,
  MonthlyCalendarDay,
  NonWorkCategory,
  TepatKerjaState,
} from '../types/schedule';
import { tkInputClass, tkSelectClass } from './ui/DesignSystem';

interface MonthlyRosterPlannerProps {
  state: TepatKerjaState;
  shiftNotes?: Record<string, string>;
  initialViewMode?: 'calendar' | 'list';
  onUpsertDateOverride: (override: DateOverride) => void;
  onRemoveDateOverride: (dateKey: string) => void;
  onApplyMonthOverrides: (
    year: number,
    monthIndex: number,
    overrides: DateOverride[],
  ) => void;
  onClearMonthOverrides: (year: number, monthIndex: number) => void;
}

type BrushMode =
  | { kind: 'inspect' }
  | { kind: 'rutin' }
  | { kind: 'shift'; shiftId: string; label: string }
  | { kind: 'nonwork'; category: NonWorkCategory; label: string };

const WEEKDAY_HEADERS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const;

const NON_WORK_OPTIONS: Array<{ value: NonWorkCategory; label: string }> = [
  { value: 'off', label: 'Off / Libur Rutin' },
  { value: 'cuti', label: 'Cuti' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'libur', label: 'Libur Nasional' },
];

export function MonthlyRosterPlanner({
  state,
  shiftNotes = {},
  initialViewMode = 'list',
  onUpsertDateOverride,
  onRemoveDateOverride,
  onApplyMonthOverrides,
  onClearMonthOverrides,
}: MonthlyRosterPlannerProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>(initialViewMode);
  const [brush, setBrush] = useState<BrushMode>({ kind: 'inspect' });
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // Detail inspector form states
  const [detailType, setDetailType] = useState<'rutin' | 'shift' | NonWorkCategory>('shift');
  const [detailShiftId, setDetailShiftId] = useState(
    state.shiftTemplates[0]?.id ?? '',
  );
  const [detailCustomTime, setDetailCustomTime] = useState('');
  const [detailLabel, setDetailLabel] = useState('');

  // Auto-rotation controls
  const [rotationPattern, setRotationPattern] =
    useState<MonthlyRotationPattern>('fixed_5_2');
  const [rotationShiftId, setRotationShiftId] = useState(
    state.shiftTemplates[0]?.id ?? '',
  );
  const [customWorkDays, setCustomWorkDays] = useState('4');
  const [customOffDays, setCustomOffDays] = useState('2');
  const [customSecondShiftId, setCustomSecondShiftId] = useState('');
  const [rosterNotice, setRosterNotice] = useState<string | null>(null);

  const grid = useMemo(
    () => getMonthlyCalendarGrid(viewYear, viewMonth, state, now),
    [viewYear, viewMonth, state, now],
  );

  const summary = useMemo(() => computeMonthlyRosterSummary(grid), [grid]);

  const handlePrevMonth = () => {
    setSelectedDateKey(null);
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDateKey(null);
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpTodayMonth = () => {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDateKey(null);
  };

  const openInspectorForDay = (cell: MonthlyCalendarDay) => {
    setSelectedDateKey(cell.dateKey);
    if (cell.override) {
      if (cell.override.tipe === 'libur') {
        setDetailType(cell.override.kategoriStatus ?? 'off');
      } else {
        setDetailType('shift');
        setDetailShiftId(cell.override.shiftId || state.shiftTemplates[0]?.id || '');
        setDetailCustomTime(cell.override.jamMasukKustom || '');
      }
      setDetailLabel(cell.override.label || '');
    } else {
      setDetailType('rutin');
      setDetailShiftId(state.shiftTemplates[0]?.id || '');
      setDetailCustomTime('');
      setDetailLabel('');
    }
  };

  const handleDayCellClick = (cell: MonthlyCalendarDay) => {
    if (!cell.isCurrentMonth) {
      return;
    }

    if (brush.kind === 'inspect') {
      openInspectorForDay(cell);
      return;
    }

    if (brush.kind === 'rutin') {
      onRemoveDateOverride(cell.dateKey);
      return;
    }

    if (brush.kind === 'shift') {
      onUpsertDateOverride({
        dateKey: cell.dateKey,
        tipe: 'shift',
        shiftId: brush.shiftId,
      });
      return;
    }

    if (brush.kind === 'nonwork') {
      onUpsertDateOverride({
        dateKey: cell.dateKey,
        tipe: 'libur',
        kategoriStatus: brush.category,
      });
    }
  };

  const handleDetailSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedDateKey) {
      return;
    }

    if (detailType === 'rutin') {
      onRemoveDateOverride(selectedDateKey);
      setRosterNotice(`Jadwal ${selectedDateKey} dikembalikan ke pola mingguan.`);
      return;
    }

    if (detailType === 'shift') {
      onUpsertDateOverride({
        dateKey: selectedDateKey,
        tipe: 'shift',
        shiftId: detailCustomTime.trim() ? undefined : detailShiftId,
        jamMasukKustom: detailCustomTime.trim() || undefined,
        label: detailLabel.trim() || undefined,
      });
      setRosterNotice(`Jadwal shift untuk ${selectedDateKey} disimpan.`);
      return;
    }

    onUpsertDateOverride({
      dateKey: selectedDateKey,
      tipe: 'libur',
      kategoriStatus: detailType,
      label: detailLabel.trim() || undefined,
    });
    setRosterNotice(
      `Status ${getNonWorkCategoryLabel(detailType)} untuk ${selectedDateKey} disimpan.`,
    );
  };

  const handleApplyAutoPattern = () => {
    const primary = rotationShiftId || state.shiftTemplates[0]?.id || '';
    const generated =
      rotationPattern === 'custom_cycle'
        ? generateCustomCycleOverrides(
            viewYear,
            viewMonth,
            Number(customWorkDays) || 4,
            Number(customOffDays) || 0,
            customSecondShiftId ? [primary, customSecondShiftId] : [primary],
          )
        : generateMonthlyRotationOverrides(
            viewYear,
            viewMonth,
            rotationPattern,
            primary,
            state.shiftTemplates,
          );
    onApplyMonthOverrides(viewYear, viewMonth, generated);
    setRosterNotice(
      `Pola jadwal sebulan untuk ${formatMonthYearIndonesian(viewYear, viewMonth)} berhasil diterapkan.`,
    );
  };

  const handleClearMonth = () => {
    onClearMonthOverrides(viewYear, viewMonth);
    setRosterNotice(
      `Penyesuaian bulan ${formatMonthYearIndonesian(viewYear, viewMonth)} dibersihkan kembali ke pola mingguan.`,
    );
  };

  const handleExportMonthIcs = () => {
    const monthLabel = formatMonthYearIndonesian(viewYear, viewMonth);
    const { filename, eventCount } = downloadMonthlyIcs(
      grid,
      monthLabel,
      shiftNotes,
    );
    if (eventCount === 0) {
      setRosterNotice(
        `Belum ada shift kerja terjadwal pada ${monthLabel} untuk diekspor ke file .ics.`,
      );
      return;
    }
    setRosterNotice(
      `Kalender ${monthLabel} (${eventCount} jadwal kerja) diekspor ke ${filename}. Siap diimpor ke Google Calendar atau aplikasi kalender HP.`,
    );
  };

  return (
    <section
      aria-label="Perencana jadwal shift bulanan"
      className="tk-card rounded-[3px] p-6 space-y-6"
    >
      {/* Header & Month Navigator */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-base sm:text-lg font-bold uppercase tracking-wide text-[var(--tk-text)]">
            Jadwal Shift Bulanan, Off &amp; Cuti
          </h1>
          <p className="mt-1 text-sm text-[var(--tk-text-muted)]">
            Susun jadwal kerja satu bulan penuh untuk Shift 1–4, Middle Pagi,
            hari Off, Cuti, Izin, hingga Sakit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Bulan sebelumnya"
            className="p-2 text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <span className="min-w-[150px] text-center font-display text-xs sm:text-sm font-bold text-[var(--tk-text)] tabular-nums">
            {formatMonthYearIndonesian(viewYear, viewMonth)}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Bulan berikutnya"
            className="p-2 text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px]"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleJumpTodayMonth}
            className="tk-armor-cut-sm ml-1 px-3 py-2 text-xs font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface-muted)] border border-[var(--tk-border)] hover:opacity-90 rounded-[2px] whitespace-nowrap"
          >
            Bulan Ini
          </button>
        </div>
      </div>

      {/* Monthly Summary Metrics */}
      <div className="py-4 border-y border-[var(--tk-border)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--tk-border)]">
        <div className="pb-3 lg:pb-0 lg:pr-5">
          <p className="text-xs font-medium text-[var(--tk-text-subtle)]">Total Hari Kerja</p>
          <p
            data-testid="monthly-workdays"
            className="mt-1 font-display tabular-nums text-lg sm:text-xl font-bold text-[var(--tk-text)]"
          >
            {summary.totalWorkingDays} hari
          </p>
          <p className="mt-0.5 text-xs text-[var(--tk-text-subtle)]">
            Estimasi {summary.totalWorkHours} jam kerja
          </p>
        </div>

        <div className="py-3 lg:py-0 lg:px-5">
          <p className="text-xs font-medium text-[var(--tk-text-subtle)]">Hari Off / Libur</p>
          <p
            data-testid="monthly-offdays"
            className="mt-1 font-display tabular-nums text-lg sm:text-xl font-bold text-[var(--tk-text)]"
          >
            {summary.totalOffDays} hari
          </p>
          <p className="mt-0.5 text-xs text-[var(--tk-text-subtle)]">Jadwal istirahat rutin</p>
        </div>

        <div className="py-3 lg:py-0 lg:px-5">
          <p className="text-xs font-medium text-[var(--tk-text-subtle)]">
            Cuti, Izin &amp; Lainnya
          </p>
          <p
            data-testid="monthly-leavedays"
            className="mt-1 font-display tabular-nums text-lg sm:text-xl font-bold text-[var(--tk-warning-text)]"
          >
            {summary.totalLeaveDays} hari
          </p>
          <p className="mt-0.5 text-xs text-[var(--tk-text-subtle)]">
            Cuti {summary.byCategory.cuti} · Izin {summary.byCategory.izin} ·
            Sakit {summary.byCategory.sakit} · Nas {summary.byCategory.libur}
          </p>
        </div>

        <div className="pt-3 lg:pt-0 lg:pl-5">
          <p className="text-xs font-medium text-[var(--tk-text-subtle)]">Komposisi Shift</p>
          <p className="mt-1 text-xs font-medium text-[var(--tk-text-muted)] leading-relaxed">
            {summary.byShift.length > 0
              ? summary.byShift
                  .map((s) => `${s.shiftName}: ${s.count}`)
                  .join(' · ')
              : 'Belum ada hari kerja terjadwal'}
          </p>
        </div>
      </div>

      {/* Quick Paint Mode + Auto-Roster Generator */}
      <div className="space-y-4">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-[var(--tk-text-muted)] flex items-center gap-1.5">
              <Paintbrush className="h-3.5 w-3.5 text-[var(--tk-text-subtle)]" aria-hidden="true" />
              Mode Klik Tanggal:
            </p>

            <div
              role="group"
              aria-label="Tampilan kalender bulanan"
              className="flex items-center gap-1 p-1 bg-[var(--tk-surface-muted)] border border-[var(--tk-border)] rounded-[3px]"
            >
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                aria-pressed={viewMode === 'calendar'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[2px] transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-[var(--tk-surface)] text-[var(--tk-text)] shadow-sm'
                    : 'text-[var(--tk-text-muted)] hover:text-[var(--tk-text)]'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                Kalender
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[2px] transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[var(--tk-surface)] text-[var(--tk-text)] shadow-sm'
                    : 'text-[var(--tk-text-muted)] hover:text-[var(--tk-text)]'
                }`}
              >
                <List className="h-3.5 w-3.5" aria-hidden="true" />
                Daftar Bulan
              </button>
            </div>
          </div>

          <div
            role="group"
            aria-label="Pilihan mode klik tanggal kalender"
            className="space-y-2"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-[var(--tk-text-subtle)] mr-1">
                Umum:
              </span>
              <button
                type="button"
                onClick={() => setBrush({ kind: 'inspect' })}
                aria-pressed={brush.kind === 'inspect'}
                className={`tk-armor-cut-sm px-3 py-1.5 text-xs font-medium rounded-[2px] border transition-colors ${
                  brush.kind === 'inspect'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                    : 'bg-[var(--tk-surface)] text-[var(--tk-text-muted)] border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)]'
                }`}
              >
                Edit Detail Tanggal
              </button>
              <button
                type="button"
                onClick={() => setBrush({ kind: 'rutin' })}
                aria-pressed={brush.kind === 'rutin'}
                className={`tk-armor-cut-sm px-3 py-1.5 text-xs font-medium rounded-[2px] border transition-colors ${
                  brush.kind === 'rutin'
                    ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-700 dark:border-slate-200'
                    : 'bg-[var(--tk-surface)] text-[var(--tk-text-muted)] border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)]'
                }`}
              >
                Reset ke Pola Rutin
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-[var(--tk-text-subtle)] mr-1">
                Shift:
              </span>
              {state.shiftTemplates.map((tpl) => {
                const active =
                  brush.kind === 'shift' && brush.shiftId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() =>
                      setBrush({
                        kind: 'shift',
                        shiftId: tpl.id,
                        label: tpl.nama,
                      })
                    }
                    aria-pressed={active}
                    className={`tk-armor-cut-sm px-3 py-1.5 text-xs font-medium rounded-[2px] border transition-colors ${
                      active
                        ? 'bg-[var(--tk-accent)] text-white border-[var(--tk-accent)]'
                        : 'bg-[var(--tk-surface)] text-[var(--tk-text-muted)] border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)]'
                    }`}
                  >
                    {tpl.nama} ({tpl.jamMasuk})
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-[var(--tk-text-subtle)] mr-1">
                Off &amp; Cuti:
              </span>
              {NON_WORK_OPTIONS.map((opt) => {
                const active =
                  brush.kind === 'nonwork' && brush.category === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setBrush({
                        kind: 'nonwork',
                        category: opt.value,
                        label: opt.label,
                      })
                    }
                    aria-pressed={active}
                    className={`tk-armor-cut-sm px-3 py-1.5 text-xs font-medium rounded-[2px] border transition-colors ${
                      active
                        ? 'bg-[var(--tk-warning)] text-white border-[var(--tk-warning)]'
                        : 'bg-[var(--tk-surface)] text-[var(--tk-text-muted)] border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)]'
                    }`}
                  >
                    {opt.value === 'off'
                      ? 'Off'
                      : getNonWorkCategoryLabel(opt.value)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Auto-Roster Generator Strip */}
        <div className="pt-4 border-t border-[var(--tk-border)] flex flex-wrap items-end gap-3">
          <div className="min-w-[210px] flex-1">
            <label
              htmlFor="roster-pattern-select"
              className="block text-xs font-medium text-[var(--tk-text-muted)]"
            >
              Generator Pola Satu Bulan
            </label>
            <select
              id="roster-pattern-select"
              value={rotationPattern}
              onChange={(e) =>
                setRotationPattern(e.target.value as MonthlyRotationPattern)
              }
              className={`mt-1 ${tkSelectClass}`}
            >
              <option value="fixed_5_2">
                Pola Tetap 5–2 (Senin–Jumat Kerja, Sab–Min Off)
              </option>
              <option value="cycle_4_2">
                Pola Bergilir 4–2 (4 Hari Kerja, 2 Hari Off)
              </option>
              <option value="cycle_5_1">
                Pola Bergilir 5–1 (5 Hari Kerja, 1 Hari Off)
              </option>
              <option value="weekly_rotate_1_4">
                Rotasi Mingguan Shift 1 → 2 → 3 → 4
              </option>
              <option value="custom_cycle">
                Pola Siklus Kustom Sendiri (Atur Hari Kerja/Off)
              </option>
            </select>
          </div>

          {rotationPattern !== 'weekly_rotate_1_4' && (
            <div className="min-w-[180px] flex-1">
              <label
                htmlFor="roster-primary-shift"
                className="block text-xs font-medium text-[var(--tk-text-muted)]"
              >
                {rotationPattern === 'custom_cycle' ? 'Shift Siklus 1' : 'Shift yang Diterapkan'}
              </label>
              <select
                id="roster-primary-shift"
                value={rotationShiftId}
                onChange={(e) => setRotationShiftId(e.target.value)}
                className={`mt-1 ${tkSelectClass}`}
              >
                {state.shiftTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.nama} ({tpl.jamMasuk})
                  </option>
                ))}
              </select>
            </div>
          )}

          {rotationPattern === 'custom_cycle' && (
            <>
              <div className="w-24">
                <label
                  htmlFor="roster-custom-work"
                  className="block text-xs font-medium text-[var(--tk-text-muted)]"
                >
                  Hari Kerja
                </label>
                <input
                  id="roster-custom-work"
                  type="number"
                  min={1}
                  max={14}
                  value={customWorkDays}
                  onChange={(e) => setCustomWorkDays(e.target.value)}
                  className={`mt-1 font-mono ${tkInputClass}`}
                />
              </div>
              <div className="w-24">
                <label
                  htmlFor="roster-custom-off"
                  className="block text-xs font-medium text-[var(--tk-text-muted)]"
                >
                  Hari Off
                </label>
                <input
                  id="roster-custom-off"
                  type="number"
                  min={0}
                  max={7}
                  value={customOffDays}
                  onChange={(e) => setCustomOffDays(e.target.value)}
                  className={`mt-1 font-mono ${tkInputClass}`}
                />
              </div>
              <div className="min-w-[160px] flex-1">
                <label
                  htmlFor="roster-secondary-shift"
                  className="block text-xs font-medium text-[var(--tk-text-muted)]"
                >
                  Shift Siklus 2 (opsional)
                </label>
                <select
                  id="roster-secondary-shift"
                  value={customSecondShiftId}
                  onChange={(e) => setCustomSecondShiftId(e.target.value)}
                  className={`mt-1 ${tkSelectClass}`}
                >
                  <option value="">Sama dengan Siklus 1</option>
                  {state.shiftTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.nama} ({tpl.jamMasuk})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={handleApplyAutoPattern}
            className="tk-cta-3d tk-armor-cut-sm inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px] whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Terapkan ke Sebulan
          </button>

          <button
            type="button"
            onClick={handleClearMonth}
            className="tk-armor-cut-sm inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] whitespace-nowrap transition-colors"
          >
            <Eraser className="h-4 w-4" aria-hidden="true" />
            Bersihkan Bulan Ini
          </button>

          <button
            type="button"
            data-testid="export-month-ics-button"
            onClick={handleExportMonthIcs}
            className="tk-armor-cut-sm inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-[var(--tk-accent-text)] bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] hover:opacity-90 rounded-[2px] whitespace-nowrap"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Ekspor Kalender .ics
          </button>
        </div>

        {rosterNotice && (
          <p role="status" className="text-xs font-medium text-[var(--tk-accent-text)]">
            {rosterNotice}
          </p>
        )}
      </div>

      {/* 7-Column Monthly Calendar Grid OR Mobile-Friendly Vertical List */}
      {viewMode === 'calendar' ? (
        <div className="space-y-1.5">
          <p className="md:hidden text-[11px] text-[var(--tk-text-subtle)]">
            Geser ke samping untuk melihat hari lainnya, atau pilih{' '}
            <strong>Daftar Bulan</strong> di atas agar lebih ringkas di HP.
          </p>
          <div className="overflow-x-auto">
            <div className="min-w-[700px] border border-[var(--tk-border)] rounded-[3px] overflow-hidden">
              <div className="grid grid-cols-7 bg-[var(--tk-surface-muted)] border-b border-[var(--tk-border)]">
                {WEEKDAY_HEADERS.map((day) => (
                  <div
                    key={day}
                    className="py-2.5 px-3 text-xs font-semibold text-[var(--tk-text-muted)] text-left border-r last:border-r-0 border-[var(--tk-border)]"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-[var(--tk-border)]">
                {grid.map((cell) => {
                  if (!cell.isCurrentMonth) {
                    return (
                      <div
                        key={cell.dateKey}
                        className="min-h-[86px] p-2.5 bg-[var(--tk-surface-muted)]/60 text-[var(--tk-text-subtle)] opacity-45"
                      >
                        <span className="font-mono tabular-nums text-xs">
                          {cell.dayNumber}
                        </span>
                      </div>
                    );
                  }

                  const isSelected = selectedDateKey === cell.dateKey;
                  const isLeave =
                    cell.isOff &&
                    cell.kategoriStatus !== 'off' &&
                    cell.kategoriStatus !== 'shift';

                  const bgClass = isSelected
                    ? 'bg-[var(--tk-accent-soft)] ring-2 ring-inset ring-[var(--tk-accent)]'
                    : cell.isOff
                      ? isLeave
                        ? 'bg-[var(--tk-warning-soft)] hover:opacity-90'
                        : 'bg-[var(--tk-surface-muted)]/75 hover:bg-[var(--tk-surface-muted)]'
                      : cell.source === 'override'
                        ? 'bg-[var(--tk-accent-soft)]/70 hover:bg-[var(--tk-accent-soft)]'
                        : 'bg-[var(--tk-surface)] hover:bg-[var(--tk-surface-hover)]';

                  const accessibleStatus = cell.occurrence
                    ? `${cell.occurrence.shiftName} pukul ${cell.occurrence.jamMasukStr}`
                    : getNonWorkCategoryLabel(
                        cell.kategoriStatus === 'shift'
                          ? 'off'
                          : cell.kategoriStatus,
                      );

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => handleDayCellClick(cell)}
                      aria-label={`${cell.dateKey}: ${accessibleStatus}`}
                      className={`min-h-[86px] p-2.5 text-left flex flex-col justify-between transition-colors focus-visible:outline-2 focus-visible:outline-[var(--tk-accent)] focus-visible:outline-offset-[-2px] ${bgClass}`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span
                          className={`font-mono tabular-nums text-xs font-bold ${
                            cell.isToday
                              ? 'text-[var(--tk-accent-text)] underline underline-offset-4'
                              : 'text-[var(--tk-text)]'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        {cell.source === 'override' && (
                          <span className="text-[10px] font-semibold text-[var(--tk-accent-text)]">
                            Khusus
                          </span>
                        )}
                      </div>

                      {cell.occurrence ? (
                        <div className="mt-1.5">
                          <p className="text-xs font-semibold text-[var(--tk-text)] truncate">
                            {cell.occurrence.shiftName}
                          </p>
                          <p className="font-mono tabular-nums text-[11px] text-[var(--tk-text-muted)] mt-0.5">
                            {cell.occurrence.jamMasukStr}–{cell.occurrence.jamPulangStr}
                            {cell.occurrence.isOvernight ? ' (+1)' : ''}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-1.5">
                          <p
                            className={`text-xs font-semibold ${
                              isLeave
                                ? 'text-[var(--tk-warning-text)]'
                                : 'text-[var(--tk-text-subtle)]'
                            }`}
                          >
                            {getNonWorkCategoryLabel(
                              cell.kategoriStatus === 'shift'
                                ? 'off'
                                : cell.kategoriStatus,
                            )}
                          </p>
                          {cell.override?.label && (
                            <p className="text-[11px] text-[var(--tk-text-muted)] truncate mt-0.5">
                              {cell.override.label}
                            </p>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-[var(--tk-border)] rounded-[3px] divide-y divide-[var(--tk-border-subtle)] max-h-[460px] overflow-y-auto">
          {grid
            .filter((cell) => cell.isCurrentMonth)
            .map((cell) => {
              const isSelected = selectedDateKey === cell.dateKey;
              const isLeave =
                cell.isOff &&
                cell.kategoriStatus !== 'off' &&
                cell.kategoriStatus !== 'shift';
              const statusText = cell.occurrence
                ? `${cell.occurrence.shiftName} · ${cell.occurrence.jamMasukStr}–${cell.occurrence.jamPulangStr}${cell.occurrence.isOvernight ? ' (+1)' : ''}`
                : getNonWorkCategoryLabel(
                    cell.kategoriStatus === 'shift'
                      ? 'off'
                      : cell.kategoriStatus,
                  );

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => handleDayCellClick(cell)}
                  className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors ${
                    isSelected
                      ? 'bg-[var(--tk-accent-soft)]'
                      : cell.isOff
                        ? isLeave
                          ? 'bg-[var(--tk-warning-soft)] hover:opacity-90'
                          : 'bg-[var(--tk-surface-muted)]/60 hover:bg-[var(--tk-surface-muted)]'
                        : 'bg-[var(--tk-surface)] hover:bg-[var(--tk-surface-hover)]'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--tk-text)]">
                      <span className="font-mono tabular-nums mr-2">
                        {String(cell.dayNumber).padStart(2, '0')}
                      </span>
                      <span>{getDayName(cell.dayOfWeek)}</span>
                      {cell.isToday && (
                        <span className="ml-2 text-xs font-semibold text-[var(--tk-accent-text)]">
                          · Hari Ini
                        </span>
                      )}
                    </p>
                    {cell.override?.label && (
                      <p className="text-xs text-[var(--tk-text-subtle)] truncate mt-0.5">
                        {cell.override.label}
                      </p>
                    )}
                  </div>

                  <span
                    className={`text-xs font-semibold shrink-0 font-mono tabular-nums ${
                      cell.occurrence
                        ? 'text-[var(--tk-text)]'
                        : isLeave
                          ? 'text-[var(--tk-warning-text)]'
                          : 'text-[var(--tk-text-subtle)]'
                    }`}
                  >
                    {statusText}
                  </span>
                </button>
              );
            })}
        </div>
      )}

      {/* Inline Selected Date Detail Editor */}
      {selectedDateKey && (
        <form
          onSubmit={handleDetailSubmit}
          aria-label="Editor detail tanggal terpilih"
          className="border-t border-[var(--tk-border)] pt-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarDays
                className="h-4 w-4 text-[var(--tk-accent-text)]"
                aria-hidden="true"
              />
              <h2 className="font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-[var(--tk-text)]">
                Pengaturan Tanggal{' '}
                <span className="font-mono tabular-nums">{selectedDateKey}</span>
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDateKey(null)}
              className="text-xs font-medium text-[var(--tk-text-subtle)] hover:text-[var(--tk-text)]"
            >
              Tutup Editor
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div>
              <label
                htmlFor="cal-detail-type"
                className="block text-xs font-medium text-[var(--tk-text-muted)]"
              >
                Status Hari
              </label>
              <select
                id="cal-detail-type"
                value={detailType}
                onChange={(e) =>
                  setDetailType(
                    e.target.value as 'rutin' | 'shift' | NonWorkCategory,
                  )
                }
                className={`mt-1 ${tkSelectClass}`}
              >
                <option value="rutin">Ikuti Pola Mingguan</option>
                <option value="shift">Tetapkan Shift Kerja</option>
                {NON_WORK_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {detailType === 'shift' && (
              <>
                <div>
                  <label
                    htmlFor="cal-detail-shift"
                    className="block text-xs font-medium text-[var(--tk-text-muted)]"
                  >
                    Pilih Shift
                  </label>
                  <select
                    id="cal-detail-shift"
                    value={detailShiftId}
                    onChange={(e) => setDetailShiftId(e.target.value)}
                    className={`mt-1 ${tkSelectClass}`}
                  >
                    {state.shiftTemplates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.nama} ({tpl.jamMasuk})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="cal-detail-custom"
                    className="block text-xs font-medium text-[var(--tk-text-muted)]"
                  >
                    Jam Masuk Kustom (opsional)
                  </label>
                  <input
                    id="cal-detail-custom"
                    type="time"
                    value={detailCustomTime}
                    onChange={(e) => setDetailCustomTime(e.target.value)}
                    className={`mt-1 font-mono ${tkInputClass}`}
                  />
                </div>
              </>
            )}

            {detailType !== 'rutin' && (
              <div>
                <label
                  htmlFor="cal-detail-note"
                  className="block text-xs font-medium text-[var(--tk-text-muted)]"
                >
                  Catatan (opsional)
                </label>
                <input
                  id="cal-detail-note"
                  type="text"
                  value={detailLabel}
                  onChange={(e) => setDetailLabel(e.target.value)}
                  placeholder="Contoh: Tukar shift / Cuti keluarga"
                  className={`mt-1 ${tkInputClass}`}
                />
              </div>
            )}

            <div>
              <button
                type="submit"
                className="tk-cta-3d tk-armor-cut-sm w-full px-4 py-2 text-sm font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px]"
              >
                Simpan Tanggal Ini
              </button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}
