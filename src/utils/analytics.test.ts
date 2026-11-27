import test from 'node:test';
import assert from 'node:assert/strict';
import type { DaySchedulePreview, DepartureLogEntry } from '../types/schedule';
import {
  compute30DayPunctualityTrend,
  computeDashboardAnalytics,
  computeWeeklyPunctualityTrend,
  createDepartureLogFromOccurrence,
  escapeCsvCell,
  generateDepartureLogsCsv,
  getMondayDateKey,
} from './analytics';
import { computeOccurrenceTimes } from './scheduleEngine';
import { createSeedDepartureLogs } from './storage';

const sampleWeek: DaySchedulePreview[] = [
  { dateKey: '2026-11-23', dayName: 'Senin', dateShort: '23 Nov', isToday: true, isOff: false, source: 'rutin', occurrence: null },
  { dateKey: '2026-11-24', dayName: 'Selasa', dateShort: '24 Nov', isToday: false, isOff: false, source: 'rutin', occurrence: null },
  { dateKey: '2026-11-25', dayName: 'Rabu', dateShort: '25 Nov', isToday: false, isOff: false, source: 'rutin', occurrence: null },
  { dateKey: '2026-11-26', dayName: 'Kamis', dateShort: '26 Nov', isToday: false, isOff: false, source: 'rutin', occurrence: null },
  { dateKey: '2026-11-27', dayName: 'Jumat', dateShort: '27 Nov', isToday: false, isOff: false, source: 'rutin', occurrence: null },
  { dateKey: '2026-11-28', dayName: 'Sabtu', dateShort: '28 Nov', isToday: false, isOff: true, source: 'libur', occurrence: null },
  { dateKey: '2026-11-29', dayName: 'Minggu', dateShort: '29 Nov', isToday: false, isOff: true, source: 'libur', occurrence: null },
];

test('computeDashboardAnalytics handles empty logs cleanly', () => {
  const res = computeDashboardAnalytics([], sampleWeek, 14);
  assert.equal(res.totalLoggedDays, 0);
  assert.equal(res.scheduledWeekdaysCount, 5);
  assert.equal(res.onTimeRate, 0);
  assert.equal(res.averageDepartTimeStr, '—');
  assert.equal(res.chartPoints.length, 0);
});

test('computeDashboardAnalytics computes workday count, average departure time, and punctuality rate', () => {
  const logs: DepartureLogEntry[] = [
    {
      id: '1',
      dateKey: '2026-11-18',
      dateLabelShort: '18 Nov',
      dayShort: 'Rab',
      shiftName: 'Kantor Reguler',
      plannedDepartStr: '07:15',
      actualDepartStr: '07:10',
      plannedCheckInStr: '08:00',
      deltaMinutes: -5,
      onTime: true,
    },
    {
      id: '2',
      dateKey: '2026-11-19',
      dateLabelShort: '19 Nov',
      dayShort: 'Kam',
      shiftName: 'Kantor Reguler',
      plannedDepartStr: '07:15',
      actualDepartStr: '07:20',
      plannedCheckInStr: '08:00',
      deltaMinutes: 5,
      onTime: false,
    },
    {
      id: '3',
      dateKey: '2026-11-20',
      dateLabelShort: '20 Nov',
      dayShort: 'Jum',
      shiftName: 'Kantor Reguler',
      plannedDepartStr: '07:15',
      actualDepartStr: '07:15',
      plannedCheckInStr: '08:00',
      deltaMinutes: 0,
      onTime: true,
    },
    {
      id: '4',
      dateKey: '2026-11-23',
      dateLabelShort: '23 Nov',
      dayShort: 'Sen',
      shiftName: 'Kantor Reguler',
      plannedDepartStr: '07:15',
      actualDepartStr: '07:15',
      plannedCheckInStr: '08:00',
      deltaMinutes: 0,
      onTime: true,
    },
  ];

  const res = computeDashboardAnalytics(logs, sampleWeek, 14);
  assert.equal(res.totalLoggedDays, 4);
  assert.equal(res.onTimeCount, 3);
  assert.equal(res.lateCount, 1);
  assert.equal(res.onTimeRate, 75);
  assert.equal(res.averageDepartTimeStr, '07:15');
  assert.equal(res.averageDeltaMinutes, 0);
  assert.equal(res.chartPoints.length, 4);

  const limited = computeDashboardAnalytics(logs, sampleWeek, 7);
  assert.equal(limited.totalLoggedDays, 4);
});

