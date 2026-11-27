export type ColorMode = 'light' | 'dark';

export type ThemeScheduleMode = 'auto' | 'manual' | 'system';

export type ThemePresetId =
  | 'klasik'
  | 'grafit'
  | 'karbon'
  | 'mawar'
  | 'sage';

export type ThemeAudience = 'Unisex' | 'Laki-Laki' | 'Wanita';

export interface ThemeSettings {
  colorMode: ColorMode;
  presetId: ThemePresetId;
}

export const DEFAULT_NIGHT_START_HOUR = 18;
export const DEFAULT_NIGHT_END_HOUR = 6;

export function clampNightStartHour(hour: number): number {
  if (!Number.isFinite(hour)) {
    return DEFAULT_NIGHT_START_HOUR;
  }
  return Math.max(16, Math.min(23, Math.round(hour)));
}

export function clampNightEndHour(hour: number): number {
  if (!Number.isFinite(hour)) {
    return DEFAULT_NIGHT_END_HOUR;
  }
  return Math.max(4, Math.min(9, Math.round(hour)));
}

export function isNightTime(
  date: Date = new Date(),
  nightStartHour: number = DEFAULT_NIGHT_START_HOUR,
  nightEndHour: number = DEFAULT_NIGHT_END_HOUR,
): boolean {
  const start = clampNightStartHour(nightStartHour);
  const end = clampNightEndHour(nightEndHour);
  const hour = date.getHours();
  if (start > end) {
    return hour >= start || hour < end;
  }
  return hour >= start && hour < end;
}

export function getSystemColorMode(): ColorMode {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
  ) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return 'light';
}

export function resolveEffectiveColorMode(params: {
  scheduleMode: ThemeScheduleMode;
  manualColorMode: ColorMode;
  now?: Date;
  nightStartHour?: number;
  nightEndHour?: number;
  systemColorMode?: ColorMode;
}): ColorMode {
  if (params.scheduleMode === 'manual') {
    return params.manualColorMode;
  }
  if (params.scheduleMode === 'system') {
    return params.systemColorMode ?? getSystemColorMode();
  }
  return isNightTime(
    params.now ?? new Date(),
    params.nightStartHour ?? DEFAULT_NIGHT_START_HOUR,
    params.nightEndHour ?? DEFAULT_NIGHT_END_HOUR,
  )
    ? 'dark'
    : 'light';
}

export function formatHourLabel(hour: number): string {
  const normalized = ((Math.round(hour) % 24) + 24) % 24;
  return `${String(normalized).padStart(2, '0')}:00`;
}

export interface ThemePaletteTokens {
  bg: string;
  surface: string;
  surfaceElevated: string;
  surfaceGlass: string;
  surfaceMuted: string;
  surfaceHover: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  glassBorder: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryHover: string;
  secondary: string;
  secondarySoft: string;
  accent: string;
  accentHover: string;
  accentText: string;
  accentSoft: string;
  accentBorder: string;
  success: string;
  successSoft: string;
  successBorder: string;
  successText: string;
  warning: string;
  warningSoft: string;
  warningBorder: string;
  warningText: string;
  error: string;
  errorSoft: string;
  errorBorder: string;
  errorText: string;
  info: string;
  infoSoft: string;
  infoBorder: string;
  infoText: string;
  disabledBg: string;
  disabledText: string;
  focusRing: string;
  shadowCard: string;
  shadowElevated: string;
  shadowGlow: string;
  heroGradient: string;
  chartGrid: string;
  chartTick: string;
  chartAxis: string;
  chartCursor: string;
  chartRef: string;
  mechaRed: string;
  mechaGold: string;
  mechaVisor: string;
}

export interface ThemePresetDefinition {
  id: ThemePresetId;
  name: string;
  shortName: string;
  audience: ThemeAudience;
  tagline: string;
  description: string;
  swatchHex: string;
  secondarySwatchHex: string;
  light: ThemePaletteTokens;
  dark: ThemePaletteTokens;
}

export const THEME_STORAGE_KEY = 'tepatkerja_theme_v1';

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  colorMode: 'dark',
  presetId: 'karbon',
};

