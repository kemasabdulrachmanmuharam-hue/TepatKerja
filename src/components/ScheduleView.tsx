import { useMemo, useState, type FormEvent } from 'react';
import {
  CalendarDays,
  Copy,
  List,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  formatDateKey,
  formatMinutesToTime,
  getDayName,
  getNonWorkCategoryLabel,
  parseTimeToMinutes,
  validateShiftInput,
} from '../utils/scheduleEngine';
import type {
  DateOverride,
  DayOfWeek,
  NonWorkCategory,
  ShiftTemplate,
  TepatKerjaState,
  WeeklyRule,
} from '../types/schedule';
import { MiniMonthlyCalendar } from './MiniMonthlyCalendar';
import { MonthlyRosterPlanner } from './MonthlyRosterPlanner';
import { tkInputClass, tkSelectClass } from './ui/DesignSystem';

export type ScheduleViewMode = 'list' | 'mini-calendar';

interface ScheduleViewProps {
  state: TepatKerjaState;
  shiftNotes?: Record<string, string>;
  shiftTemplates: ShiftTemplate[];
  weeklyRules: WeeklyRule[];
  dateOverrides: DateOverride[];
  onAddShift: (shift: Omit<ShiftTemplate, 'id'>) => void;
  onUpdateShift: (shift: ShiftTemplate) => void;
  onDeleteShift: (shiftId: string) => void;
  onUpdateWeeklyRule: (
    dayOfWeek: DayOfWeek,
    aktif: boolean,
    shiftId: string | null,
  ) => void;
  onApplyWeeklyWorkdaysPreset?: (workDays: DayOfWeek[], shiftId: string) => void;
  onRestoreStandardShifts?: () => void;
  onUpdateShiftNote?: (dateKey: string, note: string) => void;
  onUpsertDateOverride: (override: DateOverride) => void;
  onRemoveDateOverride: (dateKey: string) => void;
  onApplyMonthOverrides: (
    year: number,
    monthIndex: number,
    overrides: DateOverride[],
  ) => void;
  onClearMonthOverrides: (year: number, monthIndex: number) => void;
}

const ORDERED_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

const QUICK_DURATION_PRESETS = [
  { label: '4j', minutes: 240 },
  { label: '7j', minutes: 420 },
  { label: '8j', minutes: 480 },
  { label: '9j', minutes: 540 },
  { label: '12j', minutes: 720 },
] as const;

const NON_WORK_CATEGORIES: Array<{ value: NonWorkCategory; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: 'cuti', label: 'Cuti' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'libur', label: 'Libur Nasional' },
];

