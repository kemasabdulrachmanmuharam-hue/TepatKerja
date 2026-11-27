import type {
  CommuteAndReminderConfig,
  CommuteTravelMode,
  DepartureLocationStatus,
  DepartureLocationValidationResult,
  EffectiveCommuteSummary,
  GeoPoint,
  LiveCommuteConditions,
} from '../types/schedule.ts';

export interface WeatherTelemetryInput {
  conditionType?: string;
  descriptionText?: string;
  precipitationPercent?: number;
  thunderstormPercent?: number;
  windKmh?: number | null;
  visibilityKm?: number | null;
}

export const TRAVEL_MODE_LABELS: Record<CommuteTravelMode, string> = {
  DRIVE: 'Mobil',
  TWO_WHEELER: 'Sepeda Motor',
  TRANSIT: 'Transportasi Umum',
  WALK: 'Jalan Kaki',
};

export function isTrafficAwareTravelMode(mode: CommuteTravelMode): boolean {
  return mode === 'DRIVE' || mode === 'TWO_WHEELER';
}

export function isBetaRouteTravelMode(mode: CommuteTravelMode): boolean {
  return mode === 'TWO_WHEELER' || mode === 'WALK';
}

export function parseRoutesDurationSeconds(raw: unknown): number {
  if (typeof raw !== 'string') {
    return 0;
  }
  const match = /^(\d+(?:\.\d+)?)s$/i.exec(raw.trim());
  if (!match) {
    return 0;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

export function evaluateWeatherBuffer(
  weather: WeatherTelemetryInput,
  travelMode: CommuteTravelMode,
): { bufferMinutes: number; reason: string } {
  const type = (weather.conditionType ?? 'CLEAR').toUpperCase();
  const precip = Math.max(0, Math.min(100, Number(weather.precipitationPercent ?? 0)));
  const storm = Math.max(0, Math.min(100, Number(weather.thunderstormPercent ?? 0)));
  const wind =
    typeof weather.windKmh === 'number' && Number.isFinite(weather.windKmh)
      ? weather.windKmh
      : null;
  const visibility =
    typeof weather.visibilityKm === 'number' && Number.isFinite(weather.visibilityKm)
      ? weather.visibilityKm
      : null;

  const isExposedMode = travelMode === 'TWO_WHEELER' || travelMode === 'WALK';

  if (
    type.includes('THUNDERSTORM') ||
    type.includes('THUNDERSHOWER') ||
    type.includes('HAIL') ||
    storm >= 50
  ) {
    return {
      bufferMinutes: isExposedMode ? 25 : 18,
      reason: 'Badai petir / hujan deras — disarankan berangkat lebih awal',
    };
  }

  if (type.includes('HEAVY_RAIN') || precip >= 75) {
    return {
      bufferMinutes: isExposedMode ? 20 : 15,
      reason: 'Hujan lebat — lalu lintas melambat & jarak pandang menurun',
    };
  }

  if (
    type.includes('RAIN') ||
    type.includes('SHOWERS') ||
    type.includes('DRIZZLE') ||
    precip >= 40
  ) {
    return {
      bufferMinutes: isExposedMode ? 14 : 10,
      reason: 'Potensi hujan — tambah cadangan waktu perlengkapan & jalan',
    };
  }

  if (type.includes('FOG') || type.includes('MIST') || (visibility !== null && visibility <= 2)) {
    return {
      bufferMinutes: 10,
      reason: 'Kabut / jarak pandang terbatas — kecepatan perjalanan berkurang',
    };
  }

  if (type.includes('WIND') || (wind !== null && wind >= 35)) {
    return {
      bufferMinutes: isExposedMode ? 10 : 5,
      reason: 'Angin kencang di jalur komuter',
    };
  }

  return {
    bufferMinutes: 0,
    reason: 'Cuaca kondusif — tidak perlu buffer cuaca tambahan',
  };
}

export function computeEffectiveCommuteConfig(
  baseConfig: CommuteAndReminderConfig,
  autoAdjustEnabled: boolean,
  liveConditions: LiveCommuteConditions | null,
): EffectiveCommuteSummary {
  const baselineTravelMinutes = Math.max(0, Math.round(baseConfig.durasiPerjalananMenit));
  const baselineBufferMinutes = Math.max(0, Math.round(baseConfig.bufferKeterlambatanMenit));

  if (!autoAdjustEnabled || !liveConditions) {
    return {
      effectiveConfig: baseConfig,
      isAutoAdjusted: false,
      baselineTravelMinutes,
      baselineBufferMinutes,
      effectiveTravelMinutes: baselineTravelMinutes,
      effectiveBufferMinutes: baselineBufferMinutes,
      trafficDeltaMinutes: 0,
      weatherDeltaMinutes: 0,
      totalDeltaMinutes: 0,
      adjustmentReasons: [],
    };
  }

  const effectiveTravelMinutes = Math.max(
    1,
    Math.min(240, Math.round(liveConditions.liveTravelMinutes)),
  );
  const weatherDeltaMinutes = Math.max(
    0,
    Math.min(45, Math.round(liveConditions.weatherBufferMinutes)),
  );
  const effectiveBufferMinutes = Math.min(
    120,
    baselineBufferMinutes + weatherDeltaMinutes,
  );
  const trafficDeltaMinutes = Math.max(
    0,
    Math.round(liveConditions.trafficDelayMinutes),
  );

  const reasons: string[] = [];
  if (trafficDeltaMinutes > 0) {
    reasons.push(`Kepadatan lalu lintas +${trafficDeltaMinutes} mnt`);
  } else {
    reasons.push(`Rute real-time ${effectiveTravelMinutes} mnt (lancar)`);
  }
  if (weatherDeltaMinutes > 0) {
    reasons.push(
      `Cuaca ${liveConditions.weatherDescription || 'buruk'} +${weatherDeltaMinutes} mnt`,
    );
  }

  const effectiveConfig: CommuteAndReminderConfig = {
    ...baseConfig,
    durasiPerjalananMenit: effectiveTravelMinutes,
    bufferKeterlambatanMenit: effectiveBufferMinutes,
  };

  return {
    effectiveConfig,
    isAutoAdjusted: true,
    baselineTravelMinutes,
    baselineBufferMinutes,
    effectiveTravelMinutes,
    effectiveBufferMinutes,
    trafficDeltaMinutes,
    weatherDeltaMinutes,
    totalDeltaMinutes:
      effectiveTravelMinutes +
      effectiveBufferMinutes -
      (baselineTravelMinutes + baselineBufferMinutes),
    adjustmentReasons: reasons,
  };
}

export function formatDistanceLabel(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return '—';
  }
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export async function fetchLiveCommuteConditions(params: {
  originAddress: string;
  destinationAddress: string;
  travelMode: CommuteTravelMode;
  originCoords?: { lat: number; lng: number } | null;
  forceRefresh?: boolean;
}): Promise<LiveCommuteConditions> {
  const res = await fetch('/api/commute/conditions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = (await res.json().catch(() => ({}))) as Partial<LiveCommuteConditions> & {
    error?: string;
    status?: string;
    quotaExceeded?: boolean;
  };

  if (
    res.status === 429 ||
    data.status === 'RESOURCE_EXHAUSTED' ||
    data.quotaExceeded === true
  ) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
    throw new Error(
      data.error ||
        'Kuota Google Maps Platform terlampaui untuk hari ini. Penyesuaian otomatis sementara menggunakan jadwal manual.',
    );
  }

  if (!res.ok) {
    throw new Error(
      data.error || 'Gagal memuat kondisi cuaca dan lalu lintas real-time.',
    );
  }

  if (
    typeof data.liveTravelMinutes !== 'number' ||
    typeof data.weatherBufferMinutes !== 'number'
  ) {
    throw new Error('Respons rute & cuaca dari server tidak lengkap.');
  }

  return data as LiveCommuteConditions;
}

const EARTH_RADIUS_METERS = 6_371_000;

export function calculateHaversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  return Math.round(EARTH_RADIUS_METERS * c);
}

