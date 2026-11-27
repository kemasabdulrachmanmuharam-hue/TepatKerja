import test from 'node:test';
import assert from 'node:assert/strict';
import type { AlarmRuntimeState, TepatKerjaState } from '../types/schedule';
import {
  buildReminderMilestones,
  computeMonthlyRosterSummary,
  computeOccurrenceTimes,
  evaluateDueReminder,
  findCurrentWorkingOccurrence,
  findNextActiveOccurrence,
  formatCountdown,
  generateCustomCycleOverrides,
  generateMonthlyRotationOverrides,
  getMonthlyCalendarGrid,
  getShiftCompactBadge,
  getUpcomingWeekSchedule,
  resolveOccurrenceForDate,
  validateImportedState,
  validateShiftInput,
} from './scheduleEngine';

function makeSampleState(): TepatKerjaState {
  return {
    version: 1,
    shiftTemplates: [
      {
        id: 'reguler',
        nama: 'Kantor Reguler',
        jamMasuk: '08:00',
        durasiKerjaMenit: 540,
        catatan: 'Masuk standar',
      },
      {
        id: 'pagi',
        nama: 'Shift Pagi',
        jamMasuk: '07:00',
        durasiKerjaMenit: 480,
        catatan: 'Shift awal',
      },
      {
        id: 'malam',
        nama: 'Shift Malam',
        jamMasuk: '22:00',
        durasiKerjaMenit: 480,
        catatan: 'Shift malam',
      },
    ],
    weeklyRules: [
      { dayOfWeek: 0, aktif: false, shiftId: null },
      { dayOfWeek: 1, aktif: true, shiftId: 'reguler' },
      { dayOfWeek: 2, aktif: true, shiftId: 'reguler' },
      { dayOfWeek: 3, aktif: true, shiftId: 'reguler' },
      { dayOfWeek: 4, aktif: true, shiftId: 'reguler' },
      { dayOfWeek: 5, aktif: true, shiftId: 'reguler' },
      { dayOfWeek: 6, aktif: false, shiftId: null },
    ],
    dateOverrides: [],
    config: {
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
  };
}

test('computeOccurrenceTimes calculates prep, depart, check-in, and work end accurately', () => {
  const state = makeSampleState();
  const monday = new Date(2026, 10, 23, 12, 0, 0, 0); // 2026-11-23 (Monday)
  const occ = computeOccurrenceTimes(
    monday,
    'Kantor Reguler',
    '08:00',
    540,
    state.config,
    'rutin',
  );

  assert.ok(occ);
  // 08:00 - (35 + 10) = 07:15 depart; 07:15 - 30 = 06:45 prep
  assert.equal(occ.jamMasukStr, '08:00');
  assert.equal(occ.jamBerangkatStr, '07:15');
  assert.equal(occ.jamPersiapanStr, '06:45');
  assert.equal(occ.jamPulangStr, '17:00');
});

test('resolveOccurrenceForDate prioritizes dateOverrides over weeklyRules', () => {
  const state = makeSampleState();
  const tuesday = new Date(2026, 10, 24, 12, 0, 0, 0); // 2026-11-24

  // Override Tuesday to Shift Pagi
  state.dateOverrides.push({
    dateKey: '2026-11-24',
    tipe: 'shift',
    shiftId: 'pagi',
    label: 'Shift Pagi Khusus',
  });

  const occ = resolveOccurrenceForDate(tuesday, state);
  assert.ok(occ);
  assert.equal(occ.shiftName, 'Shift Pagi Khusus');
  assert.equal(occ.jamMasukStr, '07:00');
  assert.equal(occ.jamBerangkatStr, '06:15');
  assert.equal(occ.source, 'override');

  // Override Wednesday to holiday
  const wednesday = new Date(2026, 10, 25, 12, 0, 0, 0);
  state.dateOverrides.push({
    dateKey: '2026-11-25',
    tipe: 'libur',
    label: 'Cuti Pribadi',
  });
  assert.equal(resolveOccurrenceForDate(wednesday, state), null);
});

test('findNextActiveOccurrence skips weekend and advances after departure or past check-in', () => {
  const state = makeSampleState();
  // Saturday morning -> next active must be Monday 2026-11-23
  const saturday = new Date(2026, 10, 21, 9, 0, 0, 0);
  const nextFromSat = findNextActiveOccurrence(saturday, state, null);
  assert.ok(nextFromSat);
  assert.equal(nextFromSat.dateKey, '2026-11-23');

  // Monday 07:00 -> Monday is active; if user marked departed, advances to Tuesday 2026-11-24
  const mondayMorning = new Date(2026, 10, 23, 7, 0, 0, 0);
  const activeMon = findNextActiveOccurrence(mondayMorning, state, null);
  assert.ok(activeMon);
  assert.equal(activeMon.dateKey, '2026-11-23');

  const afterDeparted = findNextActiveOccurrence(
    mondayMorning,
    state,
    activeMon.occurrenceKey,
  );
  assert.ok(afterDeparted);
  assert.equal(afterDeparted.dateKey, '2026-11-24');

  // Monday 09:00 (>30m past 08:00 check-in) -> automatically advances to Tuesday
  const mondayLate = new Date(2026, 10, 23, 9, 0, 0, 0);
  const autoNext = findNextActiveOccurrence(mondayLate, state, null);
  assert.ok(autoNext);
  assert.equal(autoNext.dateKey, '2026-11-24');
});

test('evaluateDueReminder triggers staged milestones, respects triggeredKeys, departed status, and snooze', () => {
  const state = makeSampleState();
  const monday = new Date(2026, 10, 23, 6, 46, 0, 0); // 1 min after prepStart (06:45)
  const occ = findNextActiveOccurrence(monday, state, null);
  assert.ok(occ);

  const milestones = buildReminderMilestones(occ, state.config);
  assert.equal(milestones.length, 4);
  assert.equal(milestones[0].triggerTimeStr, '06:45');
  assert.equal(milestones[1].triggerTimeStr, '07:00');
  assert.equal(milestones[2].triggerTimeStr, '07:15');
  assert.equal(milestones[3].triggerTimeStr, '07:50');

  const runtime: AlarmRuntimeState = {
    triggeredKeys: [],
    departedOccurrenceKey: null,
    snoozedUntil: null,
    snoozedAlert: null,
  };

  const alert1 = evaluateDueReminder(monday, occ, state.config, runtime);
  assert.ok(alert1);
  assert.equal(alert1.stageId, 'prep_start');

  // Acknowledge prep_start
  runtime.triggeredKeys.push(alert1.key);
  assert.equal(evaluateDueReminder(monday, occ, state.config, runtime), null);

  // At 07:15 depart_now becomes due
  const departNow = new Date(2026, 10, 23, 7, 15, 30, 0);
  const alert2 = evaluateDueReminder(departNow, occ, state.config, runtime);
  assert.ok(alert2);
  assert.equal(alert2.stageId, 'depart_now');

  // If user marks departed, depart_now should not fire anymore
  runtime.departedOccurrenceKey = occ.occurrenceKey;
  assert.equal(evaluateDueReminder(departNow, occ, state.config, runtime), null);

  // Snoozed alert re-fires at snoozedUntil
  const snoozedTime = new Date(2026, 10, 23, 7, 20, 0, 0);
  runtime.snoozedUntil = snoozedTime.getTime();
  runtime.snoozedAlert = alert2;
  const snoozedReFire = evaluateDueReminder(snoozedTime, occ, state.config, runtime);
  assert.ok(snoozedReFire);
  assert.equal(snoozedReFire.stageId, 'depart_now');

  // Dismissing a newer stage (depart_now) must NOT cascade back to older stage (depart_soon at 07:00)
  const freshRuntime: AlarmRuntimeState = {
    triggeredKeys: [`${occ.occurrenceKey}__depart_now`],
    departedOccurrenceKey: null,
    snoozedUntil: null,
    snoozedAlert: null,
  };
  assert.equal(evaluateDueReminder(departNow, occ, state.config, freshRuntime), null);

  // Opening session at 07:16 (after 07:15 already passed) must not trigger unsolicited popup
  const sessionStartAfterDepart = new Date(2026, 10, 23, 7, 16, 0, 0).getTime();
  const emptyRuntime: AlarmRuntimeState = {
    triggeredKeys: [],
    departedOccurrenceKey: null,
    snoozedUntil: null,
    snoozedAlert: null,
  };
  assert.equal(
    evaluateDueReminder(
      new Date(sessionStartAfterDepart),
      occ,
      state.config,
      emptyRuntime,
      sessionStartAfterDepart,
    ),
    null,
  );
});

test('getUpcomingWeekSchedule returns 7 consecutive days with accurate status', () => {
  const state = makeSampleState();
  const monday = new Date(2026, 10, 23, 8, 0, 0, 0);
  const week = getUpcomingWeekSchedule(monday, state, 7);
  assert.equal(week.length, 7);
  assert.equal(week[0].isToday, true);
  assert.equal(week[0].isOff, false);
  assert.equal(week[5].dayName, 'Sabtu');
  assert.equal(week[5].isOff, true);
  assert.equal(week[6].dayName, 'Minggu');
  assert.equal(week[6].isOff, true);
});

test('formatCountdown and validation helpers enforce valid formats and bounds', () => {
  const now = new Date(2026, 10, 23, 6, 10, 0, 0).getTime();
  const target = new Date(2026, 10, 23, 7, 15, 30, 0).getTime();
  const cd = formatCountdown(target, now);
  assert.equal(cd.isPast, false);
  assert.equal(cd.hours, '01');
  assert.equal(cd.minutes, '05');
  assert.equal(cd.seconds, '30');

  const invalidShift = validateShiftInput({
    nama: '   ',
    jamMasuk: '25:99',
    durasiKerjaMenit: 10,
  });
  assert.equal(invalidShift.valid, false);
  assert.ok(invalidShift.errors.nama);
  assert.ok(invalidShift.errors.jamMasuk);
  assert.ok(invalidShift.errors.durasiKerjaMenit);

  const validShift = validateShiftInput({
    nama: 'Shift Sore',
    jamMasuk: '14:30',
    durasiKerjaMenit: 480,
  });
  assert.equal(validShift.valid, true);

  assert.equal(validateImportedState(makeSampleState()), true);
  assert.equal(validateImportedState({ bad: true }), false);
});

test('computeOccurrenceTimes detects overnight work shifts such as Shift 3 and Shift 4', () => {
  const state = makeSampleState();
  const monday = new Date(2026, 10, 23, 12, 0, 0, 0);
  const shift3 = computeOccurrenceTimes(
    monday,
    'Shift 3 (Malam Awal)',
    '20:00',
    540,
    state.config,
    'override',
  );
  assert.ok(shift3);
  assert.equal(shift3.jamMasukStr, '20:00');
  assert.equal(shift3.jamPulangStr, '05:00');
  assert.equal(shift3.isOvernight, true);

  const shift1 = computeOccurrenceTimes(
    monday,
    'Shift 1 (Pagi)',
    '07:00',
    540,
    state.config,
    'override',
  );
  assert.ok(shift1);
  assert.equal(shift1.jamPulangStr, '16:00');
  assert.equal(shift1.isOvernight, false);
});

test('getMonthlyCalendarGrid and computeMonthlyRosterSummary count shifts and leave categories accurately', () => {
  const state = makeSampleState();
  state.dateOverrides.push(
    { dateKey: '2026-11-24', tipe: 'libur', kategoriStatus: 'cuti', label: 'Cuti Tahunan' },
    { dateKey: '2026-11-25', tipe: 'libur', kategoriStatus: 'sakit', label: 'Sakit' },
    { dateKey: '2026-11-26', tipe: 'libur', kategoriStatus: 'izin', label: 'Urusan Keluarga' },
  );

  const grid = getMonthlyCalendarGrid(2026, 10, state, new Date(2026, 10, 24, 9, 0, 0, 0));
  const novCells = grid.filter((c) => c.isCurrentMonth);
  assert.equal(novCells.length, 30);

  const summary = computeMonthlyRosterSummary(grid);
  assert.equal(summary.byCategory.cuti, 1);
  assert.equal(summary.byCategory.sakit, 1);
  assert.equal(summary.byCategory.izin, 1);
  assert.equal(summary.totalLeaveDays, 3);
  // November 2026 has 21 weekdays total; 3 replaced with leave -> 18 working days, 9 weekend off days
  assert.equal(summary.totalWorkingDays, 18);
  assert.equal(summary.totalOffDays, 9);
});

test('generateMonthlyRotationOverrides builds 4-2 cycle and weekly Shift 1-4 rotations', () => {
  const templates = [
    { id: 'shift-1', nama: 'Shift 1 (Pagi)', jamMasuk: '07:00', durasiKerjaMenit: 540, catatan: '' },
    { id: 'shift-2', nama: 'Shift 2 (Siang)', jamMasuk: '13:00', durasiKerjaMenit: 540, catatan: '' },
    { id: 'shift-3', nama: 'Shift 3 (Malam Awal)', jamMasuk: '20:00', durasiKerjaMenit: 540, catatan: '' },
    { id: 'shift-4', nama: 'Shift 4 (Malam Larut)', jamMasuk: '22:00', durasiKerjaMenit: 540, catatan: '' },
  ];

  const cycle42 = generateMonthlyRotationOverrides(2026, 10, 'cycle_4_2', 'shift-1', templates);
  assert.equal(cycle42.length, 30);
  // First 4 days shift, days 5-6 off
  assert.equal(cycle42[0].tipe, 'shift');
  assert.equal(cycle42[3].tipe, 'shift');
  assert.equal(cycle42[4].tipe, 'libur');
  assert.equal(cycle42[4].kategoriStatus, 'off');
  assert.equal(cycle42[5].tipe, 'libur');

  const weeklyRot = generateMonthlyRotationOverrides(2026, 10, 'weekly_rotate_1_4', 'shift-1', templates);
  assert.equal(weeklyRot.length, 30);
  // Nov 1, 2026 is Sunday -> off; Nov 2 (Mon, week 1) -> shift-1; Nov 9 (Mon, week 2) -> shift-2
  assert.equal(weeklyRot[0].tipe, 'libur');
  assert.equal(weeklyRot[1].shiftId, 'shift-1');
  assert.equal(weeklyRot[8].shiftId, 'shift-2');
});

test('findCurrentWorkingOccurrence detects active daytime and overnight shifts', () => {
  const state = makeSampleState();
  // Monday 2026-11-23 uses shift-pagi 08:00 for 540 min (ends 17:00)
  assert.equal(
    findCurrentWorkingOccurrence(new Date(2026, 10, 23, 7, 59, 0, 0), state),
    null,
  );
  const duringDay = findCurrentWorkingOccurrence(
    new Date(2026, 10, 23, 10, 30, 0, 0),
    state,
  );
  assert.ok(duringDay);
  assert.equal(duringDay.shiftName, 'Kantor Reguler');
  assert.equal(duringDay.jamPulangStr, '17:00');
  assert.equal(
    findCurrentWorkingOccurrence(new Date(2026, 10, 23, 17, 0, 0, 0), state),
    null,
  );

  // Overnight shift on Monday 2026-11-23 starting 20:00 for 540 min (ends Tue 05:00)
  state.shiftTemplates.push({
    id: 'shift-malam',
    nama: 'Shift 3 (Malam Awal)',
    jamMasuk: '20:00',
    durasiKerjaMenit: 540,
    catatan: '',
  });
  state.dateOverrides.push({
    dateKey: '2026-11-23',
    tipe: 'shift',
    shiftId: 'shift-malam',
  });
  // Tuesday 02:30 should still resolve to Monday's overnight shift
  const duringNight = findCurrentWorkingOccurrence(
    new Date(2026, 10, 24, 2, 30, 0, 0),
    state,
  );
  assert.ok(duringNight);
  assert.equal(duringNight.dateKey, '2026-11-23');
  assert.equal(duringNight.shiftName, 'Shift 3 (Malam Awal)');
  assert.equal(
    findCurrentWorkingOccurrence(new Date(2026, 10, 24, 5, 0, 0, 0), state),
    null,
  );
});

test('resolveOccurrenceForDate honors durasiKustomMenit and custom time overrides', () => {
  const state = makeSampleState();
  const wednesday = new Date(2026, 10, 25, 12, 0, 0, 0);
  state.dateOverrides.push({
    dateKey: '2026-11-25',
    tipe: 'shift',
    jamMasukKustom: '14:00',
    durasiKustomMenit: 720, // 12h shift ending 02:00 next day
    label: 'Lembur Proyek',
  });

  const occ = resolveOccurrenceForDate(wednesday, state);
  assert.ok(occ);
  assert.equal(occ.shiftName, 'Lembur Proyek');
  assert.equal(occ.jamMasukStr, '14:00');
  assert.equal(occ.jamPulangStr, '02:00');
  assert.equal(occ.durasiKerjaMenit, 720);
  assert.equal(occ.isOvernight, true);
});

test('generateCustomCycleOverrides builds custom work/off ratios and rotating shift sequences', () => {
  const overrides = generateCustomCycleOverrides(2026, 10, 3, 2, ['pagi', 'malam']);
  assert.equal(overrides.length, 30);
  // Cycle 0 (days 1..5): days 1-3 pagi, days 4-5 off
  assert.equal(overrides[0].tipe, 'shift');
  assert.equal(overrides[0].shiftId, 'pagi');
  assert.equal(overrides[2].shiftId, 'pagi');
  assert.equal(overrides[3].tipe, 'libur');
  assert.equal(overrides[4].tipe, 'libur');
  // Cycle 1 (days 6..10): days 6-8 malam, days 9-10 off
  assert.equal(overrides[5].tipe, 'shift');
  assert.equal(overrides[5].shiftId, 'malam');
  assert.equal(overrides[8].tipe, 'libur');
});

test('getShiftCompactBadge formats compact labels for mini calendar cells', () => {
  assert.equal(getShiftCompactBadge('Shift 1 (Pagi)'), 'S1');
  assert.equal(getShiftCompactBadge('Kantor Reguler'), 'Reg');
  assert.equal(getShiftCompactBadge('Middle Pagi'), 'Mid');
  assert.equal(getShiftCompactBadge('WFO Fleksibel'), 'WFO');
});

