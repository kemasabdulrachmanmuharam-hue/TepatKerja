import test from 'node:test';
import assert from 'node:assert/strict';
import type { CommuteAndReminderConfig, LiveCommuteConditions } from '../types/schedule.ts';
import {
  calculateHaversineDistanceMeters,
  computeEffectiveCommuteConfig,
  evaluateDepartureLocationMatch,
  evaluateWeatherBuffer,
  formatDistanceLabel,
  isBetaRouteTravelMode,
  isTrafficAwareTravelMode,
  parseRoutesDurationSeconds,
} from './smartCommute.ts';

function makeBaseConfig(): CommuteAndReminderConfig {
  return {
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
  };
}

test('parseRoutesDurationSeconds parses Google Routes API duration strings safely', () => {
  assert.equal(parseRoutesDurationSeconds('165s'), 165);
  assert.equal(parseRoutesDurationSeconds('2400.4s'), 2400);
  assert.equal(parseRoutesDurationSeconds('0s'), 0);
  assert.equal(parseRoutesDurationSeconds(undefined), 0);
  assert.equal(parseRoutesDurationSeconds('invalid'), 0);
});

test('travel mode helpers distinguish traffic-aware and beta modes accurately', () => {
  assert.equal(isTrafficAwareTravelMode('DRIVE'), true);
  assert.equal(isTrafficAwareTravelMode('TWO_WHEELER'), true);
  assert.equal(isTrafficAwareTravelMode('TRANSIT'), false);
  assert.equal(isTrafficAwareTravelMode('WALK'), false);

  assert.equal(isBetaRouteTravelMode('TWO_WHEELER'), true);
  assert.equal(isBetaRouteTravelMode('WALK'), true);
  assert.equal(isBetaRouteTravelMode('DRIVE'), false);
  assert.equal(isBetaRouteTravelMode('TRANSIT'), false);
});

test('evaluateWeatherBuffer adjusts safety margin for rain, thunderstorms, and exposed travel modes', () => {
  const clearDrive = evaluateWeatherBuffer(
    { conditionType: 'CLEAR', precipitationPercent: 0 },
    'DRIVE',
  );
  assert.equal(clearDrive.bufferMinutes, 0);

  const rainDrive = evaluateWeatherBuffer(
    { conditionType: 'RAIN', precipitationPercent: 60 },
    'DRIVE',
  );
  assert.equal(rainDrive.bufferMinutes, 10);

  const rainMoto = evaluateWeatherBuffer(
    { conditionType: 'RAIN', precipitationPercent: 60 },
    'TWO_WHEELER',
  );
  assert.equal(rainMoto.bufferMinutes, 14);

  const stormMoto = evaluateWeatherBuffer(
    { conditionType: 'THUNDERSTORM', thunderstormPercent: 80 },
    'TWO_WHEELER',
  );
  assert.equal(stormMoto.bufferMinutes, 25);

  const fogWalk = evaluateWeatherBuffer(
    { conditionType: 'FOG', visibilityKm: 1.5 },
    'WALK',
  );
  assert.equal(fogWalk.bufferMinutes, 10);
});

test('computeEffectiveCommuteConfig preserves baseline when auto-adjust is disabled and applies traffic+weather when enabled', () => {
  const base = makeBaseConfig();
  const sampleLive: LiveCommuteConditions = {
    fetchedAt: Date.now(),
    originLabel: 'Tebet, Jakarta Selatan',
    destinationLabel: 'Sudirman, Jakarta Pusat',
    travelMode: 'DRIVE',
    distanceMeters: 8400,
    baseTravelMinutes: 30,
    liveTravelMinutes: 46,
    trafficDelayMinutes: 16,
    weatherConditionType: 'HEAVY_RAIN',
    weatherDescription: 'Hujan Lebat',
    temperatureCelsius: 26,
    precipitationPercent: 85,
    thunderstormPercent: 20,
    windKmh: 18,
    visibilityKm: 4,
    weatherBufferMinutes: 15,
    weatherReason: 'Hujan lebat — lalu lintas melambat & jarak pandang menurun',
    recommendedTotalMinutes: 61,
    hasBetaRouteWarning: false,
  };

  const disabled = computeEffectiveCommuteConfig(base, false, sampleLive);
  assert.equal(disabled.isAutoAdjusted, false);
  assert.equal(disabled.effectiveConfig.durasiPerjalananMenit, 35);
  assert.equal(disabled.effectiveConfig.bufferKeterlambatanMenit, 10);
  assert.equal(disabled.totalDeltaMinutes, 0);

  const enabled = computeEffectiveCommuteConfig(base, true, sampleLive);
  assert.equal(enabled.isAutoAdjusted, true);
  assert.equal(enabled.effectiveConfig.durasiPerjalananMenit, 46);
  assert.equal(enabled.effectiveConfig.bufferKeterlambatanMenit, 25); // 10 baseline + 15 weather
  assert.equal(enabled.trafficDeltaMinutes, 16);
  assert.equal(enabled.weatherDeltaMinutes, 15);
  assert.equal(enabled.totalDeltaMinutes, 26); // (46 + 25) - (35 + 10)
  assert.equal(enabled.adjustmentReasons.length, 2);
});

