import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_THEME_SETTINGS,
  THEME_PRESETS,
  clampNightEndHour,
  clampNightStartHour,
  formatHourLabel,
  getActivePaletteTokens,
  getThemePresetById,
  isNightTime,
  parseStoredThemeSettings,
  resolveEffectiveColorMode,
} from './theme.ts';

test('THEME_PRESETS defines exactly 5 distinct themes covering Unisex, Laki-Laki, and Wanita', () => {
  assert.equal(THEME_PRESETS.length, 5);
  const ids = new Set(THEME_PRESETS.map((p) => p.id));
  assert.equal(ids.size, 5);

  const maleThemes = THEME_PRESETS.filter((p) => p.audience === 'Laki-Laki');
  const femaleThemes = THEME_PRESETS.filter((p) => p.audience === 'Wanita');
  const unisexThemes = THEME_PRESETS.filter((p) => p.audience === 'Unisex');

  assert.equal(maleThemes.length, 2);
  assert.equal(femaleThemes.length, 2);
  assert.equal(unisexThemes.length, 1);
});

test('parseStoredThemeSettings falls back safely on empty or invalid JSON', () => {
  assert.deepEqual(parseStoredThemeSettings(null), DEFAULT_THEME_SETTINGS);
  assert.deepEqual(parseStoredThemeSettings('invalid{json'), DEFAULT_THEME_SETTINGS);
  assert.deepEqual(
    parseStoredThemeSettings(JSON.stringify({ colorMode: 'sepia', presetId: 'unknown' })),
    DEFAULT_THEME_SETTINGS,
  );
  assert.deepEqual(
    parseStoredThemeSettings(JSON.stringify({ colorMode: 'dark', presetId: 'mawar' })),
    { colorMode: 'dark', presetId: 'mawar' },
  );
});

test('getActivePaletteTokens switches cleanly between light and dark palettes per preset', () => {
  const mawarLight = getActivePaletteTokens({ colorMode: 'light', presetId: 'mawar' });
  const mawarDark = getActivePaletteTokens({ colorMode: 'dark', presetId: 'mawar' });
  assert.notEqual(mawarLight.bg, mawarDark.bg);
  assert.notEqual(mawarLight.text, mawarDark.text);
  assert.equal(getThemePresetById('sage').audience, 'Wanita');
  assert.equal(getThemePresetById('karbon').audience, 'Laki-Laki');
});

test('isNightTime accurately detects overnight night hours including boundaries', () => {
  const makeLocalTime = (hour: number, minute = 0) =>
    new Date(2026, 10, 26, hour, minute, 0, 0);

  // Default 18:00 - 06:00
  assert.equal(isNightTime(makeLocalTime(17, 59)), false);
  assert.equal(isNightTime(makeLocalTime(18, 0)), true);
  assert.equal(isNightTime(makeLocalTime(21, 30)), true);
  assert.equal(isNightTime(makeLocalTime(0, 0)), true);
  assert.equal(isNightTime(makeLocalTime(5, 59)), true);
  assert.equal(isNightTime(makeLocalTime(6, 0)), false);
  assert.equal(isNightTime(makeLocalTime(12, 0)), false);

  // Custom window 20:00 - 05:00
  assert.equal(isNightTime(makeLocalTime(19, 45), 20, 5), false);
  assert.equal(isNightTime(makeLocalTime(20, 0), 20, 5), true);
  assert.equal(isNightTime(makeLocalTime(4, 59), 20, 5), true);
  assert.equal(isNightTime(makeLocalTime(5, 0), 20, 5), false);
});

test('resolveEffectiveColorMode activates dark mode automatically at night and honors manual overrides', () => {
  const nightTime = new Date(2026, 10, 26, 20, 15, 0, 0);
  const dayTime = new Date(2026, 10, 26, 10, 15, 0, 0);

  assert.equal(
    resolveEffectiveColorMode({
      scheduleMode: 'auto',
      manualColorMode: 'light',
      now: nightTime,
    }),
    'dark',
  );
  assert.equal(
    resolveEffectiveColorMode({
      scheduleMode: 'auto',
      manualColorMode: 'dark',
      now: dayTime,
    }),
    'light',
  );
  assert.equal(
    resolveEffectiveColorMode({
      scheduleMode: 'manual',
      manualColorMode: 'light',
      now: nightTime,
    }),
    'light',
  );
  assert.equal(
    resolveEffectiveColorMode({
      scheduleMode: 'manual',
      manualColorMode: 'dark',
      now: dayTime,
    }),
    'dark',
  );
  assert.equal(
    resolveEffectiveColorMode({
      scheduleMode: 'system',
      manualColorMode: 'light',
      systemColorMode: 'dark',
      now: dayTime,
    }),
    'dark',
  );
  assert.equal(
    resolveEffectiveColorMode({
      scheduleMode: 'system',
      manualColorMode: 'dark',
      systemColorMode: 'light',
      now: nightTime,
    }),
    'light',
  );
});

test('night hour clamping and formatting enforce valid bounds', () => {
  assert.equal(clampNightStartHour(10), 16);
  assert.equal(clampNightStartHour(25), 23);
  assert.equal(clampNightEndHour(1), 4);
  assert.equal(clampNightEndHour(12), 9);
  assert.equal(formatHourLabel(6), '06:00');
  assert.equal(formatHourLabel(18), '18:00');
});