const SEMANTIC_STATUS_LIGHT = {
  success: '#059669',
  successSoft: '#ECFDF5',
  successBorder: '#A7F3D0',
  successText: '#065F46',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#92400E',
  error: '#DC2626',
  errorSoft: '#FEF2F2',
  errorBorder: '#FECACA',
  errorText: '#991B1B',
  info: '#0284C7',
  infoSoft: '#F0F9FF',
  infoBorder: '#BAE6FD',
  infoText: '#075985',
  disabledBg: '#F1F5F9',
  disabledText: '#94A3B8',
};

const SEMANTIC_STATUS_DARK = {
  success: '#10B981',
  successSoft: 'rgba(16, 185, 129, 0.14)',
  successBorder: 'rgba(52, 211, 153, 0.34)',
  successText: '#6EE7B7',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.14)',
  warningBorder: 'rgba(251, 191, 36, 0.34)',
  warningText: '#FCD34D',
  error: '#EF4444',
  errorSoft: 'rgba(239, 68, 68, 0.14)',
  errorBorder: 'rgba(248, 113, 113, 0.34)',
  errorText: '#FCA5A5',
  info: '#38BDF8',
  infoSoft: 'rgba(56, 189, 248, 0.14)',
  infoBorder: 'rgba(56, 189, 248, 0.34)',
  infoText: '#7DD3FC',
  disabledBg: 'rgba(30, 41, 59, 0.55)',
  disabledText: '#64748B',
};