export function ScheduleView({
  state,
  shiftNotes = {},
  shiftTemplates,
  weeklyRules,
  dateOverrides,
  onAddShift,
  onUpdateShift,
  onDeleteShift,
  onUpdateWeeklyRule,
  onApplyWeeklyWorkdaysPreset,
  onRestoreStandardShifts,
  onUpdateShiftNote,
  onUpsertDateOverride,
  onRemoveDateOverride,
  onApplyMonthOverrides,
  onClearMonthOverrides,
}: ScheduleViewProps) {
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('list');

  // Shift Template Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nama, setNama] = useState('');
  const [jamMasuk, setJamMasuk] = useState('08:00');
  const [durasiKerjaMenit, setDurasiKerjaMenit] = useState('480');
  const [catatan, setCatatan] = useState('');
  const [shiftErrors, setShiftErrors] = useState<Record<string, string>>({});
  const [shiftFeedback, setShiftFeedback] = useState<string | null>(null);

  // Date Override Form State
  const [overrideDate, setOverrideDate] = useState(formatDateKey(new Date()));
  const [overrideType, setOverrideType] = useState<'shift' | 'libur'>('shift');
  const [overrideCategory, setOverrideCategory] =
    useState<NonWorkCategory>('cuti');
  const [overrideShiftId, setOverrideShiftId] = useState(
    shiftTemplates[0]?.id ?? '',
  );
  const [overrideCustomTime, setOverrideCustomTime] = useState('');
  const [overrideCustomDuration, setOverrideCustomDuration] = useState('');
  const [overrideLabel, setOverrideLabel] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideFilter, setOverrideFilter] = useState<
    'all' | 'shift' | 'libur'
  >('all');
  const [showAllOverrides, setShowAllOverrides] = useState(false);

  const previewEndInfo = useMemo(() => {
    const startMin = parseTimeToMinutes(jamMasuk);
    const durasiNum = Number(durasiKerjaMenit);
    if (
      startMin === null ||
      !Number.isFinite(durasiNum) ||
      durasiNum < 60 ||
      durasiNum > 960
    ) {
      return null;
    }
    const endMin = startMin + durasiNum;
    return {
      endStr: formatMinutesToTime(endMin),
      isOvernight: endMin >= 1440,
    };
  }, [jamMasuk, durasiKerjaMenit]);

  const resetShiftForm = () => {
    setEditingId(null);
    setNama('');
    setJamMasuk('08:00');
    setDurasiKerjaMenit('480');
    setCatatan('');
    setShiftErrors({});
  };

  const startEditShift = (tpl: ShiftTemplate) => {
    setEditingId(tpl.id);
    setNama(tpl.nama);
    setJamMasuk(tpl.jamMasuk);
    setDurasiKerjaMenit(String(tpl.durasiKerjaMenit));
    setCatatan(tpl.catatan);
    setShiftErrors({});
    setShiftFeedback(null);
  };

  const duplicateShift = (tpl: ShiftTemplate) => {
    const copyName = `${tpl.nama.slice(0, 31)} (Salinan)`;
    onAddShift({
      nama: copyName,
      jamMasuk: tpl.jamMasuk,
      durasiKerjaMenit: tpl.durasiKerjaMenit,
      catatan: tpl.catatan,
    });
    setShiftFeedback(`Template "${copyName}" dibuat. Silakan edit sesuai kebutuhan.`);
  };

  const handleShiftSubmit = (e: FormEvent) => {
    e.preventDefault();
    const durasiNum = Number(durasiKerjaMenit);
    const check = validateShiftInput({
      nama,
      jamMasuk,
      durasiKerjaMenit: durasiNum,
    });
    if (!check.valid) {
      setShiftErrors(check.errors);
      return;
    }

    const endPreview = previewEndInfo
      ? `Jam kerja ${jamMasuk.trim()}–${previewEndInfo.endStr}${previewEndInfo.isOvernight ? ' (+1 hari)' : ''}`
      : `Masuk pukul ${jamMasuk.trim()}`;

    const payload = {
      nama: nama.trim(),
      jamMasuk: jamMasuk.trim(),
      durasiKerjaMenit: Math.round(durasiNum),
      catatan: catatan.trim() || endPreview,
    };

    if (editingId) {
      onUpdateShift({ id: editingId, ...payload });
      setShiftFeedback(`Template shift "${payload.nama}" diperbarui.`);
    } else {
      onAddShift(payload);
      setShiftFeedback(`Template shift kustom "${payload.nama}" ditambahkan.`);
    }
    resetShiftForm();
  };

  const handleOverrideSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!overrideDate) {
      setOverrideError('Pilih tanggal terlebih dahulu.');
      return;
    }
    if (
      overrideType === 'shift' &&
      !overrideShiftId &&
      !overrideCustomTime.trim()
    ) {
      setOverrideError('Pilih template shift atau isi jam masuk kustom.');
      return;
    }

    const parsedDur = overrideCustomDuration.trim()
      ? Number(overrideCustomDuration)
      : undefined;
    if (
      overrideType === 'shift' &&
      parsedDur !== undefined &&
      (!Number.isFinite(parsedDur) || parsedDur < 60 || parsedDur > 960)
    ) {
      setOverrideError('Durasi kerja kustom harus antara 60 hingga 960 menit.');
      return;
    }

    setOverrideError(null);
    onUpsertDateOverride({
      dateKey: overrideDate,
      tipe: overrideType,
      kategoriStatus: overrideType === 'libur' ? overrideCategory : undefined,
      shiftId: overrideType === 'shift' ? overrideShiftId || undefined : undefined,
      jamMasukKustom:
        overrideType === 'shift' && overrideCustomTime.trim()
          ? overrideCustomTime.trim()
          : undefined,
      durasiKustomMenit:
        overrideType === 'shift' && parsedDur !== undefined
          ? Math.round(parsedDur)
          : undefined,
      label: overrideLabel.trim() || undefined,
    });
    setOverrideCustomTime('');
    setOverrideCustomDuration('');
    setOverrideLabel('');
  };

  const sortedOverrides = [...dateOverrides].sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey),
  );

  const primaryShiftId = shiftTemplates[0]?.id ?? '';

  return (
    <div className="space-y-6">
      {/* Top View Mode Toggle Header */}
      <section
        aria-label="Pengaturan tampilan jadwal dan shift"
        className="tk-card rounded-[3px] p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="min-w-0">
          <h1 className="font-display text-base sm:text-lg font-bold uppercase tracking-wide text-[var(--tk-text)]">
            Jadwal Kerja &amp; Shift Pribadi
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--tk-text-muted)]">
            Ubah tampilan antara <strong>Daftar</strong> dan{' '}
            <strong>Kalender Mini Bulanan</strong>, serta sesuaikan shift dan jam
            kerja Anda sendiri.
          </p>
        </div>

        <div
          role="group"
          aria-label="Toggle tampilan jadwal"
          className="flex items-center gap-1 p-1 bg-[var(--tk-surface-muted)] border border-[var(--tk-border)] rounded-[3px] shrink-0"
        >
          <button
            type="button"
            data-testid="schedule-view-toggle-list"
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
            className={`tk-armor-cut-sm inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-[2px] transition-all ${
              viewMode === 'list'
                ? 'tk-cta-3d bg-[var(--tk-accent)] text-white'
                : 'text-[var(--tk-text-muted)] hover:text-[var(--tk-text)]'
            }`}
          >
            <List className="h-4 w-4" aria-hidden="true" />
            Tampilan Daftar
          </button>

          <button
            type="button"
            data-testid="schedule-view-toggle-mini-calendar"
            onClick={() => setViewMode('mini-calendar')}
            aria-pressed={viewMode === 'mini-calendar'}
            className={`tk-armor-cut-sm inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-[2px] transition-all ${
              viewMode === 'mini-calendar'
                ? 'tk-cta-3d bg-[var(--tk-accent)] text-white'
                : 'text-[var(--tk-text-muted)] hover:text-[var(--tk-text)]'
            }`}
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Kalender Mini Bulanan
          </button>
        </div>
      </section>

      {viewMode === 'mini-calendar' ? (
        <MiniMonthlyCalendar
          state={state}
          shiftNotes={shiftNotes}
          onUpsertDateOverride={onUpsertDateOverride}
          onRemoveDateOverride={onRemoveDateOverride}
          onUpdateShiftNote={(dateKey, note) =>
            onUpdateShiftNote?.(dateKey, note)
          }
          onOpenTemplateEditor={() => setViewMode('list')}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Section 1: Weekly Fixed Pattern */}
            <section
              aria-label="Pola jadwal tetap mingguan"
              className="lg:col-span-7 tk-card rounded-[3px] overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-[var(--tk-border)] space-y-3">
                <div>
                  <h2 className="font-display text-base font-bold uppercase tracking-wide text-[var(--tk-text)]">
                    Pola Jadwal Mingguan Kustom (Senin–Minggu)
                  </h2>
                  <p className="mt-1 text-sm text-[var(--tk-text-muted)]">
                    Aktifkan hari kerja sesuai rutinitas Anda dan pasangkan tiap hari
                    dengan shift yang berbeda atau seragam.
                  </p>
                </div>

                {onApplyWeeklyWorkdaysPreset && primaryShiftId && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-medium text-[var(--tk-text-subtle)] mr-1">
                      Preset Cepat:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onApplyWeeklyWorkdaysPreset([1, 2, 3, 4, 5], primaryShiftId)
                      }
                      className="tk-armor-cut-sm px-2.5 py-1 text-xs font-medium rounded-[2px] bg-[var(--tk-surface-muted)] text-[var(--tk-text-muted)] hover:text-[var(--tk-text)] border border-[var(--tk-border)]"
                    >
                      Sen–Jum (5 Hari)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onApplyWeeklyWorkdaysPreset([1, 2, 3, 4, 5, 6], primaryShiftId)
                      }
                      className="tk-armor-cut-sm px-2.5 py-1 text-xs font-medium rounded-[2px] bg-[var(--tk-surface-muted)] text-[var(--tk-text-muted)] hover:text-[var(--tk-text)] border border-[var(--tk-border)]"
                    >
                      Sen–Sab (6 Hari)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onApplyWeeklyWorkdaysPreset(
                          [0, 1, 2, 3, 4, 5, 6],
                          primaryShiftId,
                        )
                      }
                      className="tk-armor-cut-sm px-2.5 py-1 text-xs font-medium rounded-[2px] bg-[var(--tk-surface-muted)] text-[var(--tk-text-muted)] hover:text-[var(--tk-text)] border border-[var(--tk-border)]"
                    >
                      Setiap Hari (7 Hari)
                    </button>
                  </div>
                )}
              </div>

              <div className="divide-y divide-[var(--tk-border-subtle)]">
                {ORDERED_DAYS.map((dayNum) => {
                  const rule = weeklyRules.find((r) => r.dayOfWeek === dayNum) ?? {
                    dayOfWeek: dayNum,
                    aktif: false,
                    shiftId: null,
                  };
                  const dayName = getDayName(dayNum);
                  const fallbackShiftId = shiftTemplates[0]?.id ?? '';

                  return (
                    <div
                      key={dayNum}
                      className="px-6 py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-[140px]">
                        <input
                          id={`day-active-${dayNum}`}
                          type="checkbox"
                          checked={rule.aktif}
                          onChange={(e) =>
                            onUpdateWeeklyRule(
                              dayNum,
                              e.target.checked,
                              e.target.checked
                                ? rule.shiftId || fallbackShiftId
                                : rule.shiftId,
                            )
                          }
                          className="h-4 w-4 rounded border-[var(--tk-border)] accent-[var(--tk-accent)]"
                        />
                        <label
                          htmlFor={`day-active-${dayNum}`}
                          className="text-sm font-semibold text-[var(--tk-text)] cursor-pointer"
                        >
                          {dayName}
                        </label>
                      </div>

                      {rule.aktif ? (
                        <div className="flex-1 max-w-xs">
                          <select
                            aria-label={`Pilih shift untuk hari ${dayName}`}
                            value={rule.shiftId || fallbackShiftId}
                            onChange={(e) =>
                              onUpdateWeeklyRule(dayNum, true, e.target.value)
                            }
                            className={tkSelectClass}
                          >
                            {shiftTemplates.map((tpl) => (
                              <option key={tpl.id} value={tpl.id}>
                                {tpl.nama} ({tpl.jamMasuk})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--tk-text-subtle)]">
                          Hari Libur / Off
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section 2: Custom Shift Templates Management */}
            <section
              aria-label="Daftar template shift"
              className="lg:col-span-5 tk-card rounded-[3px] p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold uppercase tracking-wide text-[var(--tk-text)]">
                    Template Shift Kustom
                  </h2>
                  <p className="mt-1 text-sm text-[var(--tk-text-muted)]">
                    Buat, ubah, duplikat, atau hapus preset jam kerja sesuai jadwal
                    Anda sendiri.
                  </p>
                </div>

                {onRestoreStandardShifts && (
                  <button
                    type="button"
                    onClick={onRestoreStandardShifts}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--tk-accent-text)] hover:underline shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Tambah Preset Bawaan
                  </button>
                )}
              </div>

              <ul className="mt-4 divide-y divide-[var(--tk-border-subtle)] border-y border-[var(--tk-border)] max-h-[300px] overflow-y-auto">
                {shiftTemplates.map((tpl) => {
                  const startMin = parseTimeToMinutes(tpl.jamMasuk);
                  const endMin =
                    startMin !== null ? startMin + tpl.durasiKerjaMenit : null;
                  const endTimeStr =
                    endMin !== null ? formatMinutesToTime(endMin) : null;
                  const crossesMidnight = endMin !== null && endMin >= 1440;

                  return (
                    <li
                      key={tpl.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--tk-text)] truncate">
                          {tpl.nama}
                        </p>
                        <p className="text-xs text-[var(--tk-text-subtle)]">
                          <span className="font-mono tabular-nums font-medium text-[var(--tk-text-muted)]">
                            {tpl.jamMasuk}
                            {endTimeStr ? `–${endTimeStr}` : ''}
                            {crossesMidnight ? ' (+1 hari)' : ''}
                          </span>
                          <span aria-hidden="true" className="mx-1.5">
                            ·
                          </span>
                          <span>
                            {Math.round((tpl.durasiKerjaMenit / 60) * 10) / 10} jam
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => duplicateShift(tpl)}
                          aria-label={`Duplikat '${tpl.nama}'`}
                          title="Duplikat shift"
                          className="p-2 text-[var(--tk-text-subtle)] hover:text-[var(--tk-text)] hover:bg-[var(--tk-surface-muted)] rounded-[2px]"
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditShift(tpl)}
                          aria-label={`Edit '${tpl.nama}'`}
                          className="p-2 text-[var(--tk-text-subtle)] hover:text-[var(--tk-text)] hover:bg-[var(--tk-surface-muted)] rounded-[2px]"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={shiftTemplates.length <= 1}
                          onClick={() => onDeleteShift(tpl.id)}
                          aria-label={`Hapus '${tpl.nama}'`}
                          className="p-2 text-[var(--tk-text-subtle)] hover:text-[var(--tk-error-text)] hover:bg-[var(--tk-error-soft)] rounded-[2px] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <form
                onSubmit={handleShiftSubmit}
                className="mt-5 space-y-3.5"
                noValidate
              >
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--tk-text)]">
                  {editingId ? 'Ubah Template Shift' : 'Buat Template Shift Baru'}
                </h3>

                <div>
                  <label
                    htmlFor="tpl-nama"
                    className="block text-xs font-medium text-[var(--tk-text-muted)]"
                  >
                    Nama Shift
                  </label>
                  <input
                    id="tpl-nama"
                    data-testid="shift-tpl-name"
                    type="text"
                    maxLength={40}
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: WFO Pagi / Shift Sore"
                    className={`mt-1 ${tkInputClass}`}
                  />
                  {shiftErrors.nama && (
                    <p className="mt-1 text-xs text-[var(--tk-error-text)]">
                      {shiftErrors.nama}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="tpl-jam"
                      className="block text-xs font-medium text-[var(--tk-text-muted)]"
                    >
                      Jam Masuk
                    </label>
                    <input
                      id="tpl-jam"
                      data-testid="shift-tpl-time"
                      type="time"
                      value={jamMasuk}
                      onChange={(e) => setJamMasuk(e.target.value)}
                      className={`mt-1 font-mono tabular-nums ${tkInputClass}`}
                    />
                    {shiftErrors.jamMasuk && (
                      <p className="mt-1 text-xs text-[var(--tk-error-text)]">
                        {shiftErrors.jamMasuk}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="tpl-durasi"
                      className="block text-xs font-medium text-[var(--tk-text-muted)]"
                    >
                      Durasi (menit)
                    </label>
                    <input
                      id="tpl-durasi"
                      data-testid="shift-tpl-duration"
                      type="number"
                      min={60}
                      max={960}
                      step={15}
                      value={durasiKerjaMenit}
                      onChange={(e) => setDurasiKerjaMenit(e.target.value)}
                      className={`mt-1 font-mono tabular-nums ${tkInputClass}`}
                    />
                    {shiftErrors.durasiKerjaMenit && (
                      <p className="mt-1 text-xs text-[var(--tk-error-text)]">
                        {shiftErrors.durasiKerjaMenit}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {QUICK_DURATION_PRESETS.map((preset) => (
                      <button
                        key={preset.minutes}
                        type="button"
                        onClick={() => setDurasiKerjaMenit(String(preset.minutes))}
                        className={`px-2 py-0.5 text-[11px] font-mono rounded-[2px] border ${
                          Number(durasiKerjaMenit) === preset.minutes
                            ? 'bg-[var(--tk-accent-soft)] border-[var(--tk-accent)] text-[var(--tk-accent-text)] font-semibold'
                            : 'bg-[var(--tk-surface-muted)] border-[var(--tk-border)] text-[var(--tk-text-muted)]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  {previewEndInfo && (
                    <span className="text-[11px] font-mono text-[var(--tk-text-subtle)]">
                      Selesai {previewEndInfo.endStr}
                      {previewEndInfo.isOvernight ? ' (+1h)' : ''}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="tpl-catatan"
                    className="block text-xs font-medium text-[var(--tk-text-muted)]"
                  >
                    Catatan Shift (opsional)
                  </label>
                  <input
                    id="tpl-catatan"
                    type="text"
                    maxLength={120}
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Contoh: WFO Gedung Utama / Seragam lapangan"
                    className={`mt-1 ${tkInputClass}`}
                  />
                </div>

                {shiftFeedback && (
                  <p
                    role="status"
                    className="text-xs font-medium text-[var(--tk-accent-text)]"
                  >
                    {shiftFeedback}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    data-testid="shift-tpl-submit"
                    className="tk-cta-3d tk-armor-cut-sm inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px]"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {editingId ? 'Simpan Perubahan' : 'Tambah Template'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetShiftForm}
                      className="tk-armor-cut-sm px-3.5 py-2.5 text-sm font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] transition-colors"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </section>
          </div>

          {/* Section 3: Flexible Date Overrides */}
          <section
            aria-label="Penyesuaian shift dan libur per tanggal"
            className="tk-card rounded-[3px] p-6"
          >
            <div className="max-w-2xl">
              <h2 className="font-display text-base font-bold uppercase tracking-wide text-[var(--tk-text)]">
                Penyesuaian Shift &amp; Libur Per Tanggal
              </h2>
              <p className="mt-1 text-sm text-[var(--tk-text-muted)]">
                Gunakan fitur ini untuk jadwal fleksibel, tukar shift, jam masuk &amp;
                durasi kerja kustom, atau menandai hari cuti pada tanggal tertentu.
              </p>
            </div>

            <form
              onSubmit={handleOverrideSubmit}
              className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
              noValidate
            >
              <div>
                <label
                  htmlFor="ovr-date"
                  className="block text-xs font-medium text-[var(--tk-text-muted)]"
                >
                  Tanggal
                </label>
                <input
                  id="ovr-date"
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className={`mt-1 font-mono ${tkInputClass}`}
                />
              </div>

              <div>
                <label
                  htmlFor="ovr-type"
                  className="block text-xs font-medium text-[var(--tk-text-muted)]"
                >
                  Jenis Penyesuaian
                </label>
                <select
                  id="ovr-type"
                  value={overrideType}
                  onChange={(e) =>
                    setOverrideType(e.target.value as 'shift' | 'libur')
                  }
                  className={`mt-1 ${tkSelectClass}`}
                >
                  <option value="shift">Jadwal Shift Khusus</option>
                  <option value="libur">Off / Cuti / Izin / Libur</option>
                </select>
              </div>

              {overrideType === 'shift' ? (
                <>
                  <div>
                    <label
                      htmlFor="ovr-shift"
                      className="block text-xs font-medium text-[var(--tk-text-muted)]"
                    >
                      Pilih Shift
                    </label>
                    <select
                      id="ovr-shift"
                      value={overrideShiftId}
                      onChange={(e) => setOverrideShiftId(e.target.value)}
                      className={`mt-1 ${tkSelectClass}`}
                    >
                      {shiftTemplates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.nama} ({tpl.jamMasuk})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="ovr-custom-time"
                      className="block text-xs font-medium text-[var(--tk-text-muted)]"
                    >
                      Jam Masuk Kustom
                    </label>
                    <input
                      id="ovr-custom-time"
                      type="time"
                      value={overrideCustomTime}
                      onChange={(e) => setOverrideCustomTime(e.target.value)}
                      className={`mt-1 font-mono ${tkInputClass}`}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ovr-custom-duration"
                      className="block text-xs font-medium text-[var(--tk-text-muted)]"
                    >
                      Durasi Kustom (mnt)
                    </label>
                    <input
                      id="ovr-custom-duration"
                      type="number"
                      min={60}
                      max={960}
                      step={15}
                      value={overrideCustomDuration}
                      onChange={(e) => setOverrideCustomDuration(e.target.value)}
                      placeholder="Default"
                      className={`mt-1 font-mono ${tkInputClass}`}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="ovr-category"
                      className="block text-xs font-medium text-[var(--tk-text-muted)]"
                    >
                      Kategori Status
                    </label>
                    <select
                      id="ovr-category"
                      value={overrideCategory}
                      onChange={(e) =>
                        setOverrideCategory(e.target.value as NonWorkCategory)
                      }
                      className={`mt-1 ${tkSelectClass}`}
                    >
                      {NON_WORK_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-2">
                    <label
                      htmlFor="ovr-label"
                      className="block text-xs font-medium text-[var(--tk-text-muted)]"
                    >
                      Keterangan (opsional)
                    </label>
                    <input
                      id="ovr-label"
                      type="text"
                      value={overrideLabel}
                      onChange={(e) => setOverrideLabel(e.target.value)}
                      placeholder="Contoh: Cuti tahunan"
                      className={`mt-1 ${tkInputClass}`}
                    />
                  </div>
                </>
              )}

              <div>
                <button
                  type="submit"
                  className="tk-cta-3d tk-armor-cut-sm w-full px-4 py-2 text-sm font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px]"
                >
                  Terapkan Tanggal
                </button>
              </div>
            </form>

            {overrideError && (
              <p className="mt-2 text-xs text-[var(--tk-error-text)]">
                {overrideError}
              </p>
            )}

            <div className="mt-6 border-t border-[var(--tk-border)] pt-4">
              {sortedOverrides.length > 0 ? (
                (() => {
                  const filteredOverrides = sortedOverrides.filter((ovr) =>
                    overrideFilter === 'all' ? true : ovr.tipe === overrideFilter,
                  );
                  const visibleOverrides = showAllOverrides
                    ? filteredOverrides
                    : filteredOverrides.slice(0, 6);

                  return (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div
                          role="group"
                          aria-label="Filter penyesuaian tanggal"
                          className="flex items-center gap-1 p-1 bg-[var(--tk-surface-muted)] border border-[var(--tk-border)] rounded-[3px]"
                        >
                          {(
                            [
                              { id: 'all', label: `Semua (${sortedOverrides.length})` },
                              { id: 'shift', label: 'Shift Khusus' },
                              { id: 'libur', label: 'Off & Cuti' },
                            ] as const
                          ).map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setOverrideFilter(tab.id)}
                              aria-pressed={overrideFilter === tab.id}
                              className={`px-2.5 py-1 text-xs font-medium rounded-[2px] transition-colors ${
                                overrideFilter === tab.id
                                  ? 'bg-[var(--tk-surface)] text-[var(--tk-text)] shadow-sm'
                                  : 'text-[var(--tk-text-muted)] hover:text-[var(--tk-text)]'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {filteredOverrides.length > 6 && (
                          <button
                            type="button"
                            onClick={() => setShowAllOverrides((prev) => !prev)}
                            className="text-xs font-semibold text-[var(--tk-accent-text)] hover:underline"
                          >
                            {showAllOverrides
                              ? 'Ringkas daftar'
                              : `Tampilkan semua (${filteredOverrides.length})`}
                          </button>
                        )}
                      </div>

                      {visibleOverrides.length > 0 ? (
                        <ul className="divide-y divide-[var(--tk-border-subtle)]">
                          {visibleOverrides.map((ovr) => {
                            const tpl = ovr.shiftId
                              ? shiftTemplates.find((s) => s.id === ovr.shiftId)
                              : undefined;
                            const statusLabel = getNonWorkCategoryLabel(
                              ovr.kategoriStatus ?? 'off',
                            );
                            const durSuffix = ovr.durasiKustomMenit
                              ? ` · ${ovr.durasiKustomMenit} mnt`
                              : '';
                            const desc =
                              ovr.tipe === 'libur'
                                ? ovr.label
                                  ? `${statusLabel} · ${ovr.label}`
                                  : statusLabel
                                : `${ovr.label || tpl?.nama || 'Shift Khusus'} · Masuk ${ovr.jamMasukKustom || tpl?.jamMasuk || '-'}${durSuffix}`;

                            return (
                              <li
                                key={ovr.dateKey}
                                className="py-2.5 flex items-center justify-between gap-4 text-sm"
                              >
                                <div className="min-w-0">
                                  <span className="font-mono tabular-nums font-semibold text-[var(--tk-text)]">
                                    {ovr.dateKey}
                                  </span>
                                  <span className="text-[var(--tk-text-muted)] ml-3">
                                    {desc}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onRemoveDateOverride(ovr.dateKey)}
                                  aria-label={`Hapus penyesuaian tanggal ${ovr.dateKey}`}
                                  className="text-xs font-medium text-[var(--tk-error-text)] hover:underline shrink-0"
                                >
                                  Hapus
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-sm text-[var(--tk-text-subtle)] py-2">
                          Tidak ada penyesuaian tanggal untuk kategori ini.
                        </p>
                      )}
                    </div>
                  );
                })()
              ) : (
                <p className="text-sm text-[var(--tk-text-subtle)]">
                  Belum ada penyesuaian tanggal khusus. Jadwal mengikuti pola
                  mingguan.
                </p>
              )}
            </div>
          </section>

          {/* Section 4: Monthly List & Custom Cycle Generator */}
          <MonthlyRosterPlanner
            state={state}
            shiftNotes={shiftNotes}
            initialViewMode="list"
            onUpsertDateOverride={onUpsertDateOverride}
            onRemoveDateOverride={onRemoveDateOverride}
            onApplyMonthOverrides={onApplyMonthOverrides}
            onClearMonthOverrides={onClearMonthOverrides}
          />
        </>
      )}
    </div>
  );
}