test('createDepartureLogFromOccurrence records accurate delta and onTime flag', () => {
  const monday = new Date(2026, 10, 23, 12, 0, 0, 0);
  const occ = computeOccurrenceTimes(
    monday,
    'Kantor Reguler',
    '08:00',
    540,
    {
      durasiPersiapanMenit: 30,
      durasiPerjalananMenit: 35,
      bufferKeterlambatanMenit: 10,
      tahapanAktif: {
        prep_start: true,
        depart_soon: true,
        depart_now: true,
        checkin_soon: true,
      },
      nadaAlarm: 'lonceng',
      volume: 0.8,
      snoozeMenit: 5,
    },
    'rutin',
  );
  assert.ok(occ);

  const earlyDepart = new Date(2026, 10, 23, 7, 11, 0, 0);
  const log = createDepartureLogFromOccurrence(occ, earlyDepart);
  assert.equal(log.actualDepartStr, '07:11');
  assert.equal(log.plannedDepartStr, '07:15');
  assert.equal(log.deltaMinutes, -4);
  assert.equal(log.onTime, true);
});

test('generateDepartureLogsCsv produces sorted CSV with proper escaping and formula protection', () => {
  const logs: DepartureLogEntry[] = [
    {
      id: '2',
      dateKey: '2026-11-24',
      dateLabelShort: '24 Nov',
      dayShort: 'Sel',
      shiftName: 'Shift Khusus, "Lembur"',
      plannedDepartStr: '07:15',
      actualDepartStr: '07:20',
      plannedCheckInStr: '08:00',
      deltaMinutes: 5,
      onTime: false,
    },
    {
      id: '1',
      dateKey: '2026-11-23',
      dateLabelShort: '23 Nov',
      dayShort: 'Sen',
      shiftName: '=SUM(A1)',
      plannedDepartStr: '07:15',
      actualDepartStr: '07:11',
      plannedCheckInStr: '08:00',
      deltaMinutes: -4,
      onTime: true,
    },
  ];

  const csv = generateDepartureLogsCsv(logs);
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 3);
  assert.equal(
    lines[0],
    'Tanggal,Hari,Shift,Target Berangkat,Berangkat Aktual,Jam Masuk,Selisih (Menit),Status Ketepatan',
  );
  assert.equal(
    lines[1],
    "2026-11-23,Sen,'=SUM(A1),07:15,07:11,08:00,-4,Tepat Waktu",
  );
  assert.equal(
    lines[2],
    '2026-11-24,Sel,"Shift Khusus, ""Lembur""",07:15,07:20,08:00,5,Terlambat',
  );
  assert.equal(escapeCsvCell(-12), '-12');
});

test('generateDepartureLogsCsv returns header row when logs are empty', () => {
  const csv = generateDepartureLogsCsv([]);
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 1);
  assert.ok(lines[0].startsWith('Tanggal,Hari,Shift'));
});

test('compute30DayPunctualityTrend handles empty logs cleanly', () => {
  const ref = new Date(2026, 10, 25, 10, 0, 0, 0);
  const trend = compute30DayPunctualityTrend([], ref);
  assert.equal(trend.windowStartKey, '2026-10-27');
  assert.equal(trend.windowEndKey, '2026-11-25');
  assert.equal(trend.totalDaysInWindow, 0);
  assert.equal(trend.trendDirection, 'kosong');
  assert.equal(trend.points.length, 0);
});