export const THEME_PRESETS: ThemePresetDefinition[] = [
  {
    id: 'klasik',
    name: 'RX-78 Putih Kobalt',
    shortName: 'RX-78',
    audience: 'Unisex',
    tagline: 'Armor Tiga Warna',
    description:
      'Palet armor putih keramik, biru kobalt, merah kokpit, dan aksen emas V-fin khas unit utama Gundam.',
    swatchHex: '#1D4ED8',
    secondarySwatchHex: '#DC2626',
    light: {
      ...SEMANTIC_STATUS_LIGHT,
      bg: '#EEF3F9',
      surface: '#FFFFFF',
      surfaceElevated: '#FFFFFF',
      surfaceGlass: 'rgba(255, 255, 255, 0.88)',
      surfaceMuted: '#E4ECF6',
      surfaceHover: '#F5F8FD',
      border: '#CBD6E6',
      borderSubtle: '#E5ECF4',
      borderStrong: '#9DB1CE',
      glassBorder: 'rgba(203, 214, 230, 0.85)',
      text: '#0C1424',
      textMuted: '#3E4C63',
      textSubtle: '#5B6B82',
      primary: '#1D4ED8',
      primaryHover: '#1E40AF',
      secondary: '#0EA5E9',
      secondarySoft: '#E0F2FE',
      accent: '#1D4ED8',
      accentHover: '#1E40AF',
      accentText: '#1D4ED8',
      accentSoft: '#EFF6FF',
      accentBorder: '#BFDBFE',
      focusRing: 'rgba(29, 78, 216, 0.34)',
      shadowCard:
        '0 1px 2px rgba(12, 20, 36, 0.05), 0 10px 26px -12px rgba(29, 78, 216, 0.14)',
      shadowElevated:
        '0 4px 12px rgba(12, 20, 36, 0.06), 0 20px 44px -14px rgba(29, 78, 216, 0.2)',
      shadowGlow: '0 12px 28px -10px rgba(29, 78, 216, 0.36)',
      heroGradient:
        'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(239, 246, 255, 0.94) 58%, rgba(254, 242, 242, 0.72) 100%)',
      chartGrid: '#DCE4F0',
      chartTick: '#475569',
      chartAxis: '#BAC8DB',
      chartCursor: 'rgba(239, 246, 255, 0.78)',
      chartRef: '#1D4ED8',
      mechaRed: '#DC2626',
      mechaGold: '#D97706',
      mechaVisor: '#10B981',
    },
    dark: {
      ...SEMANTIC_STATUS_DARK,
      bg: '#070B14',
      surface: '#0E1525',
      surfaceElevated: '#131D33',
      surfaceGlass: 'rgba(14, 21, 37, 0.88)',
      surfaceMuted: '#17233B',
      surfaceHover: '#1C2A47',
      border: '#243350',
      borderSubtle: '#1A263D',
      borderStrong: '#364C75',
      glassBorder: 'rgba(96, 165, 250, 0.22)',
      text: '#F4F7FC',
      textMuted: '#C9D5E8',
      textSubtle: '#8FA2BE',
      primary: '#3B82F6',
      primaryHover: '#2563EB',
      secondary: '#38BDF8',
      secondarySoft: 'rgba(56, 189, 248, 0.15)',
      accent: '#2563EB',
      accentHover: '#1D4ED8',
      accentText: '#60A5FA',
      accentSoft: 'rgba(37, 99, 235, 0.2)',
      accentBorder: 'rgba(96, 165, 250, 0.4)',
      focusRing: 'rgba(96, 165, 250, 0.4)',
      shadowCard:
        '0 1px 0 0 rgba(255, 255, 255, 0.05) inset, 0 12px 30px -12px rgba(2, 6, 23, 0.8)',
      shadowElevated:
        '0 1px 0 0 rgba(255, 255, 255, 0.07) inset, 0 24px 48px -14px rgba(2, 6, 23, 0.9)',
      shadowGlow: '0 12px 32px -10px rgba(37, 99, 235, 0.48)',
      heroGradient:
        'linear-gradient(135deg, rgba(14, 21, 37, 0.97) 0%, rgba(19, 29, 51, 0.94) 58%, rgba(45, 20, 32, 0.86) 100%)',
      chartGrid: '#1C2840',
      chartTick: '#CBD5E1',
      chartAxis: '#334668',
      chartCursor: 'rgba(30, 41, 59, 0.65)',
      chartRef: '#60A5FA',
      mechaRed: '#EF4444',
      mechaGold: '#F59E0B',
      mechaVisor: '#34D399',
    },
  },
  {
    id: 'grafit',
    name: 'Zeta Baja Taktis',
    shortName: 'Zeta',
    audience: 'Laki-Laki',
    tagline: 'Baja & Sensor Biru',
    description:
      'Palet abu titanium dengan aksen biru laut dan sensor optik cyan untuk tampilan kokpit yang tegas dan presisi.',
    swatchHex: '#0369A1',
    secondarySwatchHex: '#06B6D4',
    light: {
      ...SEMANTIC_STATUS_LIGHT,
      bg: '#F1F4F8',
      surface: '#FFFFFF',
      surfaceElevated: '#FFFFFF',
      surfaceGlass: 'rgba(255, 255, 255, 0.85)',
      surfaceMuted: '#E6ECF2',
      surfaceHover: '#F4F7FA',
      border: '#D5DEE7',
      borderSubtle: '#E9EEF4',
      borderStrong: '#B8C6D4',
      glassBorder: 'rgba(255, 255, 255, 0.74)',
      text: '#0E141B',
      textMuted: '#424F5E',
      textSubtle: '#617082',
      primary: '#0369A1',
      primaryHover: '#075985',
      secondary: '#06B6D4',
      secondarySoft: '#ECFEFF',
      accent: '#0369A1',
      accentHover: '#075985',
      accentText: '#0369A1',
      accentSoft: '#F0F9FF',
      accentBorder: '#BAE6FD',
      focusRing: 'rgba(3, 105, 161, 0.32)',
      shadowCard:
        '0 1px 2px rgba(14, 20, 27, 0.04), 0 10px 28px -12px rgba(3, 105, 161, 0.11)',
      shadowElevated:
        '0 4px 12px rgba(14, 20, 27, 0.06), 0 22px 46px -14px rgba(3, 105, 161, 0.16)',
      shadowGlow: '0 14px 32px -10px rgba(3, 105, 161, 0.32)',
      heroGradient:
        'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(240, 249, 255, 0.92) 56%, rgba(224, 242, 254, 0.88) 100%)',
      chartGrid: '#D8DFE6',
      chartTick: '#424F5E',
      chartAxis: '#BAC5D1',
      chartCursor: 'rgba(226, 232, 240, 0.7)',
      chartRef: '#0369A1',
      mechaRed: '#DC2626',
      mechaGold: '#D97706',
      mechaVisor: '#06B6D4',
    },
    dark: {
      ...SEMANTIC_STATUS_DARK,
      bg: '#080C12',
      surface: '#111822',
      surfaceElevated: '#172130',
      surfaceGlass: 'rgba(17, 24, 34, 0.82)',
      surfaceMuted: '#1B2534',
      surfaceHover: '#202B3D',
      border: '#263445',
      borderSubtle: '#1B2534',
      borderStrong: '#34465C',
      glassBorder: 'rgba(148, 163, 184, 0.16)',
      text: '#F3F6FA',
      textMuted: '#C4D0DE',
      textSubtle: '#8E9EAD',
      primary: '#0EA5E9',
      primaryHover: '#0284C7',
      secondary: '#22D3EE',
      secondarySoft: 'rgba(34, 211, 238, 0.15)',
      accent: '#0284C7',
      accentHover: '#0369A1',
      accentText: '#38BDF8',
      accentSoft: 'rgba(2, 132, 199, 0.18)',
      accentBorder: 'rgba(56, 189, 248, 0.36)',
      focusRing: 'rgba(56, 189, 248, 0.36)',
      shadowCard:
        '0 1px 0 0 rgba(255, 255, 255, 0.04) inset, 0 12px 32px -12px rgba(2, 6, 15, 0.78)',
      shadowElevated:
        '0 1px 0 0 rgba(255, 255, 255, 0.06) inset, 0 24px 48px -14px rgba(2, 6, 15, 0.88)',
      shadowGlow: '0 14px 36px -10px rgba(2, 132, 199, 0.42)',
      heroGradient:
        'linear-gradient(135deg, rgba(17, 24, 34, 0.96) 0%, rgba(23, 33, 48, 0.94) 55%, rgba(16, 40, 62, 0.9) 100%)',
      chartGrid: '#1E2733',
      chartTick: '#C4D0DE',
      chartAxis: '#334155',
      chartCursor: 'rgba(27, 36, 48, 0.7)',
      chartRef: '#38BDF8',
      mechaRed: '#EF4444',
      mechaGold: '#F59E0B',
      mechaVisor: '#22D3EE',
    },
  },
  {
    id: 'karbon',
    name: 'RX-0[N] Banshee 02',
    shortName: 'Banshee',
    audience: 'Laki-Laki',
    tagline: 'Psycho-Frame Amber',
    description:
      'Armor obsidian gelap RX-0 Banshee dengan energi Psycho-Frame jingga-emas menyala dan V-fin surai emas.',
    swatchHex: '#EA580C',
    secondarySwatchHex: '#FFB703',
    light: {
      ...SEMANTIC_STATUS_LIGHT,
      bg: '#F2EFE9',
      surface: '#FFFFFF',
      surfaceElevated: '#FFFFFF',
      surfaceGlass: 'rgba(255, 255, 255, 0.9)',
      surfaceMuted: '#EAE4DA',
      surfaceHover: '#F9F6F1',
      border: '#CEC6B8',
      borderSubtle: '#E7E1D6',
      borderStrong: '#A89D8B',
      glassBorder: 'rgba(206, 198, 184, 0.85)',
      text: '#11131A',
      textMuted: '#424756',
      textSubtle: '#61677A',
      primary: '#C2410C',
      primaryHover: '#9A3412',
      secondary: '#F59E0B',
      secondarySoft: '#FEF3C7',
      accent: '#C2410C',
      accentHover: '#9A3412',
      accentText: '#B43B09',
      accentSoft: '#FFF3E8',
      accentBorder: '#FDBA74',
      focusRing: 'rgba(234, 88, 12, 0.34)',
      shadowCard:
        '0 1px 2px rgba(17, 19, 26, 0.06), 0 10px 26px -12px rgba(194, 65, 12, 0.16)',
      shadowElevated:
        '0 4px 14px rgba(17, 19, 26, 0.08), 0 22px 46px -14px rgba(194, 65, 12, 0.22)',
      shadowGlow: '0 12px 30px -10px rgba(234, 88, 12, 0.36)',
      heroGradient:
        'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 247, 237, 0.95) 56%, rgba(254, 243, 199, 0.78) 100%)',
      chartGrid: '#DFD8CC',
      chartTick: '#424756',
      chartAxis: '#C0B7A8',
      chartCursor: 'rgba(255, 237, 213, 0.75)',
      chartRef: '#C2410C',
      mechaRed: '#DC2626',
      mechaGold: '#D97706',
      mechaVisor: '#EA580C',
    },
    dark: {
      ...SEMANTIC_STATUS_DARK,
      bg: '#07080D',
      surface: '#0F111A',
      surfaceElevated: '#151824',
      surfaceGlass: 'rgba(13, 15, 24, 0.90)',
      surfaceMuted: '#181C2A',
      surfaceHover: '#1F2436',
      border: '#2A3044',
      borderSubtle: '#1D2232',
      borderStrong: '#434C6A',
      glassBorder: 'rgba(255, 138, 28, 0.28)',
      text: '#F7F8FC',
      textMuted: '#CDD3E2',
      textSubtle: '#9199B0',
      primary: '#FF7A1A',
      primaryHover: '#EA580C',
      secondary: '#FFB703',
      secondarySoft: 'rgba(255, 183, 3, 0.16)',
      accent: '#EA580C',
      accentHover: '#C2410C',
      accentText: '#FF9E3D',
      accentSoft: 'rgba(255, 122, 26, 0.18)',
      accentBorder: 'rgba(255, 146, 51, 0.44)',
      focusRing: 'rgba(255, 138, 28, 0.42)',
      shadowCard:
        '0 1px 0 0 rgba(255, 168, 76, 0.08) inset, 0 14px 34px -12px rgba(0, 0, 0, 0.88)',
      shadowElevated:
        '0 1px 0 0 rgba(255, 168, 76, 0.14) inset, 0 24px 52px -14px rgba(0, 0, 0, 0.94)',
      shadowGlow: '0 12px 34px -10px rgba(255, 122, 26, 0.52)',
      heroGradient:
        'linear-gradient(135deg, rgba(13, 15, 24, 0.98) 0%, rgba(22, 24, 36, 0.95) 55%, rgba(58, 26, 12, 0.88) 100%)',
      chartGrid: '#1F2333',
      chartTick: '#CDD3E2',
      chartAxis: '#3A4159',
      chartCursor: 'rgba(31, 36, 54, 0.72)',
      chartRef: '#FF9E3D',
      mechaRed: '#EF4444',
      mechaGold: '#FFB703',
      mechaVisor: '#FF7A1A',
    },
  },
  {
    id: 'mawar',
    name: 'Justice Crimson Rose',
    shortName: 'Justice',
    audience: 'Wanita',
    tagline: 'Crimson & Rose',
    description:
      'Sentuhan porselen armor putih dan rose crimson elegan yang tegas namun nyaman dipandang sepanjang hari.',
    swatchHex: '#BE185D',
    secondarySwatchHex: '#EC4899',
    light: {
      ...SEMANTIC_STATUS_LIGHT,
      bg: '#FBF6F9',
      surface: '#FFFFFF',
      surfaceElevated: '#FFFFFF',
      surfaceGlass: 'rgba(255, 255, 255, 0.85)',
      surfaceMuted: '#F5EBF1',
      surfaceHover: '#FDF8FB',
      border: '#EADCE4',
      borderSubtle: '#F7EFF4',
      borderStrong: '#D7BFCE',
      glassBorder: 'rgba(255, 255, 255, 0.75)',
      text: '#1E141A',
      textMuted: '#5C4754',
      textSubtle: '#7D6574',
      primary: '#BE185D',
      primaryHover: '#9D174D',
      secondary: '#EC4899',
      secondarySoft: '#FCE7F3',
      accent: '#BE185D',
      accentHover: '#9D174D',
      accentText: '#BE185D',
      accentSoft: '#FDF2F8',
      accentBorder: '#FBCFE8',
      focusRing: 'rgba(190, 24, 93, 0.30)',
      shadowCard:
        '0 1px 2px rgba(30, 20, 26, 0.04), 0 10px 28px -12px rgba(190, 24, 93, 0.12)',
      shadowElevated:
        '0 4px 12px rgba(30, 20, 26, 0.06), 0 22px 46px -14px rgba(190, 24, 93, 0.16)',
      shadowGlow: '0 14px 32px -10px rgba(190, 24, 93, 0.30)',
      heroGradient:
        'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(253, 242, 248, 0.92) 56%, rgba(252, 231, 243, 0.86) 100%)',
      chartGrid: '#EBDDE5',
      chartTick: '#5C4754',
      chartAxis: '#DBC7D2',
      chartCursor: 'rgba(245, 236, 241, 0.8)',
      chartRef: '#BE185D',
      mechaRed: '#BE185D',
      mechaGold: '#D97706',
      mechaVisor: '#10B981',
    },
    dark: {
      ...SEMANTIC_STATUS_DARK,
      bg: '#120C11',
      surface: '#1D151B',
      surfaceElevated: '#271C24',
      surfaceGlass: 'rgba(29, 21, 27, 0.84)',
      surfaceMuted: '#2C1F29',
      surfaceHover: '#33242F',
      border: '#3E2C3A',
      borderSubtle: '#2C1F29',
      borderStrong: '#563D50',
      glassBorder: 'rgba(244, 114, 182, 0.16)',
      text: '#FDF7FA',
      textMuted: '#DECBD6',
      textSubtle: '#B398A8',
      primary: '#EC4899',
      primaryHover: '#DB2777',
      secondary: '#F472B6',
      secondarySoft: 'rgba(244, 114, 182, 0.15)',
      accent: '#DB2777',
      accentHover: '#BE185D',
      accentText: '#F472B6',
      accentSoft: 'rgba(219, 39, 119, 0.18)',
      accentBorder: 'rgba(244, 114, 182, 0.36)',
      focusRing: 'rgba(244, 114, 182, 0.36)',
      shadowCard:
        '0 1px 0 0 rgba(255, 255, 255, 0.04) inset, 0 12px 32px -12px rgba(10, 4, 9, 0.8)',
      shadowElevated:
        '0 1px 0 0 rgba(255, 255, 255, 0.06) inset, 0 24px 48px -14px rgba(10, 4, 9, 0.9)',
      shadowGlow: '0 14px 36px -10px rgba(219, 39, 119, 0.4)',
      heroGradient:
        'linear-gradient(135deg, rgba(29, 21, 27, 0.96) 0%, rgba(39, 28, 36, 0.94) 55%, rgba(65, 24, 48, 0.88) 100%)',
      chartGrid: '#2E212B',
      chartTick: '#DECBD6',
      chartAxis: '#4B3646',
      chartCursor: 'rgba(43, 31, 40, 0.75)',
      chartRef: '#F472B6',
      mechaRed: '#EC4899',
      mechaGold: '#FBBF24',
      mechaVisor: '#34D399',
    },
  },
  {
    id: 'sage',
    name: 'Dynames Hijau Taktis',
    shortName: 'Dynames',
    audience: 'Wanita',
    tagline: 'Emerald Sensor',
    description:
      'Nuansa hijau emerald unit sniper Gundam yang sejuk dan fokus agar persiapan pagi tetap tenang dan tepat waktu.',
    swatchHex: '#047857',
    secondarySwatchHex: '#14B8A6',
    light: {
      ...SEMANTIC_STATUS_LIGHT,
      bg: '#F3F8F5',
      surface: '#FFFFFF',
      surfaceElevated: '#FFFFFF',
      surfaceGlass: 'rgba(255, 255, 255, 0.85)',
      surfaceMuted: '#E6F0EA',
      surfaceHover: '#F5FAF7',
      border: '#D5E4DC',
      borderSubtle: '#ECF3EF',
      borderStrong: '#B5CEBF',
      glassBorder: 'rgba(255, 255, 255, 0.75)',
      text: '#0F1C16',
      textMuted: '#42594E',
      textSubtle: '#607A6D',
      primary: '#047857',
      primaryHover: '#065F46',
      secondary: '#14B8A6',
      secondarySoft: '#CCFBF1',
      accent: '#047857',
      accentHover: '#065F46',
      accentText: '#047857',
      accentSoft: '#ECFDF5',
      accentBorder: '#A7F3D0',
      focusRing: 'rgba(4, 120, 87, 0.30)',
      shadowCard:
        '0 1px 2px rgba(15, 28, 22, 0.04), 0 10px 28px -12px rgba(4, 120, 87, 0.12)',
      shadowElevated:
        '0 4px 12px rgba(15, 28, 22, 0.06), 0 22px 46px -14px rgba(4, 120, 87, 0.16)',
      shadowGlow: '0 14px 32px -10px rgba(4, 120, 87, 0.30)',
      heroGradient:
        'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(236, 253, 245, 0.92) 56%, rgba(209, 250, 229, 0.86) 100%)',
      chartGrid: '#D7E5DD',
      chartTick: '#42594E',
      chartAxis: '#BDD2C6',
      chartCursor: 'rgba(231, 240, 235, 0.75)',
      chartRef: '#047857',
      mechaRed: '#DC2626',
      mechaGold: '#D97706',
      mechaVisor: '#14B8A6',
    },
    dark: {
      ...SEMANTIC_STATUS_DARK,
      bg: '#08120E',
      surface: '#101D18',
      surfaceElevated: '#162720',
      surfaceGlass: 'rgba(16, 29, 24, 0.84)',
      surfaceMuted: '#1A2B24',
      surfaceHover: '#20352C',
      border: '#273E34',
      borderSubtle: '#1A2B24',
      borderStrong: '#38574A',
      glassBorder: 'rgba(52, 211, 153, 0.16)',
      text: '#F3FAF6',
      textMuted: '#C4DDD1',
      textSubtle: '#8CB09F',
      primary: '#10B981',
      primaryHover: '#059669',
      secondary: '#2DD4BF',
      secondarySoft: 'rgba(45, 212, 191, 0.15)',
      accent: '#059669',
      accentHover: '#047857',
      accentText: '#34D399',
      accentSoft: 'rgba(5, 150, 105, 0.18)',
      accentBorder: 'rgba(52, 211, 153, 0.36)',
      focusRing: 'rgba(52, 211, 153, 0.36)',
      shadowCard:
        '0 1px 0 0 rgba(255, 255, 255, 0.04) inset, 0 12px 32px -12px rgba(2, 10, 7, 0.8)',
      shadowElevated:
        '0 1px 0 0 rgba(255, 255, 255, 0.06) inset, 0 24px 48px -14px rgba(2, 10, 7, 0.88)',
      shadowGlow: '0 14px 36px -10px rgba(5, 150, 105, 0.4)',
      heroGradient:
        'linear-gradient(135deg, rgba(16, 29, 24, 0.96) 0%, rgba(22, 39, 32, 0.94) 55%, rgba(12, 54, 41, 0.88) 100%)',
      chartGrid: '#1D2F27',
      chartTick: '#C4DDD1',
      chartAxis: '#324C40',
      chartCursor: 'rgba(27, 43, 36, 0.75)',
      chartRef: '#34D399',
      mechaRed: '#EF4444',
      mechaGold: '#F59E0B',
      mechaVisor: '#2DD4BF',
    },
  },
];

