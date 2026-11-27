import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  RotateCcw,
  SlidersHorizontal,
  StickyNote,
} from 'lucide-react';
import type {
  DateOverride,
  MonthlyCalendarDay,
  NonWorkCategory,
  TepatKerjaState,
} from '../types/schedule';
import {
  computeMonthlyRosterSummary,
  formatDateKey,
  formatIndonesianDate,
  formatMonthYearIndonesian,
  getMonthlyCalendarGrid,
  getNonWorkCategoryLabel,
  getShiftCompactBadge,
} from '../utils/scheduleEngine';
import { downloadMonthlyIcs } from '../utils/workspaceFeatures';
import { tkInputClass, tkSelectClass } from './ui/DesignSystem';

interface MiniMonthlyCalendarProps {
  state: TepatKerjaState;
  shiftNotes: Record<string, string>;
  onUpsertDateOverride: (override: DateOverride) => void;
  onRemoveDateOverride: (dateKey: string) => void;
  onUpdateShiftNote: (dateKey: string, note: string) => void;
  onOpenTemplateEditor: () => void;
}

const WEEKDAY_MINI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const;

const NON_WORK_OPTIONS: Array<{ value: NonWorkCategory; label: string }> = [
  { value: 'off', label: 'Off / Libur Rutin' },
  { value: 'cuti', label: 'Cuti' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'libur', label: 'Libur Nasional' },
];