export function formatCoordsLabel(coords: GeoPoint): string {
  return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
}

export function evaluateDepartureLocationMatch(params: {
  currentCoords: GeoPoint | null;
  originCoords?: GeoPoint | null;
  workplaceCoords?: GeoPoint | null;
  detectedLocationLabel?: string | null;
  expectedOriginLabel?: string | null;
  workplaceLabel?: string | null;
  thresholdMeters?: number;
  gpsError?: 'denied' | 'unavailable' | null;
}): DepartureLocationValidationResult {
  const thresholdMeters = Math.max(
    100,
    Math.min(5000, Math.round(params.thresholdMeters ?? 500)),
  );
  const expectedOriginLabel = params.expectedOriginLabel?.trim() || null;
  const workplaceLabel = params.workplaceLabel?.trim() || null;
  const resolvedOriginCoords = params.originCoords ?? null;
  const resolvedWorkplaceCoords = params.workplaceCoords ?? null;

  if (!params.currentCoords) {
    const isDenied = params.gpsError === 'denied';
    return {
      status: isDenied ? 'gps_denied' : 'gps_unavailable',
      currentCoords: null,
      detectedLocationLabel: null,
      expectedOriginLabel,
      workplaceLabel,
      resolvedOriginCoords,
      resolvedWorkplaceCoords,
      distanceToOriginMeters: null,
      distanceToWorkplaceMeters: null,
      thresholdMeters,
      message: isDenied
        ? 'Izin GPS ditolak browser — status keberangkatan tetap dicatat tanpa verifikasi lokasi.'
        : 'Lokasi GPS tidak tersedia — status keberangkatan dicatat tanpa verifikasi lokasi.',
      shouldConfirm: false,
    };
  }

  const currentCoords = params.currentCoords;
  const detectedLocationLabel =
    params.detectedLocationLabel?.trim() || `GPS (${formatCoordsLabel(currentCoords)})`;

  const distanceToOriginMeters = resolvedOriginCoords
    ? calculateHaversineDistanceMeters(currentCoords, resolvedOriginCoords)
    : null;
  const distanceToWorkplaceMeters = resolvedWorkplaceCoords
    ? calculateHaversineDistanceMeters(currentCoords, resolvedWorkplaceCoords)
    : null;

  if (distanceToOriginMeters !== null) {
    const distOriginText =
      distanceToOriginMeters === 0
        ? '0 m'
        : formatDistanceLabel(distanceToOriginMeters);
    if (distanceToOriginMeters <= thresholdMeters) {
      return {
        status: 'valid_origin',
        currentCoords,
        detectedLocationLabel,
        expectedOriginLabel,
        workplaceLabel,
        resolvedOriginCoords,
        resolvedWorkplaceCoords,
        distanceToOriginMeters,
        distanceToWorkplaceMeters,
        thresholdMeters,
        message: `Lokasi GPS terverifikasi di titik keberangkatan (${distOriginText} dari ${expectedOriginLabel || 'titik asal'}).`,
        shouldConfirm: false,
      };
    }

    if (
      distanceToWorkplaceMeters !== null &&
      distanceToWorkplaceMeters <= thresholdMeters
    ) {
      return {
        status: 'at_workplace',
        currentCoords,
        detectedLocationLabel,
        expectedOriginLabel,
        workplaceLabel,
        resolvedOriginCoords,
        resolvedWorkplaceCoords,
        distanceToOriginMeters,
        distanceToWorkplaceMeters,
        thresholdMeters,
        message: `GPS mendeteksi Anda sudah berada di area lokasi kerja (${workplaceLabel || detectedLocationLabel}), bukan di titik berangkat (${distOriginText} dari asal).`,
        shouldConfirm: true,
      };
    }

    return {
      status: 'mismatch_origin',
      currentCoords,
      detectedLocationLabel,
      expectedOriginLabel,
      workplaceLabel,
      resolvedOriginCoords,
      resolvedWorkplaceCoords,
      distanceToOriginMeters,
      distanceToWorkplaceMeters,
      thresholdMeters,
      message: `Lokasi GPS saat ini (${detectedLocationLabel}) berjarak ${formatDistanceLabel(distanceToOriginMeters)} dari titik keberangkatan (${expectedOriginLabel || 'alamat asal'}), melebihi batas ${formatDistanceLabel(thresholdMeters)}.`,
      shouldConfirm: true,
    };
  }

  if (distanceToWorkplaceMeters !== null) {
    const distWorkText =
      distanceToWorkplaceMeters === 0
        ? '0 m'
        : formatDistanceLabel(distanceToWorkplaceMeters);
    if (distanceToWorkplaceMeters <= thresholdMeters) {
      return {
        status: 'at_workplace',
        currentCoords,
        detectedLocationLabel,
        expectedOriginLabel,
        workplaceLabel,
        resolvedOriginCoords,
        resolvedWorkplaceCoords,
        distanceToOriginMeters: null,
        distanceToWorkplaceMeters,
        thresholdMeters,
        message: `GPS mendeteksi Anda sudah berada di lokasi kerja (${workplaceLabel || detectedLocationLabel}, ±${distWorkText}). Tetap catat status berangkat?`,
        shouldConfirm: true,
      };
    }

    return {
      status: 'detected_unverified',
      currentCoords,
      detectedLocationLabel,
      expectedOriginLabel,
      workplaceLabel,
      resolvedOriginCoords,
      resolvedWorkplaceCoords,
      distanceToOriginMeters: null,
      distanceToWorkplaceMeters,
      thresholdMeters,
      message: `Posisi GPS terdeteksi di ${detectedLocationLabel} (${formatDistanceLabel(distanceToWorkplaceMeters)} dari lokasi kerja). Atur alamat/GPS asal di Profil untuk validasi titik berangkat.`,
      shouldConfirm: false,
    };
  }

  return {
    status: 'detected_unverified',
    currentCoords,
    detectedLocationLabel,
    expectedOriginLabel,
    workplaceLabel,
    resolvedOriginCoords,
    resolvedWorkplaceCoords,
    distanceToOriginMeters: null,
    distanceToWorkplaceMeters: null,
    thresholdMeters,
    message: `Posisi GPS tercatat di ${detectedLocationLabel}. Simpan alamat asal/kantor di Pengaturan Profil untuk validasi otomatis.`,
    shouldConfirm: false,
  };
}