export function isValidThemePresetId(value: unknown): value is ThemePresetId {
  return (
    value === 'klasik' ||
    value === 'grafit' ||
    value === 'karbon' ||
    value === 'mawar' ||
    value === 'sage'
  );
}

export function isValidColorMode(value: unknown): value is ColorMode {
  return value === 'light' || value === 'dark';
}

export function getThemePresetById(id: ThemePresetId): ThemePresetDefinition {
  return (
    THEME_PRESETS.find((preset) => preset.id === id) ?? THEME_PRESETS[0]
  );
}

export function getActivePaletteTokens(
  settings: ThemeSettings,
): ThemePaletteTokens {
  const preset = getThemePresetById(settings.presetId);
  return settings.colorMode === 'dark' ? preset.dark : preset.light;
}

export function parseStoredThemeSettings(
  rawJson: string | null,
): ThemeSettings {
  if (!rawJson) {
    return { ...DEFAULT_THEME_SETTINGS };
  }
  try {
    const parsed = JSON.parse(rawJson) as Partial<ThemeSettings>;
    return {
      colorMode: isValidColorMode(parsed.colorMode)
        ? parsed.colorMode
        : DEFAULT_THEME_SETTINGS.colorMode,
      presetId: isValidThemePresetId(parsed.presetId)
        ? parsed.presetId
        : DEFAULT_THEME_SETTINGS.presetId,
    };
  } catch {
    return { ...DEFAULT_THEME_SETTINGS };
  }
}