export function MiniMonthlyCalendar({
  state,
  shiftNotes,
  onUpsertDateOverride,
  onRemoveDateOverride,
  onUpdateShiftNote,
  onOpenTemplateEditor,
}: MiniMonthlyCalendarProps) {
  const today = new Date();
  const todayKey = formatDateKey(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);

  // Per-day inline customizer states
  const [editMode, setEditMode] = useState<'rutin' | 'shift' | NonWorkCategory>('rutin');
  const [editShiftId, setEditShiftId] = useState(state.shiftTemplates[0]?.id ?? '');
  const [editCustomTime, setEditCustomTime] = useState('');
  const [editCustomDuration, setEditCustomDuration] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [detailNotice, setDetailNotice] = useState<string | null>(null);

  const grid = useMemo(
    () => getMonthlyCalendarGrid(viewYear, viewMonth, state, today),
    [viewYear, viewMonth, state, todayKey],
  );

  const summary = useMemo(() => computeMonthlyRosterSummary(grid), [grid]);

  const currentMonthCells = useMemo(
    () => grid.filter((cell) => cell.isCurrentMonth),
    [grid],
  );

  const selectedCell: MonthlyCalendarDay | null = useMemo(() => {
    const matched = currentMonthCells.find((c) => c.dateKey === selectedDateKey);
    if (matched) {
      return matched;
    }
    return (
      currentMonthCells.find((c) => c.isToday) ??
      currentMonthCells[0] ??
      null
    );
  }, [currentMonthCells, selectedDateKey]);

  // Sync inspector form fields when selected date or underlying override changes
  useEffect(() => {
    if (!selectedCell) {
      return;
    }
    const ovr = selectedCell.override;
    if (ovr) {
      if (ovr.tipe === 'libur') {
        setEditMode(ovr.kategoriStatus ?? 'off');
        setEditShiftId(state.shiftTemplates[0]?.id ?? '');
        setEditCustomTime('');
        setEditCustomDuration('');
      } else {
        setEditMode('shift');
        setEditShiftId(ovr.shiftId || state.shiftTemplates[0]?.id || '');
        setEditCustomTime(ovr.jamMasukKustom || '');
        setEditCustomDuration(
          typeof ovr.durasiKustomMenit === 'number'
            ? String(ovr.durasiKustomMenit)
            : '',
        );
      }
      setEditLabel(ovr.label || '');
    } else {
      setEditMode('rutin');
      setEditShiftId(state.shiftTemplates[0]?.id || '');
      setEditCustomTime('');
      setEditCustomDuration('');
      setEditLabel('');
    }
  }, [selectedCell?.dateKey, selectedCell?.override, state.shiftTemplates]);

  const handlePrevMonth = () => {
    setDetailNotice(null);
    const nextMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const nextYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    setViewYear(nextYear);
    setViewMonth(nextMonth);
    setSelectedDateKey(
      `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01`,
    );
  };

  const handleNextMonth = () => {
    setDetailNotice(null);
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    setViewYear(nextYear);
    setViewMonth(nextMonth);
    setSelectedDateKey(
      `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01`,
    );
  };

  const handleJumpToday = () => {
    setDetailNotice(null);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDateKey(todayKey);
  };

  const handleSelectDay = (cell: MonthlyCalendarDay) => {
    if (!cell.isCurrentMonth) {
      return;
    }
    setDetailNotice(null);
    setSelectedDateKey(cell.dateKey);
  };

  const handleSaveDayCustom = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCell) {
      return;
    }

    if (editMode === 'rutin') {
      onRemoveDateOverride(selectedCell.dateKey);
      setDetailNotice('Jadwal tanggal ini dikembalikan ke pola mingguan rutin.');
      return;
    }

    if (editMode === 'shift') {
      const parsedDuration = editCustomDuration.trim()
        ? Number(editCustomDuration)
        : undefined;
      if (
        parsedDuration !== undefined &&
        (!Number.isFinite(parsedDuration) ||
          parsedDuration < 60 ||
          parsedDuration > 960)
      ) {
        setDetailNotice('Durasi kustom harus antara 60 hingga 960 menit.');
        return;
      }

      onUpsertDateOverride({
        dateKey: selectedCell.dateKey,
        tipe: 'shift',
        shiftId: editShiftId || undefined,
        jamMasukKustom: editCustomTime.trim() || undefined,
        durasiKustomMenit:
          parsedDuration !== undefined ? Math.round(parsedDuration) : undefined,
        label: editLabel.trim() || undefined,
      });
      setDetailNotice(`Shift kustom untuk ${selectedCell.dateKey} berhasil disimpan.`);
      return;
    }

    onUpsertDateOverride({
      dateKey: selectedCell.dateKey,
      tipe: 'libur',
      kategoriStatus: editMode,
      label: editLabel.trim() || undefined,
    });
    setDetailNotice(
      `Status ${getNonWorkCategoryLabel(editMode)} untuk ${selectedCell.dateKey} disimpan.`,
    );
  };

  const handleExportMonth = () => {
    const monthLabel = formatMonthYearIndonesian(viewYear, viewMonth);
    const { filename, eventCount } = downloadMonthlyIcs(
      grid,
      monthLabel,
      shiftNotes,
    );
    setDetailNotice(
      eventCount > 0
        ? `${eventCount} jadwal kerja ${monthLabel} diekspor ke ${filename}.`
        : `Tidak ada jadwal kerja aktif pada ${monthLabel}.`,
    );
  };

  const selectedDateObj = selectedCell
    ? new Date(`${selectedCell.dateKey}T12:00:00`)
    : today;
  const selectedTemplate = selectedCell?.override?.shiftId
    ? state.shiftTemplates.find((s) => s.id === selectedCell.override?.shiftId)
    : undefined;
  const selectedWeeklyRule = selectedCell
    ? state.weeklyRules.find((r) => r.dayOfWeek === selectedCell.dayOfWeek)
    : undefined;
  const weeklyTemplate = selectedWeeklyRule?.shiftId
    ? state.shiftTemplates.find((s) => s.id === selectedWeeklyRule.shiftId)
    : undefined;
  const activeTemplateNote =
    selectedTemplate?.catatan || weeklyTemplate?.catatan || '';
  const commuteOffsetMinutes =
    state.config.durasiPerjalananMenit + state.config.bufferKeterlambatanMenit;

  return (
    <div
      data-testid="mini-monthly-calendar-view"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
    >
      {/* Left: Compact Clickable Mini Monthly Calendar */}
      <section
        aria-label="Kalender mini bulanan"
        className="lg:col-span-6 tk-card rounded-[3px] p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-sm sm:text-base font-bold uppercase tracking-wide text-[var(--tk-text)]">
              Kalender Mini Bulanan
            </h2>
            <p className="text-xs text-[var(--tk-text-muted)]">
              Klik tanggal mana saja untuk melihat &amp; menyesuaikan detail shift.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Bulan sebelumnya"
              className="p-1.5 text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px]"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            <span className="min-w-[126px] text-center font-display text-xs sm:text-sm font-bold text-[var(--tk-text)] tabular-nums">
              {formatMonthYearIndonesian(viewYear, viewMonth)}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Bulan berikutnya"
              className="p-1.5 text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px]"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleJumpToday}
              className="tk-armor-cut-sm px-2.5 py-1.5 text-xs font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface-muted)] border border-[var(--tk-border)] hover:opacity-90 rounded-[2px]"
            >
              Hari Ini
            </button>
          </div>
        </div>

        {/* Compact Monthly Summary Strip */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-[3px] bg-[var(--tk-surface-muted)] border border-[var(--tk-border-subtle)] px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-[var(--tk-text-subtle)]">Kerja</p>
            <p className="text-sm font-bold font-display tabular-nums text-[var(--tk-text)]">
              {summary.totalWorkingDays}h
            </p>
          </div>
          <div className="rounded-[3px] bg-[var(--tk-surface-muted)] border border-[var(--tk-border-subtle)] px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-[var(--tk-text-subtle)]">Off</p>
            <p className="text-sm font-bold font-display tabular-nums text-[var(--tk-text)]">
              {summary.totalOffDays}h
            </p>
          </div>
          <div className="rounded-[3px] bg-[var(--tk-warning-soft)] border border-[var(--tk-warning-border)] px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-[var(--tk-text-subtle)]">Cuti/Izin</p>
            <p className="text-sm font-bold font-display tabular-nums text-[var(--tk-warning-text)]">
              {summary.totalLeaveDays}h
            </p>
          </div>
          <div className="rounded-[3px] bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-[var(--tk-text-subtle)]">Total</p>
            <p className="text-sm font-bold font-display tabular-nums text-[var(--tk-accent-text)]">
              {summary.totalWorkHours}j
            </p>
          </div>
        </div>

        {/* Responsive 7-Column Compact Grid (Zero Horizontal Overflow) */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_MINI.map((day) => (
              <div
                key={day}
                className="py-1 text-[11px] font-semibold text-[var(--tk-text-subtle)]"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div
                    key={cell.dateKey}
                    aria-hidden="true"
                    className="h-14 sm:h-16 rounded-[2px] bg-[var(--tk-surface-muted)]/35 p-1 flex items-start justify-center opacity-35"
                  >
                    <span className="text-[11px] font-mono text-[var(--tk-text-subtle)]">
                      {cell.dayNumber}
                    </span>
                  </div>
                );
              }

              const isSelected = selectedCell?.dateKey === cell.dateKey;
              const isLeave =
                cell.isOff &&
                cell.kategoriStatus !== 'off' &&
                cell.kategoriStatus !== 'shift';

              const shortTag = cell.occurrence
                ? getShiftCompactBadge(cell.occurrence.shiftName)
                : isLeave
                  ? getNonWorkCategoryLabel(
                      cell.kategoriStatus === 'shift' ? 'off' : cell.kategoriStatus,
                    ).slice(0, 4)
                  : 'Off';

              const accessibleDesc = cell.occurrence
                ? `${cell.occurrence.shiftName} pukul ${cell.occurrence.jamMasukStr}`
                : getNonWorkCategoryLabel(
                    cell.kategoriStatus === 'shift' ? 'off' : cell.kategoriStatus,
                  );

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  data-testid={`mini-cal-day-${cell.dateKey}`}
                  onClick={() => handleSelectDay(cell)}
                  aria-pressed={isSelected}
                  aria-label={`${cell.dateKey}: ${accessibleDesc}`}
                  className={`relative h-14 sm:h-16 rounded-[3px] border p-1 flex flex-col items-center justify-between transition-all ${
                    isSelected
                      ? 'border-[var(--tk-accent)] bg-[var(--tk-accent-soft)] ring-2 ring-[var(--tk-focus-ring)] shadow-sm'
                      : cell.isOff
                        ? isLeave
                          ? 'border-[var(--tk-warning-border)] bg-[var(--tk-warning-soft)] hover:border-[var(--tk-warning)]'
                          : 'border-[var(--tk-border-subtle)] bg-[var(--tk-surface-muted)]/70 hover:border-[var(--tk-border)]'
                        : cell.source === 'override'
                          ? 'border-[var(--tk-accent-border)] bg-[var(--tk-accent-soft)]/50 hover:border-[var(--tk-accent)]'
                          : 'border-[var(--tk-border)] bg-[var(--tk-surface)] hover:bg-[var(--tk-surface-hover)]'
                  }`}
                >
                  <div className="w-full flex items-center justify-between px-0.5">
                    <span
                      className={`text-[11px] font-mono tabular-nums font-bold leading-none ${
                        cell.isToday
                          ? 'inline-flex items-center justify-center px-1 py-0.5 rounded-[2px] bg-[var(--tk-accent)] text-white'
                          : 'text-[var(--tk-text)]'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {cell.source === 'override' && (
                      <span
                        title="Jadwal khusus"
                        className="h-1.5 w-1.5 rounded-[1px] bg-[var(--tk-accent)]"
                      />
                    )}
                  </div>

                  <span
                    className={`w-full text-center text-[10px] font-semibold leading-tight truncate px-0.5 rounded-[2px] ${
                      cell.occurrence
                        ? 'text-[var(--tk-accent-text)]'
                        : isLeave
                          ? 'text-[var(--tk-warning-text)]'
                          : 'text-[var(--tk-text-subtle)]'
                    }`}
                  >
                    {shortTag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mini Legend & Month Actions */}
        <div className="pt-2 border-t border-[var(--tk-border-subtle)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--tk-text-subtle)]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-[1px] bg-[var(--tk-accent)]" />
              Kustom/Khusus
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-[1px] bg-[var(--tk-warning)]" />
              Cuti/Izin
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-[1px] bg-[var(--tk-text-subtle)]" />
              Off
            </span>
          </div>

          <button
            type="button"
            onClick={handleExportMonth}
            className="inline-flex items-center gap-1 font-semibold text-[var(--tk-accent-text)] hover:underline"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Ekspor .ics
          </button>
        </div>
      </section>

      {/* Right: Clicked Day Shift Detail & Inline Customizer */}
      <section
        aria-label="Detail shift harian terpilih"
        data-testid="mini-cal-day-detail"
        className="lg:col-span-6 tk-card rounded-[3px] p-5 sm:p-6 space-y-5"
      >
        {selectedCell ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2 pb-4 border-b border-[var(--tk-border)]">
              <div>
                <div className="flex items-center gap-2 text-xs text-[var(--tk-text-subtle)]">
                  <CalendarDays
                    className="h-3.5 w-3.5 text-[var(--tk-accent-text)]"
                    aria-hidden="true"
                  />
                  <span>Detail Shift Tanggal</span>
                  {selectedCell.isToday && (
                    <span className="px-1.5 py-0.5 rounded-[2px] bg-[var(--tk-accent-soft)] text-[var(--tk-accent-text)] font-semibold">
                      Hari Ini
                    </span>
                  )}
                </div>
                <h3 className="mt-1 font-display text-base sm:text-lg font-bold uppercase tracking-wide text-[var(--tk-text)]">
                  {formatIndonesianDate(selectedDateObj)}
                </h3>
              </div>

              <span
                className={`tk-3d-badge px-2.5 py-1 rounded-[2px] text-xs font-semibold border ${
                  selectedCell.occurrence
                    ? selectedCell.source === 'override'
                      ? 'bg-[var(--tk-accent-soft)] text-[var(--tk-accent-text)] border-[var(--tk-accent-border)]'
                      : 'bg-[var(--tk-success-soft)] text-[var(--tk-success-text)] border-[var(--tk-success-border)]'
                    : 'bg-[var(--tk-surface-muted)] text-[var(--tk-text-muted)] border-[var(--tk-border)]'
                }`}
              >
                {selectedCell.occurrence
                  ? selectedCell.source === 'override'
                    ? 'Jadwal Khusus'
                    : 'Pola Rutin'
                  : getNonWorkCategoryLabel(
                      selectedCell.kategoriStatus === 'shift'
                        ? 'off'
                        : selectedCell.kategoriStatus,
                    )}
              </span>
            </div>

            {selectedCell.occurrence ? (
              <div className="space-y-4">
                <div className="rounded-[3px] bg-[var(--tk-surface-muted)] border border-[var(--tk-border)] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-[var(--tk-text-subtle)]">
                        Shift Terjadwal
                      </p>
                      <p
                        data-testid="detail-shift-name"
                        className="font-display text-sm sm:text-base font-bold text-[var(--tk-text)]"
                      >
                        {selectedCell.occurrence.shiftName}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums font-semibold text-[var(--tk-accent-text)]">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {Math.round(
                        (selectedCell.occurrence.durasiKerjaMenit ?? 480) / 60 * 10,
                      ) / 10}{' '}
                      jam ({selectedCell.occurrence.durasiKerjaMenit ?? 480} mnt)
                    </span>
                  </div>

                  {(selectedCell.override?.jamMasukKustom ||
                  selectedCell.override?.durasiKustomMenit) ? (
                    <p className="text-xs text-[var(--tk-text-muted)]">
                      Disesuaikan{selectedTemplate ? ` dari ${selectedTemplate.nama}` : ''} ·{' '}
                      {selectedCell.occurrence.jamMasukStr}–
                      {selectedCell.occurrence.jamPulangStr}
                      {selectedCell.occurrence.isOvernight ? ' (+1 hari)' : ''}
                    </p>
                  ) : (
                    activeTemplateNote && (
                      <p className="text-xs text-[var(--tk-text-muted)]">
                        {activeTemplateNote}
                      </p>
                    )
                  )}

                  {/* 4-Step Daily Shift Schedule Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="rounded-[2px] bg-[var(--tk-surface)] border border-[var(--tk-border-subtle)] p-2.5">
                      <p className="text-[11px] text-[var(--tk-text-subtle)]">
                        Mulai Bersiap
                      </p>
                      <p className="mt-0.5 font-display tabular-nums text-sm sm:text-base font-bold text-[var(--tk-text)]">
                        {selectedCell.occurrence.jamPersiapanStr}
                      </p>
                    </div>
                    <div className="rounded-[2px] bg-[var(--tk-surface)] border border-[var(--tk-accent-border)] p-2.5">
                      <p className="text-[11px] text-[var(--tk-text-subtle)]">
                        Jam Berangkat
                      </p>
                      <p
                        data-testid="detail-depart-time"
                        className="mt-0.5 font-display tabular-nums text-sm sm:text-base font-bold text-[var(--tk-accent-text)]"
                      >
                        {selectedCell.occurrence.jamBerangkatStr}
                      </p>
                    </div>
                    <div className="rounded-[2px] bg-[var(--tk-surface)] border border-[var(--tk-border-subtle)] p-2.5">
                      <p className="text-[11px] text-[var(--tk-text-subtle)]">
                        Masuk Kerja
                      </p>
                      <p
                        data-testid="detail-checkin-time"
                        className="mt-0.5 font-display tabular-nums text-sm sm:text-base font-bold text-[var(--tk-text)]"
                      >
                        {selectedCell.occurrence.jamMasukStr}
                      </p>
                    </div>
                    <div className="rounded-[2px] bg-[var(--tk-surface)] border border-[var(--tk-border-subtle)] p-2.5">
                      <p className="text-[11px] text-[var(--tk-text-subtle)]">
                        Jam Pulang
                      </p>
                      <p className="mt-0.5 font-display tabular-nums text-sm sm:text-base font-bold text-[var(--tk-text)]">
                        {selectedCell.occurrence.jamPulangStr}
                        {selectedCell.occurrence.isOvernight && (
                          <span className="ml-1 text-[10px] font-sans text-[var(--tk-warning-text)]">
                            +1h
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-[var(--tk-text-subtle)]">
                    Perkiraan perjalanan + buffer saat ini: {commuteOffsetMinutes} menit
                    sebelum jam masuk.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-[3px] bg-[var(--tk-surface-muted)] border border-[var(--tk-border)] p-4 space-y-1.5">
                <p
                  data-testid="detail-shift-name"
                  className="font-display text-sm font-bold text-[var(--tk-text)]"
                >
                  {getNonWorkCategoryLabel(
                    selectedCell.kategoriStatus === 'shift'
                      ? 'off'
                      : selectedCell.kategoriStatus,
                  )}
                </p>
                <p className="text-xs text-[var(--tk-text-muted)] leading-relaxed">
                  {selectedCell.override?.label
                    ? `Keterangan: ${selectedCell.override.label}. `
                    : ''}
                  Tidak ada jadwal masuk kerja atau alarm keberangkatan pada tanggal ini.
                </p>
              </div>
            )}

            {/* Personal Daily Shift Note */}
            <div>
              <label
                htmlFor="mini-cal-daily-note"
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--tk-text-muted)]"
              >
                <StickyNote className="h-3.5 w-3.5" aria-hidden="true" />
                Catatan Harian ({selectedCell.dateKey})
              </label>
              <input
                id="mini-cal-daily-note"
                type="text"
                maxLength={180}
                value={shiftNotes[selectedCell.dateKey] ?? ''}
                onChange={(e) =>
                  onUpdateShiftNote(selectedCell.dateKey, e.target.value)
                }
                placeholder="Tambahkan catatan khusus hari ini (mis. briefing, bawa perlengkapan)..."
                className={`mt-1.5 text-xs sm:text-sm ${tkInputClass}`}
              />
            </div>

            {/* Inline Customizer for the Selected Date */}
            <form
              onSubmit={handleSaveDayCustom}
              className="pt-4 border-t border-[var(--tk-border)] space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-display text-xs font-bold uppercase tracking-wide text-[var(--tk-text)] flex items-center gap-1.5">
                  <SlidersHorizontal
                    className="h-3.5 w-3.5 text-[var(--tk-accent-text)]"
                    aria-hidden="true"
                  />
                  Custom Jadwal Tanggal Ini
                </h4>
                <button
                  type="button"
                  onClick={onOpenTemplateEditor}
                  className="text-[11px] font-semibold text-[var(--tk-accent-text)] hover:underline"
                >
                  Kelola Template Shift
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="mini-edit-mode"
                    className="block text-[11px] font-medium text-[var(--tk-text-muted)]"
                  >
                    Status / Jenis Hari
                  </label>
                  <select
                    id="mini-edit-mode"
                    data-testid="mini-cal-edit-mode"
                    value={editMode}
                    onChange={(e) =>
                      setEditMode(
                        e.target.value as 'rutin' | 'shift' | NonWorkCategory,
                      )
                    }
                    className={`mt-1 text-xs sm:text-sm ${tkSelectClass}`}
                  >
                    <option value="rutin">Ikuti Pola Mingguan Rutin</option>
                    <option value="shift">Custom Shift / Jam Masuk</option>
                    {NON_WORK_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {editMode === 'shift' && (
                  <div>
                    <label
                      htmlFor="mini-edit-template"
                      className="block text-[11px] font-medium text-[var(--tk-text-muted)]"
                    >
                      Dasar Template Shift
                    </label>
                    <select
                      id="mini-edit-template"
                      value={editShiftId}
                      onChange={(e) => setEditShiftId(e.target.value)}
                      className={`mt-1 text-xs sm:text-sm ${tkSelectClass}`}
                    >
                      {state.shiftTemplates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.nama} ({tpl.jamMasuk})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {editMode === 'shift' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="mini-edit-label"
                      className="block text-[11px] font-medium text-[var(--tk-text-muted)]"
                    >
                      Nama Kustom (opsional)
                    </label>
                    <input
                      id="mini-edit-label"
                      data-testid="mini-cal-custom-label"
                      type="text"
                      maxLength={40}
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Mis. WFO Pagi"
                      className={`mt-1 text-xs sm:text-sm ${tkInputClass}`}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="mini-edit-time"
                      className="block text-[11px] font-medium text-[var(--tk-text-muted)]"
                    >
                      Jam Masuk Kustom
                    </label>
                    <input
                      id="mini-edit-time"
                      data-testid="mini-cal-custom-time"
                      type="time"
                      value={editCustomTime}
                      onChange={(e) => setEditCustomTime(e.target.value)}
                      className={`mt-1 text-xs sm:text-sm font-mono ${tkInputClass}`}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="mini-edit-duration"
                      className="block text-[11px] font-medium text-[var(--tk-text-muted)]"
                    >
                      Durasi Kustom (mnt)
                    </label>
                    <input
                      id="mini-edit-duration"
                      data-testid="mini-cal-custom-duration"
                      type="number"
                      min={60}
                      max={960}
                      step={15}
                      value={editCustomDuration}
                      onChange={(e) => setEditCustomDuration(e.target.value)}
                      placeholder="Mis. 480"
                      className={`mt-1 text-xs sm:text-sm font-mono ${tkInputClass}`}
                    />
                  </div>
                </div>
              )}

              {editMode !== 'rutin' && editMode !== 'shift' && (
                <div>
                  <label
                    htmlFor="mini-edit-leave-note"
                    className="block text-[11px] font-medium text-[var(--tk-text-muted)]"
                  >
                    Keterangan (opsional)
                  </label>
                  <input
                    id="mini-edit-leave-note"
                    type="text"
                    maxLength={80}
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="Contoh: Cuti keluarga"
                    className={`mt-1 text-xs sm:text-sm ${tkInputClass}`}
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="submit"
                  data-testid="mini-cal-save-day-btn"
                  className="tk-cta-3d tk-armor-cut-sm px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px]"
                >
                  Simpan Tanggal Ini
                </button>
                {selectedCell.override && (
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveDateOverride(selectedCell.dateKey);
                      setDetailNotice('Dikembalikan ke jadwal pola mingguan rutin.');
                    }}
                    className="tk-armor-cut-sm inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Reset Rutin
                  </button>
                )}
              </div>

              {detailNotice && (
                <p
                  role="status"
                  className="text-xs font-medium text-[var(--tk-accent-text)]"
                >
                  {detailNotice}
                </p>
              )}
            </form>
          </>
        ) : (
          <p className="text-sm text-[var(--tk-text-muted)]">
            Pilih salah satu tanggal pada kalender mini di samping untuk melihat detail shift.
          </p>
        )}
      </section>
    </div>
  );
}
