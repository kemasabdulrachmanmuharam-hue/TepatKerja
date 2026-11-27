import { useRef, useState, type ChangeEvent } from 'react';
import {
  BellRing,
  CalendarPlus,
  Cloud,
  Download,
  FileSpreadsheet,
  Navigation,
  Play,
  RotateCcw,
  Upload,
  UserCheck,
  Volume2,
} from 'lucide-react';
import { downloadDepartureLogsCsv } from '../utils/analytics';
import { formatMinutesToTime, parseTimeToMinutes } from '../utils/scheduleEngine';
import type {
  ColorMode,
  ThemePresetId,
  ThemeScheduleMode,
  ThemeSettings,
} from '../utils/theme';
import { downloadUpcomingIcs } from '../utils/workspaceFeatures';
import { PWAInstallButton } from './PWAInstallBanner';
import { ThemeGallerySection } from './ThemeSwitcher';
import { tkInputClass, tkSelectClass } from './ui/DesignSystem';
import type {
  AlarmToneId,
  CommuteAndReminderConfig,
  EffectiveCommuteSummary,
  LiveCommuteConditions,
  ReminderStageId,
  TepatKerjaState,
} from '../types/schedule';

interface CommuteAlarmViewProps {
  state: TepatKerjaState;
  shiftNotes?: Record<string, string>;
  theme: ThemeSettings;
  scheduleMode: ThemeScheduleMode;
  nightStartHour: number;
  nightEndHour: number;
  isNightNow: boolean;
  isSignedIn: boolean;
  accountLabel: string | null;
  onOpenAccount: () => void;
  onReplayIntro: () => void;
  onSelectAutoThemeMode: () => void;
  onSelectSystemMode?: () => void;
  onChangeColorMode: (mode: ColorMode) => void;
  onChangePreset: (presetId: ThemePresetId) => void;
  onChangeNightWindow: (nightStartHour: number, nightEndHour: number) => void;
  onUpdateConfig: (nextConfig: CommuteAndReminderConfig) => void;
  onPreviewTone: (tone: AlarmToneId, volume: number) => void;
  onSimulateAlarm: () => void;
  onImportState: (imported: TepatKerjaState) => void;
  onResetDefault: () => void;
  commuteSummary: EffectiveCommuteSummary;
  liveCommute: LiveCommuteConditions | null;
}

const COMMUTE_PRESETS = [
  { id: 'motor', label: 'Motor (25 mnt)', travel: 25, buffer: 10 },
  { id: 'mobil', label: 'Mobil (40 mnt)', travel: 40, buffer: 15 },
  { id: 'umum', label: 'Transportasi Umum (50 mnt)', travel: 50, buffer: 15 },
] as const;

const STAGE_OPTIONS: Array<{
  id: ReminderStageId;
  title: string;
  desc: string;
}> = [
  {
    id: 'prep_start',
    title: 'Saat Mulai Bersiap',
    desc: 'Pengingat awal agar ada cukup waktu mandi, sarapan, dan berkemas.',
  },
  {
    id: 'depart_soon',
    title: '15 Menit Sebelum Berangkat',
    desc: 'Peringatan persiapan akhir sebelum keluar rumah.',
  },
  {
    id: 'depart_now',
    title: 'Tepat Jam Berangkat',
    desc: 'Alarm utama saat harus berangkat agar tidak terlambat di jalan.',
  },
  {
    id: 'checkin_soon',
    title: '10 Menit Sebelum Jam Masuk',
    desc: 'Pengingat terakhir menjelang waktu absen atau jam masuk kerja.',
  },
];

