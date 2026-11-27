import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  DaySchedulePreview,
  DepartureLogEntry,
  MonthlyCalendarDay,
} from '../types/schedule';
import {
  computePunctualityStreak,
  generateIcsCalendarContent,
  generateUpcomingIcsCalendarContent,
  get3DThemeScenePalette,
  getBufferMinutesForPreset,
  getChecklistProgress,
} from './workspaceFeatures';

function makeLog(dateKey: string, onTime: boolean): DepartureLogEntry {
  return {
    id: `log-${dateKey}`,
    dateKey,
    dateLabelShort: dateKey,
    dayShort: 'Sen',
    shiftName: 'Kantor Reguler',
    plannedDepartStr: '07:15',
    actualDepartStr: onTime ? '07:12' : '07:22',
    plannedCheckInStr: '08:00',
    deltaMinutes: onTime ? -3 : 7,
    onTime,
  };
}

test('computePunctualityStreak computes current and best consecutive streaks accurately', () => {
  const logs: DepartureLogEntry[] = [
    makeLog('2026-11-01', true),
    makeLog('2026-11-02', true),
    makeLog('2026-11-03', true),
    makeLog('2026-11-04', false),
    makeLog('2026-11-05', true),
    makeLog('2026-11-06', true),
  ];
  const stats = computePunctualityStreak(logs);
  assert.equal(stats.currentStreak, 2);
  assert.equal(stats.bestStreak, 3);
  assert.equal(stats.recentOnTimeCount, 5);
});

test('getBufferMinutesForPreset maps traffic and weather presets correctly', () => {
  assert.equal(getBufferMinutesForPreset('normal'), 10);
  assert.equal(getBufferMinutesForPreset('padat'), 20);
  assert.equal(getBufferMinutesForPreset('hujan'), 30);
});

test('getChecklistProgress computes completion percentage per occurrence', () => {
  const items = [
    { id: 'mandi', label: 'Mandi' },
    { id: 'sarapan', label: 'Sarapan' },
    { id: 'kunci', label: 'Kunci & ID' },
    { id: 'jaket', label: 'Jaket' },
  ];
  const progress = getChecklistProgress('2026-11-25__08:00', items, [
    '2026-11-25__08:00__mandi',
    '2026-11-25__08:00__kunci',
    '2026-11-24__08:00__sarapan',
  ]);
  assert.equal(progress.doneCount, 2);
  assert.equal(progress.totalCount, 4);
  assert.equal(progress.percent, 50);
});

test('generateIcsCalendarContent produces valid VCALENDAR VEVENT blocks for working days only', () => {
  const checkInAt = new Date(2026, 10, 25, 8, 0, 0);
  const workEndAt = new Date(2026, 10, 25, 17, 0, 0);
  const days: MonthlyCalendarDay[] = [
    {
      dateKey: '2026-11-25',
      dayNumber: 25,
      dayOfWeek: 3,
      isToday: true,
      isCurrentMonth: true,
      isOff: false,
      source: 'rutin',
      kategoriStatus: 'shift',
      occurrence: {
        occurrenceKey: '2026-11-25__08:00',
        dateKey: '2026-11-25',
        dateLabel: 'Rabu, 25 November 2026',
        shortDayLabel: 'Rab',
        shiftName: 'Shift 1 (Pagi)',
        source: 'rutin',
        jamMasukStr: '08:00',
        jamBerangkatStr: '07:15',
        jamPersiapanStr: '06:45',
        jamPulangStr: '17:00',
        prepStartAt: new Date(2026, 10, 25, 6, 45, 0),
        departAt: new Date(2026, 10, 25, 7, 15, 0),
        checkInAt,
        workEndAt,
      },
    },
    {
      dateKey: '2026-11-26',
      dayNumber: 26,
      dayOfWeek: 4,
      isToday: false,
      isCurrentMonth: true,
      isOff: true,
      source: 'libur',
      kategoriStatus: 'off',
      occurrence: null,
    },
  ];

  const ics = generateIcsCalendarContent(days, 'TepatKerja November', {
    '2026-11-25': 'Bawa kartu akses gedung',
  });
  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('END:VCALENDAR'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 1);
  assert.ok(ics.includes('Shift 1 (Pagi)'));
  assert.ok(ics.includes('TRIGGER:-PT45M'));
  assert.ok(ics.includes('Bawa kartu akses gedung'));
  assert.ok(ics.includes('\r\n'));

  const upcomingDays: DaySchedulePreview[] = [
    {
      dateKey: '2026-11-25',
      dayName: 'Rabu',
      dateShort: '25 Nov',
      isToday: true,
      isOff: false,
      hasOverride: false,
      source: 'rutin',
      occurrence: {
        ...days[0].occurrence!,
        isOvernight: true,
        workEndAt: new Date(2026, 10, 26, 5, 0, 0),
        jamMasukStr: '20:00',
        jamPulangStr: '05:00',
        checkInAt: new Date(2026, 10, 25, 20, 0, 0),
        departAt: new Date(2026, 10, 25, 19, 30, 0),
      },
    },
  ];
  const upcomingIcs = generateUpcomingIcsCalendarContent(
    upcomingDays,
    'TepatKerja 30 Hari',
  );
  assert.ok(upcomingIcs.includes('DTSTART:20261125T200000'));
  assert.ok(upcomingIcs.includes('DTEND:20261126T050000'));
  assert.ok(upcomingIcs.includes('TRIGGER:-PT30M'));
});

test('get3DThemeScenePalette adapts to theme presets and urgency state', () => {
  const mawarDark = get3DThemeScenePalette(
    { colorMode: 'dark', presetId: 'mawar' },
    'malam',
    'red',
  );
  const sageLight = get3DThemeScenePalette(
    { colorMode: 'light', presetId: 'sage' },
    'pagi',
    'green',
  );
  assert.notEqual(mawarDark.backgroundHex, sageLight.backgroundHex);
  assert.equal(mawarDark.beaconHex, '#EF4444');
  assert.equal(mawarDark.visorHex, '#EF4444');
  assert.equal(sageLight.beaconHex, '#10B981');
  assert.equal(sageLight.armorGoldHex, '#F59E0B');
  assert.ok(sageLight.armorWhiteHex.startsWith('#'));
});