export function loadThemeSettings(): ThemeSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_THEME_SETTINGS };
  }
  try {
    return parseStoredThemeSettings(
      window.localStorage.getItem(THEME_STORAGE_KEY),
    );
  } catch {
    return { ...DEFAULT_THEME_SETTINGS };
  }
}

export function saveThemeSettings(settings: ThemeSettings): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function applyThemeToDocument(settings: ThemeSettings): void {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  const tokens = getActivePaletteTokens(settings);

  if (settings.colorMode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.dataset.theme = settings.presetId;
  root.style.colorScheme = settings.colorMode;

  const cssVars: Record<string, string> = {
    '--tk-bg': tokens.bg,
    '--tk-surface': tokens.surface,
    '--tk-surface-elevated': tokens.surfaceElevated,
    '--tk-surface-glass': tokens.surfaceGlass,
    '--tk-surface-muted': tokens.surfaceMuted,
    '--tk-surface-hover': tokens.surfaceHover,
    '--tk-border': tokens.border,
    '--tk-border-subtle': tokens.borderSubtle,
    '--tk-border-strong': tokens.borderStrong,
    '--tk-glass-border': tokens.glassBorder,
    '--tk-text': tokens.text,
    '--tk-text-muted': tokens.textMuted,
    '--tk-text-subtle': tokens.textSubtle,
    '--tk-primary': tokens.primary,
    '--tk-primary-hover': tokens.primaryHover,
    '--tk-secondary': tokens.secondary,
    '--tk-secondary-soft': tokens.secondarySoft,
    '--tk-accent': tokens.accent,
    '--tk-accent-hover': tokens.accentHover,
    '--tk-accent-text': tokens.accentText,
    '--tk-accent-soft': tokens.accentSoft,
    '--tk-accent-border': tokens.accentBorder,
    '--tk-success': tokens.success,
    '--tk-success-soft': tokens.successSoft,
    '--tk-success-border': tokens.successBorder,
    '--tk-success-text': tokens.successText,
    '--tk-warning': tokens.warning,
    '--tk-warning-soft': tokens.warningSoft,
    '--tk-warning-border': tokens.warningBorder,
    '--tk-warning-text': tokens.warningText,
    '--tk-error': tokens.error,
    '--tk-error-soft': tokens.errorSoft,
    '--tk-error-border': tokens.errorBorder,
    '--tk-error-text': tokens.errorText,
    '--tk-info': tokens.info,
    '--tk-info-soft': tokens.infoSoft,
    '--tk-info-border': tokens.infoBorder,
    '--tk-info-text': tokens.infoText,
    '--tk-disabled-bg': tokens.disabledBg,
    '--tk-disabled-text': tokens.disabledText,
    '--tk-focus-ring': tokens.focusRing,
    '--tk-shadow-card': tokens.shadowCard,
    '--tk-shadow-elevated': tokens.shadowElevated,
    '--tk-shadow-glow': tokens.shadowGlow,
    '--tk-hero-gradient': tokens.heroGradient,
    '--tk-chart-grid': tokens.chartGrid,
    '--tk-chart-tick': tokens.chartTick,
    '--tk-chart-axis': tokens.chartAxis,
    '--tk-chart-cursor': tokens.chartCursor,
    '--tk-chart-ref': tokens.chartRef,
    '--tk-mecha-red': tokens.mechaRed,
    '--tk-mecha-gold': tokens.mechaGold,
    '--tk-mecha-visor': tokens.mechaVisor,
  };

  for (const [key, val] of Object.entries(cssVars)) {
    root.style.setProperty(key, val);
  }

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute(
      'content',
      settings.colorMode === 'dark' ? tokens.surface : tokens.accent,
    );
  }
}
