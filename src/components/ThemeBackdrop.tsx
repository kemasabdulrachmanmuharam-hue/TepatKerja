import { useMemo } from 'react';
import { getThemePresetById, type ThemeSettings } from '../utils/theme';
import { getTimeOfDayMood } from '../utils/workspaceFeatures';

interface ThemeBackdropProps {
  theme: ThemeSettings;
  now: Date;
}

export function ThemeBackdrop({ theme, now }: ThemeBackdropProps) {
  const preset = getThemePresetById(theme.presetId);
  const mood = useMemo(() => getTimeOfDayMood(now), [now]);
  const isDark = theme.colorMode === 'dark';

  const secondaryGlowByMood = useMemo(() => {
    switch (mood.id) {
      case 'pagi':
        return isDark ? 'rgba(255, 138, 28, 0.16)' : 'rgba(234, 88, 12, 0.10)';
      case 'siang':
        return isDark ? 'rgba(255, 183, 3, 0.14)' : 'rgba(217, 119, 6, 0.10)';
      case 'sore':
        return isDark ? 'rgba(255, 122, 26, 0.2)' : 'rgba(234, 88, 12, 0.12)';
      case 'malam':
      default:
        return isDark ? 'rgba(255, 102, 0, 0.18)' : 'rgba(194, 65, 12, 0.10)';
    }
  }, [mood.id, isDark]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Top-right Psycho-Frame energy flare */}
      <div
        className="tk-float-orb absolute -top-28 -right-20 h-[520px] w-[520px] rounded-full opacity-80 transition-colors duration-300"
        style={{
          background: `radial-gradient(circle at 38% 35%, ${preset.swatchHex}${
            isDark ? '38' : '22'
          } 0%, ${preset.secondarySwatchHex}${isDark ? '1C' : '12'} 42%, transparent 72%)`,
        }}
      />

      {/* Bottom-left atmospheric hangar flare */}
      <div
        className="absolute -bottom-36 -left-24 h-[520px] w-[520px] rounded-full transition-colors duration-300"
        style={{
          background: `radial-gradient(circle, ${secondaryGlowByMood} 0%, transparent 72%)`,
        }}
      />

      {/* Giant Background Typography Watermark mirroring RX-0 Banshee Reference */}
      <div className="hidden md:flex absolute inset-x-0 top-16 justify-center select-none overflow-hidden">
        <span
          className="font-display text-[10vw] font-black uppercase tracking-[0.14em] whitespace-nowrap opacity-[0.035] dark:opacity-[0.045]"
          style={{ color: 'var(--tk-accent-text)' }}
        >
          RX-02 BANSHEE
        </span>
      </div>

      {/* Fine-line Mecha Technical Blueprint Schematic Overlay */}
      <svg
        viewBox="0 0 1440 900"
        fill="none"
        className="hidden lg:block absolute inset-0 w-full h-full opacity-[0.07] dark:opacity-[0.12]"
      >
        <g stroke="var(--tk-accent-text)" strokeWidth="1">
          {/* Left Schematic Reticle & Shoulder Geometry */}
          <circle cx="180" cy="260" r="140" strokeDasharray="8 6" />
          <circle cx="180" cy="260" r="98" strokeOpacity="0.6" />
          <path d="M40 260H320M180 120V400" strokeOpacity="0.45" />
          <path d="M90 190L135 145H225L270 190L248 250H112L90 190Z" />

          {/* Right Banshee V-Fin & Torso Blueprint Lines */}
          <path d="M1260 190L1090 110L1135 165L1245 220" />
          <path d="M1260 190L1430 110L1385 165L1275 220" />
          <path d="M1160 270L1210 220H1310L1360 270L1335 390H1185L1160 270Z" />
          <circle cx="1260" cy="315" r="54" strokeDasharray="4 4" />
          <path d="M1110 470H1410M1140 500H1380" strokeOpacity="0.4" />
        </g>
      </svg>

      {/* Chamfered Hangar Armor Geometric Silhouettes */}
      <div
        className="hidden lg:block tk-float-orb absolute top-28 right-[12%] h-28 w-28 tk-armor-cut border border-[var(--tk-glass-border)] opacity-35 dark:opacity-30 rotate-12"
        style={{
          background: `linear-gradient(135deg, ${preset.swatchHex}28, transparent)`,
        }}
      />
      <div
        className="hidden lg:block absolute bottom-24 right-[7%] h-16 w-16 tk-armor-cut border border-[var(--tk-glass-border)] opacity-30 dark:opacity-25 -rotate-12"
        style={{
          background: `linear-gradient(135deg, ${preset.secondarySwatchHex}2A, transparent)`,
        }}
      />

      {/* Hangar Technical Engineering Grid */}
      <div
        className="absolute inset-0 opacity-[0.38] dark:opacity-[0.24]"
        style={{
          backgroundImage: `linear-gradient(to right, var(--tk-border-subtle) 1px, transparent 1px), linear-gradient(to bottom, var(--tk-border-subtle) 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
          maskImage:
            'radial-gradient(ellipse 90% 75% at 50% 25%, black 35%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 90% 75% at 50% 25%, black 35%, transparent 100%)',
        }}
      />
    </div>
  );
}