export async function validateDepartureLocation(params: {
  currentCoords: GeoPoint;
  originAddress: string;
  destinationAddress: string;
  originCoords?: GeoPoint | null;
  workplaceCoords?: GeoPoint | null;
  thresholdMeters?: number;
}): Promise<DepartureLocationValidationResult> {
  try {
    const res = await fetch('/api/commute/validate-departure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = (await res.json().catch(() => ({}))) as Omit<
      Partial<DepartureLocationValidationResult>,
      'status'
    > & {
      status?: DepartureLocationStatus | 'RESOURCE_EXHAUSTED';
      quotaExceeded?: boolean;
    };

    if (
      res.status === 429 ||
      data.status === 'RESOURCE_EXHAUSTED' ||
      data.quotaExceeded === true
    ) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      return evaluateDepartureLocationMatch({
        currentCoords: params.currentCoords,
        originCoords: params.originCoords,
        workplaceCoords: params.workplaceCoords,
        expectedOriginLabel: params.originAddress,
        workplaceLabel: params.destinationAddress,
        thresholdMeters: params.thresholdMeters,
      });
    }

    if (res.ok && typeof data.shouldConfirm === 'boolean' && typeof data.status === 'string') {
      return data as DepartureLocationValidationResult;
    }
  } catch {
    // Graceful client-side offline fallback
  }

  return evaluateDepartureLocationMatch({
    currentCoords: params.currentCoords,
    originCoords: params.originCoords,
    workplaceCoords: params.workplaceCoords,
    expectedOriginLabel: params.originAddress,
    workplaceLabel: params.destinationAddress,
    thresholdMeters: params.thresholdMeters,
  });
}