test('compute30DayPunctualityTrend filters strictly to 30-day window and calculates rolling & trend direction', () => {
  const ref = new Date(2026, 10, 25, 10, 0, 0, 0);
  const mkLog = (dateKey: string, deltaMinutes: number): DepartureLogEntry => ({
    id: dateKey,
    dateKey,
    dateLabelShort: dateKey.slice(5),
    dayShort: 'Sen',
    shiftName: 'Kantor Reguler',
    plannedDepartStr: '07:15',
    actualDepartStr: deltaMinutes <= 0 ? '07:12' : '07:22',
    plannedCheckInStr: '08:00',
    deltaMinutes,
    onTime: deltaMinutes <= 0,
  });

  const logs: DepartureLogEntry[] = [
    mkLog('2026-10-20', 10), // Outside 30-day window (excluded)
    mkLog('2026-10-28', 6), // First half: late
    mkLog('2026-10-30', 4), // First half: late
    mkLog('2026-11-02', -3), // First half: onTime (1/3 = 33%)
    mkLog('2026-11-18', -5), // Second half: onTime
    mkLog('2026-11-19', -2), // Second half: onTime
    mkLog('2026-11-20', 0), // Second half: onTime (3/3 = 100%)
  ];

  const trend = compute30DayPunctualityTrend(logs, ref);
  assert.equal(trend.totalDaysInWindow, 6);
  assert.equal(trend.onTimeDays, 4);
  assert.equal(trend.lateDays, 2);
  assert.equal(trend.overallRate, 67);
  assert.equal(trend.trendDirection, 'naik');
  assert.equal(trend.trendDeltaPercent, 67);
  assert.equal(trend.points.length, 6);
  // Last 5 logs in window: 10-30 (late), 11-02 (onTime), 11-18 (onTime), 11-19 (onTime), 11-20 (onTime) -> 4/5 = 80%
  assert.equal(trend.points[5].rollingPunctualityRate, 80);
  assert.equal(trend.latestRollingRate, 80);
  // Cumulative at index 5: 4/6 = 67%
  assert.equal(trend.points[5].cumulativePunctualityRate, 67);
});

test('createSeedDepartureLogs generates weekday entries inside the last 30 days', () => {
  const ref = new Date(2026, 10, 25, 10, 0, 0, 0);
  const seeded = createSeedDepartureLogs(ref);
  assert.ok(seeded.length >= 18);
  const trend = compute30DayPunctualityTrend(seeded, ref);
  assert.equal(trend.totalDaysInWindow, seeded.length);
  assert.ok(trend.overallRate > 0);
});

test('computeWeeklyPunctualityTrend aggregates departureLogs by Monday-Sunday weeks accurately', () => {
  assert.equal(getMondayDateKey('2026-11-25'), '2026-11-23'); // Wed -> Mon
  assert.equal(getMondayDateKey('2026-11-29'), '2026-11-23'); // Sun -> Mon

  const empty = computeWeeklyPunctualityTrend([]);
  assert.equal(empty.totalWeeks, 0);
  assert.equal(empty.trendDirection, 'kosong');

  const mkLog = (dateKey: string, deltaMinutes: number): DepartureLogEntry => ({
    id: dateKey,
    dateKey,
    dateLabelShort: dateKey.slice(5),
    dayShort: 'Sen',
    shiftName: 'Kantor Reguler',
    plannedDepartStr: '07:15',
    actualDepartStr: deltaMinutes <= 0 ? '07:12' : '07:22',
    plannedCheckInStr: '08:00',
    deltaMinutes,
    onTime: deltaMinutes <= 0,
  });

  const logs: DepartureLogEntry[] = [
    // Week 1 (2026-11-09): 1/2 = 50%
    mkLog('2026-11-09', -4),
    mkLog('2026-11-11', 6),
    // Week 2 (2026-11-16): 2/2 = 100%
    mkLog('2026-11-16', -2),
    mkLog('2026-11-18', 0),
  ];

  const weekly = computeWeeklyPunctualityTrend(logs, 8);
  assert.equal(weekly.totalWeeks, 2);
  assert.equal(weekly.totalDays, 4);
  assert.equal(weekly.overallRate, 75);
  assert.equal(weekly.latestWeekRate, 100);
  assert.equal(weekly.trendDirection, 'naik');
  assert.equal(weekly.trendDeltaPercent, 50);
  assert.equal(weekly.points[0].weekKey, '2026-11-09');
  assert.equal(weekly.points[0].punctualityRate, 50);
  assert.equal(weekly.points[0].averageDeltaMinutes, 1);
  assert.equal(weekly.points[1].weekKey, '2026-11-16');
  assert.equal(weekly.points[1].punctualityRate, 100);
});


