import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Monitor,
  Moon,
  Palette,
  Sun,
} from 'lucide-react';
import {
  THEME_PRESETS,
  formatHourLabel,
  getThemePresetById,
  type ColorMode,
  type ThemePresetId,
  type ThemeScheduleMode,
  type ThemeSettings,
} from '../utils/theme';

const NIGHT_START_OPTIONS = [16, 17, 18, 19, 20, 21, 22, 23] as const;
const NIGHT_END_OPTIONS = [4, 5, 6, 7, 8, 9] as const;

interface ThemeControlsProps {
  theme: ThemeSettings;
  scheduleMode: ThemeScheduleMode;
  nightStartHour: number;
  nightEndHour: number;
  isNightNow: boolean;
  onSelectAutoMode: () => void;
  onSelectSystemMode?: () => void;
  onChangeColorMode: (mode: ColorMode) => void;
  onChangePreset: (presetId: ThemePresetId) => void;
  onChangeNightWindow?: (nightStartHour: number, nightEndHour: number) => void;
}

function ColorModeToggle({
  colorMode,
  scheduleMode,
  onSelectAutoMode,
  onSelectSystemMode,
  onChangeColorMode,
}: {
  colorMode: ColorMode;
  scheduleMode: ThemeScheduleMode;
  onSelectAutoMode: () => void;
  onSelectSystemMode?: () => void;
  onChangeColorMode: (mode: ColorMode) => void;
}) {
  const isAuto = scheduleMode === 'auto';
  const isSystem = scheduleMode === 'system';
  const isLightManual = scheduleMode === 'manual' && colorMode === 'light';
  const isDarkManual = scheduleMode === 'manual' && colorMode === 'dark';

  return (
    <div
      role="group"
      aria-label="Pilih mode tema otomatis, sistem, terang, atau gelap"
      className="inline-flex flex-wrap items-center gap-0.5 sm:gap-1 p-1 rounded-[3px] bg-[var(--tk-surface-muted)] border border-[var(--tk-border)] shrink-0"
    >
      <button
        type="button"
        data-testid="theme-mode-auto"
        onClick={onSelectAutoMode}
        aria-pressed={isAuto}
        title="Otomatis aktifkan tema gelap saat malam hari"
        className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold rounded-[2px] transition-all whitespace-nowrap shrink-0 ${
          isAuto
            ? 'bg-[var(--tk-surface)] text-[var(--tk-text)] border border-[var(--tk-accent-border)] shadow-sm'
            : 'text-[var(--tk-text-muted)] hover:text-[var(--tk-text)] border border-transparent'
        }`}
      >
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Otomatis</span>
      </button>
      {onSelectSystemMode && (
        <button
          type="button"
          data-testid="theme-mode-system"
          onClick={onSelectSystemMode}
          aria-pressed={isSystem}
          title="Ikuti preferensi tema sistem perangkat"
          className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold rounded-[2px] transition-all whitespace-nowrap shrink-0 ${
            isSystem
              ? 'bg-[var(--tk-surface)] text-[var(--tk-text)] border border-[var(--tk-accent-border)] shadow-sm'
              : 'text-[var(--tk-text-muted)] hover:text-[var(--tk-text)] border border-transparent'
          }`}
        >
          <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Sistem</span>
        </button>
      )}
      <button
        type="button"
        data-testid="theme-mode-light"
        onClick={() => onChangeColorMode('light')}
        aria-pressed={isLightManual}
        className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold rounded-[2px] transition-all whitespace-nowrap shrink-0 ${
          isLightManual
            ? 'bg-[var(--tk-surface)] text-[var(--tk-text)] border border-[var(--tk-accent-border)] shadow-sm'
            : 'text-[var(--tk-text-muted)] hover:text-[var(--tk-text)] border border-transparent'
        }`}
      >
        <Sun className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Terang</span>
      </button>
      <button
        type="button"
        data-testid="theme-mode-dark"
        onClick={() => onChangeColorMode('dark')}
        aria-pressed={isDarkManual}
        className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold rounded-[2px] transition-all whitespace-nowrap shrink-0 ${
          isDarkManual
            ? 'bg-[var(--tk-surface)] text-[var(--tk-text)] border border-[var(--tk-accent-border)] shadow-sm'
            : 'text-[var(--tk-text-muted)] hover:text-[var(--tk-text)] border border-transparent'
        }`}
      >
        <Moon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Gelap</span>
      </button>
    </div>
  );
}