test('formatDistanceLabel formats meters and kilometers cleanly', () => {
  assert.equal(formatDistanceLabel(750), '750 m');
  assert.equal(formatDistanceLabel(12460), '12.5 km');
  assert.equal(formatDistanceLabel(0), '—');
});

test('calculateHaversineDistanceMeters measures close and city-scale distances accurately', () => {
  const tebet = { lat: -6.2261, lng: 106.8583 };
  const tebetNearby = { lat: -6.227, lng: 106.859 }; // ~126 m away
  const sudirman = { lat: -6.2146, lng: 106.8206 }; // ~4.35 km away

  assert.equal(calculateHaversineDistanceMeters(tebet, tebet), 0);

  const nearDist = calculateHaversineDistanceMeters(tebet, tebetNearby);
  assert.ok(nearDist > 80 && nearDist < 200, `Expected ~126m, got ${nearDist}`);

  const cityDist = calculateHaversineDistanceMeters(tebet, sudirman);
  assert.ok(cityDist > 4000 && cityDist < 5000, `Expected ~4350m, got ${cityDist}`);
});

test('evaluateDepartureLocationMatch classifies valid_origin, at_workplace, mismatch_origin, detected_unverified, and gps errors', () => {
  const origin = { lat: -6.2261, lng: 106.8583 };
  const workplace = { lat: -6.2146, lng: 106.8206 };

  const valid = evaluateDepartureLocationMatch({
    currentCoords: { lat: -6.2268, lng: 106.8588 },
    originCoords: origin,
    workplaceCoords: workplace,
    expectedOriginLabel: 'Tebet, Jakarta Selatan',
    workplaceLabel: 'Sudirman, Jakarta',
    thresholdMeters: 500,
  });
  assert.equal(valid.status, 'valid_origin');
  assert.equal(valid.shouldConfirm, false);
  assert.ok((valid.distanceToOriginMeters ?? 9999) <= 500);

  const atWork = evaluateDepartureLocationMatch({
    currentCoords: { lat: -6.2147, lng: 106.8207 },
    originCoords: origin,
    workplaceCoords: workplace,
    expectedOriginLabel: 'Tebet',
    workplaceLabel: 'Menara Sudirman',
    thresholdMeters: 500,
  });
  assert.equal(atWork.status, 'at_workplace');
  assert.equal(atWork.shouldConfirm, true);

  const mismatch = evaluateDepartureLocationMatch({
    currentCoords: { lat: -6.1754, lng: 106.8272 }, // Monas (~5.6 km from Tebet)
    originCoords: origin,
    workplaceCoords: workplace,
    detectedLocationLabel: 'Gambir, Jakarta Pusat',
    expectedOriginLabel: 'Tebet',
    workplaceLabel: 'Sudirman',
    thresholdMeters: 500,
  });
  assert.equal(mismatch.status, 'mismatch_origin');
  assert.equal(mismatch.shouldConfirm, true);
  assert.ok((mismatch.distanceToOriginMeters ?? 0) > 500);

  const unverified = evaluateDepartureLocationMatch({
    currentCoords: { lat: -6.24, lng: 106.85 },
    detectedLocationLabel: 'Pancoran, Jakarta Selatan',
  });
  assert.equal(unverified.status, 'detected_unverified');
  assert.equal(unverified.shouldConfirm, false);

  const denied = evaluateDepartureLocationMatch({
    currentCoords: null,
    gpsError: 'denied',
  });
  assert.equal(denied.status, 'gps_denied');
  assert.equal(denied.shouldConfirm, false);
});