export function CommuteAlarmView({
  state,
  shiftNotes = {},
  theme,
  scheduleMode,
  nightStartHour,
  nightEndHour,
  isNightNow,
  isSignedIn,
  accountLabel,
  onOpenAccount,
  onReplayIntro,
  onSelectAutoThemeMode,
  onSelectSystemMode,
  onChangeColorMode,
  onChangePreset,
  onChangeNightWindow,
  onUpdateConfig,
  onPreviewTone,
  onSimulateAlarm,
  onImportState,
  onResetDefault,
  commuteSummary,
  liveCommute,
}: CommuteAlarmViewProps) {
  const { config } = state;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);

  // Sample calculation preview for 08:00 check-in
  const sampleCheckInMin = parseTimeToMinutes('08:00') ?? 480;
  const sampleDepartMin =
    sampleCheckInMin -
    (config.durasiPerjalananMenit + config.bufferKeterlambatanMenit);
  const samplePrepMin = sampleDepartMin - config.durasiPersiapanMenit;

  const handleNumberChange = (
    field:
      | 'durasiPersiapanMenit'
      | 'durasiPerjalananMenit'
      | 'bufferKeterlambatanMenit',
    rawValue: string,
  ) => {
    const parsed = Math.max(0, Math.min(240, Number(rawValue) || 0));
    onUpdateConfig({
      ...config,
      [field]: parsed,
    });
  };

  const handleToggleStage = (stageId: ReminderStageId) => {
    onUpdateConfig({
      ...config,
      tahapanAktif: {
        ...config.tahapanAktif,
        [stageId]: !config.tahapanAktif[stageId],
      },
    });
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tepatkerja-cadangan-jadwal.json';
    a.click();
    URL.revokeObjectURL(url);
    setBackupNotice('File cadangan jadwal berhasil diunduh.');
  };

  const handleExportCsv = () => {
    const logs = state.departureLogs ?? [];
    if (logs.length === 0) {
      setBackupNotice('Belum ada riwayat keberangkatan untuk diekspor ke CSV.');
      return;
    }
    const filename = downloadDepartureLogsCsv(logs);
    setBackupNotice(
      `Riwayat keberangkatan (${logs.length} hari) berhasil diekspor ke ${filename}.`,
    );
  };

  const handleExportIcs = () => {
    const { filename, eventCount } = downloadUpcomingIcs(state, 30, shiftNotes);
    if (eventCount === 0) {
      setBackupNotice(
        'Belum ada jadwal shift aktif dalam 30 hari ke depan untuk diekspor ke .ics.',
      );
      return;
    }
    setBackupNotice(
      `Jadwal shift 30 hari (${eventCount} hari kerja) berhasil diekspor ke ${filename} untuk Google Calendar / kalender HP.`,
    );
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      onImportState(parsed as TepatKerjaState);
      setBackupNotice('Cadangan jadwal berhasil dipulihkan.');
    } catch {
      setBackupNotice('Gagal membaca file. Pastikan format JSON berasal dari TepatKerja.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Personal Account & Experience Quick Card */}
      <section
        aria-label="Akun pribadi dan pengalaman aplikasi"
        className="tk-card tk-card-interactive rounded-[3px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3.5">
          {isSignedIn ? (
            <span className="tk-3d-badge flex h-10 w-10 items-center justify-center rounded-[3px] bg-[var(--tk-success-soft)] border border-[var(--tk-success-border)] text-[var(--tk-success-text)] shrink-0">
              <Cloud className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : (
            <span className="tk-3d-badge flex h-10 w-10 items-center justify-center rounded-[3px] bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] text-[var(--tk-accent-text)] shrink-0">
              <UserCheck className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <div>
            <h1 className="font-display text-sm sm:text-base font-bold uppercase tracking-wide text-[var(--tk-text)]">
              {isSignedIn
                ? `Akun Pribadi Aktif (${accountLabel || 'Pengguna'})`
                : 'Akun Pribadi & Sinkronisasi Cloud'}
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-[var(--tk-text-muted)]">
              {isSignedIn
                ? 'Jadwal shift, riwayat keberangkatan, checklist, catatan, dan tema Anda tersinkronisasi pribadi di cloud.'
                : 'Masuk dengan Google untuk menyimpan seluruh jadwal dan profil kerja Anda secara pribadi di berbagai perangkat.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenAccount}
            className="tk-cta-3d tk-armor-cut-sm inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px] whitespace-nowrap"
          >
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            {isSignedIn ? 'Kelola Akun Pribadi' : 'Masuk / Buat Akun'}
          </button>
          <button
            type="button"
            onClick={onReplayIntro}
            className="tk-armor-cut-sm inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] whitespace-nowrap transition-colors"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            Putar Ulang Intro
          </button>
        </div>
      </section>

      {/* 5 Tailored Themes + Light/Dark/System/Auto Night Mode Gallery */}
      <ThemeGallerySection
        theme={theme}
        scheduleMode={scheduleMode}
        nightStartHour={nightStartHour}
        nightEndHour={nightEndHour}
        isNightNow={isNightNow}
        onSelectAutoMode={onSelectAutoThemeMode}
        onSelectSystemMode={onSelectSystemMode}
        onChangeColorMode={onChangeColorMode}
        onChangePreset={onChangePreset}
        onChangeNightWindow={onChangeNightWindow}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Commute & Preparation Calculator */}
        <section
          aria-label="Pengaturan waktu persiapan dan perjalanan"
          className="lg:col-span-6 tk-card rounded-[3px] p-6"
        >
          <h1 className="font-display text-base font-bold uppercase tracking-wide text-[var(--tk-text)]">
            Kalkulasi Perjalanan &amp; Persiapan
          </h1>
          <p className="mt-1 text-sm text-[var(--tk-text-muted)]">
            Waktu berangkat dihitung otomatis dari jam masuk dikurangi durasi
            perjalanan dan cadangan keterlambatan.
          </p>

          {commuteSummary.isAutoAdjusted && liveCommute && (
            <div className="mt-4 rounded-[3px] bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] p-3 text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-bold text-[var(--tk-accent-text)]">
                  <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                  Penyesuaian Cuaca &amp; Lalu Lintas Aktif
                </span>
                <button
                  type="button"
                  onClick={onOpenAccount}
                  className="font-semibold text-[var(--tk-accent-text)] hover:underline"
                >
                  Atur Rute di Profil
                </button>
              </div>
              <p className="text-[var(--tk-text-muted)]">
                Jadwal aktif memakai{' '}
                <span className="font-mono font-semibold text-[var(--tk-text)]">
                  {commuteSummary.effectiveTravelMinutes} mnt perjalanan +{' '}
                  {commuteSummary.effectiveBufferMinutes} mnt buffer
                </span>{' '}
                ({commuteSummary.adjustmentReasons.join(' · ')}). Angka di bawah tetap
                tersimpan sebagai acuan manual Anda.
              </p>
            </div>
          )}

          {/* Mode Presets */}
          <div className="mt-4">
            <p className="text-xs font-medium text-[var(--tk-text-subtle)]">
              Preset Moda Transportasi
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COMMUTE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    onUpdateConfig({
                      ...config,
                      durasiPerjalananMenit: preset.travel,
                      bufferKeterlambatanMenit: preset.buffer,
                    })
                  }
                  className="tk-armor-cut-sm px-3 py-1.5 text-xs font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface-muted)] border border-[var(--tk-border)] hover:opacity-90 rounded-[2px] transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="cfg-prep"
                className="block text-sm font-medium text-[var(--tk-text-muted)]"
              >
                Durasi Persiapan Sebelum Berangkat (menit)
              </label>
              <input
                id="cfg-prep"
                type="number"
                min={0}
                max={240}
                step={5}
                value={config.durasiPersiapanMenit}
                onChange={(e) =>
                  handleNumberChange('durasiPersiapanMenit', e.target.value)
                }
                className={`mt-1.5 font-mono tabular-nums py-2.5 ${tkInputClass}`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="cfg-travel"
                  className="block text-sm font-medium text-[var(--tk-text-muted)]"
                >
                  Estimasi Perjalanan (menit)
                </label>
                <input
                  id="cfg-travel"
                  type="number"
                  min={0}
                  max={240}
                  step={5}
                  value={config.durasiPerjalananMenit}
                  onChange={(e) =>
                    handleNumberChange('durasiPerjalananMenit', e.target.value)
                  }
                  className={`mt-1.5 font-mono tabular-nums py-2.5 ${tkInputClass}`}
                />
              </div>

              <div>
                <label
                  htmlFor="cfg-buffer"
                  className="block text-sm font-medium text-[var(--tk-text-muted)]"
                >
                  Buffer Keterlambatan (menit)
                </label>
                <input
                  id="cfg-buffer"
                  type="number"
                  min={0}
                  max={120}
                  step={5}
                  value={config.bufferKeterlambatanMenit}
                  onChange={(e) =>
                    handleNumberChange(
                      'bufferKeterlambatanMenit',
                      e.target.value,
                    )
                  }
                  className={`mt-1.5 font-mono tabular-nums py-2.5 ${tkInputClass}`}
                />
              </div>
            </div>
          </div>

          {/* Live Calculation Preview */}
          <div className="mt-6 pt-5 border-t border-[var(--tk-border)]">
            <p className="text-xs font-medium text-[var(--tk-text-subtle)]">
              Simulasi untuk jam masuk pukul 08:00
            </p>
            <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-[var(--tk-text-subtle)] block">
                  Mulai Bersiap
                </span>
                <span className="font-display tabular-nums text-lg font-bold text-[var(--tk-text)]">
                  {formatMinutesToTime(samplePrepMin)}
                </span>
              </div>
              <div>
                <span className="text-xs text-[var(--tk-text-subtle)] block">
                  Jam Berangkat
                </span>
                <span className="font-display tabular-nums text-lg font-bold text-[var(--tk-accent-text)]">
                  {formatMinutesToTime(sampleDepartMin)}
                </span>
              </div>
              <div>
                <span className="text-xs text-[var(--tk-text-subtle)] block">Jam Masuk</span>
                <span className="font-display tabular-nums text-lg font-bold text-[var(--tk-text)]">
                  08:00
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Reminder Stages & Audio Settings */}
        <section
          aria-label="Tahapan pengingat dan nada alarm"
          className="lg:col-span-6 tk-card rounded-[3px] p-6 space-y-6"
        >
          <div>
            <h2 className="font-display text-base font-bold uppercase tracking-wide text-[var(--tk-text)]">
              Tahapan Pengingat Bertahap
            </h2>
            <p className="mt-1 text-sm text-[var(--tk-text-muted)]">
              Aktifkan titik waktu mana saja yang memicu alarm suara dan
              notifikasi browser.
            </p>

            <div className="mt-4 divide-y divide-[var(--tk-border-subtle)] border-y border-[var(--tk-border)]">
              {STAGE_OPTIONS.map((stage) => {
                const checked = config.tahapanAktif[stage.id];
                return (
                  <label
                    key={stage.id}
                    htmlFor={`stage-${stage.id}`}
                    className="py-3 flex items-start gap-3 cursor-pointer"
                  >
                    <input
                      id={`stage-${stage.id}`}
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleStage(stage.id)}
                      className="mt-1 h-4 w-4 rounded border-[var(--tk-border)] accent-[var(--tk-accent)]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[var(--tk-text)]">
                        {stage.title}
                      </span>
                      <span className="block text-xs text-[var(--tk-text-subtle)] mt-0.5">
                        {stage.desc}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-[var(--tk-text)]">
              Suara Alarm &amp; Durasi Tunda
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="cfg-tone"
                  className="block text-xs font-medium text-[var(--tk-text-muted)]"
                >
                  Jenis Nada Alarm
                </label>
                <select
                  id="cfg-tone"
                  value={config.nadaAlarm}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      nadaAlarm: e.target.value as AlarmToneId,
                    })
                  }
                  className={`mt-1 ${tkSelectClass}`}
                >
                  <option value="lonceng">Lonceng Lembut</option>
                  <option value="ritmis">Nada Ritmis</option>
                  <option value="tegas">Alarm Tegas</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="cfg-snooze"
                  className="block text-xs font-medium text-[var(--tk-text-muted)]"
                >
                  Durasi Tunda (Snooze)
                </label>
                <select
                  id="cfg-snooze"
                  value={config.snoozeMenit}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      snoozeMenit: Number(e.target.value) as 5 | 10 | 15,
                    })
                  }
                  className={`mt-1 ${tkSelectClass}`}
                >
                  <option value={5}>5 Menit</option>
                  <option value={10}>10 Menit</option>
                  <option value={15}>15 Menit</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-[var(--tk-text-muted)]">
                <label htmlFor="cfg-volume">Volume Alarm</label>
                <span className="font-mono tabular-nums">
                  {Math.round(config.volume * 100)}%
                </span>
              </div>
              <input
                id="cfg-volume"
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={config.volume}
                onChange={(e) =>
                  onUpdateConfig({
                    ...config,
                    volume: Number(e.target.value),
                  })
                }
                className="mt-1.5 w-full accent-[var(--tk-accent)]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onPreviewTone(config.nadaAlarm, config.volume)}
                className="tk-armor-cut-sm inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] transition-colors"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                Putar Pratinjau Nada
              </button>

              <button
                type="button"
                onClick={onSimulateAlarm}
                className="tk-cta-3d tk-armor-cut-sm inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px]"
              >
                <BellRing className="h-4 w-4" aria-hidden="true" />
                Simulasikan Alarm Sekarang
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Local Data Backup & Reset */}
      <section
        aria-label="Cadangan dan reset data browser"
        className="tk-card rounded-[3px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="font-display text-sm sm:text-base font-bold uppercase tracking-wide text-[var(--tk-text)]">
            Data Tersimpan di Browser
          </h2>
          <p className="mt-1 text-sm text-[var(--tk-text-muted)]">
            Semua jadwal tersimpan otomatis tanpa login. Anda dapat mengekspor
            cadangan ke file JSON atau mengembalikan ke pengaturan awal.
          </p>
          {backupNotice && (
            <p role="status" className="mt-2 text-xs font-medium text-[var(--tk-accent-text)]">
              {backupNotice}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <PWAInstallButton variant="secondary" />

          <button
            type="button"
            data-testid="settings-export-ics-button"
            onClick={handleExportIcs}
            className="tk-armor-cut-sm inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[var(--tk-accent-text)] bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] hover:opacity-90 rounded-[2px] whitespace-nowrap"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Ekspor Jadwal .ics
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={(state.departureLogs ?? []).length === 0}
            className="tk-armor-cut-sm inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            Ekspor Riwayat CSV
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="tk-armor-cut-sm inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] whitespace-nowrap"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Ekspor JSON
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="tk-armor-cut-sm inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] whitespace-nowrap"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Impor JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="tk-armor-cut-sm inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[var(--tk-error-text)] bg-[var(--tk-surface)] border border-[var(--tk-error-border)] hover:bg-[var(--tk-error-soft)] rounded-[2px] whitespace-nowrap transition-colors"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset Default
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetDefault();
                  setConfirmReset(false);
                  setBackupNotice('Pengaturan dikembalikan ke bawaan awal.');
                }}
                className="tk-armor-cut-sm px-3.5 py-2 text-sm font-semibold text-white bg-[var(--tk-error)] hover:opacity-90 rounded-[2px] whitespace-nowrap"
              >
                Ya, Reset Sekarang
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-2 text-sm font-medium text-[var(--tk-text-subtle)] hover:text-[var(--tk-text)]"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