export function ThemePresetGrid({
  theme,
  onChangePreset,
}: {
  theme: ThemeSettings;
  onChangePreset: (presetId: ThemePresetId) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Pilihan 5 tampilan tema untuk wanita dan laki-laki"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
    >
      {THEME_PRESETS.map((preset) => {
        const isActive = theme.presetId === preset.id;
        const previewPalette =
          theme.colorMode === 'dark' ? preset.dark : preset.light;

        return (
          <button
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChangePreset(preset.id)}
            className={`tk-card tk-card-interactive text-left p-3.5 border flex flex-col justify-between gap-3 ${
              isActive
                ? 'bg-[var(--tk-accent-soft)] border-[var(--tk-accent)] ring-1 ring-[var(--tk-accent)]'
                : 'bg-[var(--tk-surface)] border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)]'
            }`}
          >
            <div>
              {/* Dimensional Armor Dual-Theme Preview */}
              <div
                aria-hidden="true"
                className="tk-armor-cut-sm h-10 w-full overflow-hidden border border-[var(--tk-border)] grid grid-cols-4 mb-3 shadow-xs"
              >
                <div style={{ backgroundColor: preset.light.bg }} />
                <div style={{ backgroundColor: preset.dark.surface }} />
                <div
                  className="col-span-2 flex items-center justify-between px-2.5"
                  style={{
                    background: `linear-gradient(135deg, ${previewPalette.accent}, ${preset.secondarySwatchHex})`,
                  }}
                >
                  <span className="h-2.5 w-2.5 rounded-[1px] bg-white/85 shadow-xs" />
                  <span className="h-1.5 w-6 bg-white/75" />
                </div>
              </div>

              <p className="text-[11px] font-medium text-[var(--tk-text-subtle)]">
                <span>{preset.audience}</span>
                <span aria-hidden="true" className="mx-1">
                  ·
                </span>
                <span>{preset.tagline}</span>
              </p>

              <p className="font-display mt-0.5 text-xs font-bold tracking-wide text-[var(--tk-text)]">
                {preset.name}
              </p>

              <p className="mt-1 text-xs text-[var(--tk-text-muted)] leading-relaxed">
                {preset.description}
              </p>
            </div>

            <div className="pt-2 border-t border-[var(--tk-border-subtle)] flex items-center justify-between text-xs font-semibold">
              {isActive ? (
                <span className="inline-flex items-center gap-1 text-[var(--tk-accent-text)]">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Tampilan Aktif
                </span>
              ) : (
                <span className="text-[var(--tk-text-subtle)]">
                  Pilih Tampilan
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function ThemeQuickBar({
  theme,
  scheduleMode,
  nightStartHour,
  nightEndHour,
  isNightNow,
  onSelectAutoMode,
  onSelectSystemMode,
  onChangeColorMode,
  onChangePreset,
}: ThemeControlsProps) {
  const [expanded, setExpanded] = useState(false);
  const activePreset = getThemePresetById(theme.presetId);
  const modeStatusLabel =
    scheduleMode === 'auto'
      ? `Otomatis · ${isNightNow ? 'Malam (Gelap)' : 'Siang (Terang)'} ${formatHourLabel(nightStartHour)}–${formatHourLabel(nightEndHour)}`
      : scheduleMode === 'system'
        ? `Sistem · ${theme.colorMode === 'dark' ? 'Gelap' : 'Terang'}`
        : `Manual · ${theme.colorMode === 'dark' ? 'Gelap' : 'Terang'}`;

  return (
    <section
      aria-label="Pengaturan cepat tema dan tampilan"
      className="tk-animate-card tk-stagger-1 tk-card mb-5 px-4 py-3"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 lg:gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="tk-3d-badge flex h-7 w-7 items-center justify-center bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] shrink-0">
              <Palette
                className="h-3.5 w-3.5 text-[var(--tk-accent-text)]"
                aria-hidden="true"
              />
            </span>
            <span className="hidden sm:inline font-display text-[11px] font-bold uppercase tracking-wider text-[var(--tk-text)] whitespace-nowrap">
              Armor:
            </span>
            <span className="text-xs font-medium text-[var(--tk-text)] sm:text-[var(--tk-text-muted)] truncate">
              {activePreset.name}{' '}
              <span
                data-testid="theme-schedule-status"
                className="hidden sm:inline text-[var(--tk-text-subtle)]"
              >
                · {modeStatusLabel}
              </span>
            </span>
          </div>

          <div className="lg:hidden">
            <ColorModeToggle
              colorMode={theme.colorMode}
              scheduleMode={scheduleMode}
              onSelectAutoMode={onSelectAutoMode}
              onSelectSystemMode={onSelectSystemMode}
              onChangeColorMode={onChangeColorMode}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center lg:justify-end gap-2">
          <div
            role="group"
            aria-label="Pilih cepat 5 tampilan"
            className="grid grid-cols-5 sm:flex sm:flex-wrap items-center gap-1.5 w-full sm:w-auto"
          >
            {THEME_PRESETS.map((preset) => {
              const isActive = theme.presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChangePreset(preset.id)}
                  aria-pressed={isActive}
                  title={`${preset.name} (${preset.audience})`}
                  className={`tk-armor-cut-sm inline-flex items-center justify-center gap-1.5 px-1.5 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-medium border transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[var(--tk-accent-soft)] border-[var(--tk-accent)] text-[var(--tk-accent-text)] font-semibold shadow-xs'
                      : 'bg-[var(--tk-surface)] border-[var(--tk-border)] text-[var(--tk-text-muted)] hover:text-[var(--tk-text)] hover:bg-[var(--tk-surface-hover)]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-[1px] shrink-0 shadow-xs"
                    style={{
                      background: `linear-gradient(135deg, ${preset.swatchHex}, ${preset.secondarySwatchHex})`,
                    }}
                  />
                  <span>{preset.shortName}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="hidden lg:block">
              <ColorModeToggle
                colorMode={theme.colorMode}
                scheduleMode={scheduleMode}
                onSelectAutoMode={onSelectAutoMode}
                onSelectSystemMode={onSelectSystemMode}
                onChangeColorMode={onChangeColorMode}
              />
            </div>

            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[var(--tk-accent-text)] hover:underline whitespace-nowrap shrink-0"
            >
              <span>{expanded ? 'Tutup Detail' : 'Detail 5 Armor'}</span>
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="tk-animate-notice mt-4 pt-4 border-t border-[var(--tk-border)]">
          <ThemePresetGrid theme={theme} onChangePreset={onChangePreset} />
        </div>
      )}
    </section>
  );
}

export function ThemeGallerySection({
  theme,
  scheduleMode,
  nightStartHour,
  nightEndHour,
  isNightNow,
  onSelectAutoMode,
  onSelectSystemMode,
  onChangeColorMode,
  onChangePreset,
  onChangeNightWindow,
}: ThemeControlsProps) {
  return (
    <section
      aria-label="Tampilan dan mode tema aplikasi"
      className="tk-animate-card tk-card p-6 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold uppercase tracking-wide text-[var(--tk-text)]">
            Tampilan Armor &amp; Mode Malam Otomatis
          </h2>
          <p className="mt-1 text-sm text-[var(--tk-text-muted)]">
            Aktifkan mode Otomatis agar tema gelap menyala sendiri saat malam
            hari, ikuti Sistem perangkat, atau pilih Terang/Gelap secara manual.
          </p>
        </div>

        <ColorModeToggle
          colorMode={theme.colorMode}
          scheduleMode={scheduleMode}
          onSelectAutoMode={onSelectAutoMode}
          onSelectSystemMode={onSelectSystemMode}
          onChangeColorMode={onChangeColorMode}
        />
      </div>

      <div className="rounded-[3px] bg-[var(--tk-surface-muted)] border border-[var(--tk-border)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[var(--tk-text)] flex items-center gap-1.5">
            {scheduleMode === 'system' ? (
              <Monitor
                className="h-3.5 w-3.5 text-[var(--tk-accent-text)] shrink-0"
                aria-hidden="true"
              />
            ) : (
              <Clock
                className="h-3.5 w-3.5 text-[var(--tk-accent-text)] shrink-0"
                aria-hidden="true"
              />
            )}
            <span>
              {scheduleMode === 'auto'
                ? `Deteksi Waktu Aktif (${formatHourLabel(nightStartHour)} – ${formatHourLabel(nightEndHour)})`
                : scheduleMode === 'system'
                  ? 'Mengikuti Preferensi Sistem Perangkat'
                  : 'Mode Manual Aktif'}
            </span>
          </p>
          <p
            data-testid="theme-night-schedule-summary"
            className="text-xs text-[var(--tk-text-muted)]"
          >
            {scheduleMode === 'auto'
              ? isNightNow
                ? `Jam lokal saat ini termasuk waktu malam — tema Gelap diaktifkan otomatis.`
                : `Jam lokal saat ini termasuk waktu siang/sore — tema Terang aktif, dan akan beralih ke Gelap pukul ${formatHourLabel(nightStartHour)}.`
              : scheduleMode === 'system'
                ? `Tema mengikuti pengaturan OS perangkat Anda (saat ini: ${theme.colorMode === 'dark' ? 'Gelap' : 'Terang'}).`
                : `Mode manual (${theme.colorMode === 'dark' ? 'Gelap' : 'Terang'}) sedang dipilih. Klik "Otomatis" untuk mengaktifkan peralihan malam pukul ${formatHourLabel(nightStartHour)}–${formatHourLabel(nightEndHour)}.`}
          </p>
        </div>

        {onChangeNightWindow && (
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div>
              <label
                htmlFor="night-start-hour"
                className="block text-[11px] font-medium text-[var(--tk-text-subtle)]"
              >
                Mulai Malam (Gelap)
              </label>
              <select
                id="night-start-hour"
                data-testid="select-night-start-hour"
                value={nightStartHour}
                onChange={(e) =>
                  onChangeNightWindow(Number(e.target.value), nightEndHour)
                }
                className="mt-1 px-2.5 py-1.5 text-xs font-mono bg-[var(--tk-surface)] border border-[var(--tk-border)] rounded-[2px] text-[var(--tk-text)] focus:outline-none focus:border-[var(--tk-accent)]"
              >
                {NIGHT_START_OPTIONS.map((hr) => (
                  <option key={hr} value={hr}>
                    {formatHourLabel(hr)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="night-end-hour"
                className="block text-[11px] font-medium text-[var(--tk-text-subtle)]"
              >
                Berakhir Pagi (Terang)
              </label>
              <select
                id="night-end-hour"
                data-testid="select-night-end-hour"
                value={nightEndHour}
                onChange={(e) =>
                  onChangeNightWindow(nightStartHour, Number(e.target.value))
                }
                className="mt-1 px-2.5 py-1.5 text-xs font-mono bg-[var(--tk-surface)] border border-[var(--tk-border)] rounded-[2px] text-[var(--tk-text)] focus:outline-none focus:border-[var(--tk-accent)]"
              >
                {NIGHT_END_OPTIONS.map((hr) => (
                  <option key={hr} value={hr}>
                    {formatHourLabel(hr)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <ThemePresetGrid theme={theme} onChangePreset={onChangePreset} />
    </section>
  );
}
