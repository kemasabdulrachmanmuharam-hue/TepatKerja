import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, Type } from '@google/genai';
import type {
  CommuteTravelMode,
  GeoPoint,
  LiveCommuteConditions,
} from './src/types/schedule.ts';
import {
  evaluateDepartureLocationMatch,
  evaluateWeatherBuffer,
  isBetaRouteTravelMode,
  isTrafficAwareTravelMode,
  parseRoutesDurationSeconds,
} from './src/utils/smartCommute.ts';

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const GMP_ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';
const COMMUTE_CACHE_TTL_MS = 10 * 60_000;

const VALID_TRAVEL_MODES = new Set<CommuteTravelMode>([
  'DRIVE',
  'TWO_WHEELER',
  'TRANSIT',
  'WALK',
]);

class MapsApiError extends Error {
  statusCode: number;
  quotaExceeded: boolean;

  constructor(message: string, statusCode = 502, quotaExceeded = false) {
    super(message);
    this.statusCode = statusCode;
    this.quotaExceeded = quotaExceeded;
  }
}

interface CachedCommuteEntry {
  expiresAt: number;
  data: LiveCommuteConditions;
}

const commuteConditionsCache = new Map<string, CachedCommuteEntry>();

function getMapsApiKey(): string {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ||
    ''
  );
}

function sanitizeString(value: unknown, maxLen: number, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  return value.trim().slice(0, maxLen) || fallback;
}

function sanitizeNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(num)));
}

function sanitizeCoords(
  raw: unknown,
): { lat: number; lng: number } | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const lat = Number(obj.lat);
  const lng = Number(obj.lng);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return { lat, lng };
}

function redactMapsKey(text: string, apiKey: string): string {
  if (!apiKey) {
    return text;
  }
  return text.split(apiKey).join('[REDACTED]');
}

async function geocodeAddressV4(
  address: string,
  apiKey: string,
): Promise<{ lat: number; lng: number; formattedAddress: string }> {
  const url = new URL(
    `https://geocode.googleapis.com/v4/geocode/address/${encodeURIComponent(address)}`,
  );
  url.searchParams.set('languageCode', 'id');
  url.searchParams.set('regionCode', 'ID');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'results.placeId,results.location,results.formattedAddress',
      'X-Goog-Maps-Solution-ID': GMP_ATTRIBUTION_ID,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    results?: Array<{
      location?: { latitude?: number; longitude?: number };
      formattedAddress?: string;
    }>;
    error?: { status?: string; message?: string };
  };

  if (
    response.status === 429 ||
    payload.error?.status === 'RESOURCE_EXHAUSTED'
  ) {
    throw new MapsApiError(
      'Kuota Google Maps Platform terlampaui.',
      429,
      true,
    );
  }

  if (!response.ok) {
    const safeMsg = redactMapsKey(
      payload.error?.message || `Geocoding error (${response.status})`,
      apiKey,
    );
    throw new MapsApiError(safeMsg, response.status >= 400 && response.status < 500 ? 400 : 502);
  }

  const first = payload.results?.[0];
  const lat = first?.location?.latitude;
  const lng = first?.location?.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new MapsApiError(
      `Alamat "${address}" tidak ditemukan. Lengkapi nama jalan, kota, atau wilayah.`,
      404,
    );
  }

  return {
    lat,
    lng,
    formattedAddress: first?.formattedAddress || address,
  };
}

async function reverseGeocodeV4(
  point: GeoPoint,
  apiKey: string,
): Promise<string | null> {
  const url = new URL('https://geocode.googleapis.com/v4/geocode/location');
  url.searchParams.set('location.latitude', String(point.lat));
  url.searchParams.set('location.longitude', String(point.lng));
  url.searchParams.set('languageCode', 'id');
  url.searchParams.set('regionCode', 'ID');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'results.placeId,results.formattedAddress',
      'X-Goog-Maps-Solution-ID': GMP_ATTRIBUTION_ID,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    results?: Array<{ formattedAddress?: string }>;
    error?: { status?: string; message?: string };
  };

  if (
    response.status === 429 ||
    payload.error?.status === 'RESOURCE_EXHAUSTED'
  ) {
    throw new MapsApiError(
      'Kuota Google Maps Platform terlampaui.',
      429,
      true,
    );
  }

  if (!response.ok) {
    return null;
  }

  const formatted = payload.results?.[0]?.formattedAddress;
  return typeof formatted === 'string' && formatted.trim()
    ? formatted.trim()
    : null;
}

async function computeTrafficAwareRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  travelMode: CommuteTravelMode,
  apiKey: string,
): Promise<{
  durationSeconds: number;
  staticDurationSeconds: number;
  distanceMeters: number;
}> {
  const endpoint = 'https://routes.googleapis.com/directions/v2:computeRoutes';
  const requestBody: Record<string, unknown> = {
    origin: {
      location: {
        latLng: {
          latitude: origin.lat,
          longitude: origin.lng,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destination.lat,
          longitude: destination.lng,
        },
      },
    },
    travelMode,
    computeAlternativeRoutes: false,
    languageCode: 'id',
    units: 'METRIC',
  };

  // Only motor vehicle modes (DRIVE, TWO_WHEELER) support routingPreference
  if (isTrafficAwareTravelMode(travelMode)) {
    requestBody.routingPreference = 'TRAFFIC_AWARE';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters',
      'X-Goog-Maps-Solution-ID': GMP_ATTRIBUTION_ID,
    },
    body: JSON.stringify(requestBody),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    routes?: Array<{
      duration?: string;
      staticDuration?: string;
      distanceMeters?: number;
    }>;
    error?: { status?: string; message?: string };
  };

  if (
    response.status === 429 ||
    payload.error?.status === 'RESOURCE_EXHAUSTED'
  ) {
    throw new MapsApiError(
      'Kuota Google Maps Platform terlampaui.',
      429,
      true,
    );
  }

  if (!response.ok) {
    const safeMsg = redactMapsKey(
      payload.error?.message || `Routes API error (${response.status})`,
      apiKey,
    );
    throw new MapsApiError(safeMsg, response.status >= 400 && response.status < 500 ? 400 : 502);
  }

  const route = payload.routes?.[0];
  if (!route) {
    throw new MapsApiError(
      'Rute perjalanan tidak tersedia untuk titik asal dan tujuan tersebut.',
      404,
    );
  }

  const durationSeconds = parseRoutesDurationSeconds(route.duration);
  const staticDurationSeconds =
    parseRoutesDurationSeconds(route.staticDuration) || durationSeconds;

  return {
    durationSeconds,
    staticDurationSeconds,
    distanceMeters: Math.max(0, Math.round(Number(route.distanceMeters ?? 0))),
  };
}

async function fetchCurrentWeatherForPoint(
  point: { lat: number; lng: number },
  apiKey: string,
): Promise<{
  conditionType: string;
  descriptionText: string;
  iconUri?: string;
  temperatureCelsius: number | null;
  precipitationPercent: number;
  thunderstormPercent: number;
  windKmh: number | null;
  visibilityKm: number | null;
}> {
  const url = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('location.latitude', String(point.lat));
  url.searchParams.set('location.longitude', String(point.lng));
  url.searchParams.set('unitsSystem', 'METRIC');
  url.searchParams.set('languageCode', 'id');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Goog-Maps-Solution-ID': GMP_ATTRIBUTION_ID,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    weatherCondition?: {
      type?: string;
      description?: { text?: string };
      iconBaseUri?: string;
    };
    temperature?: { degrees?: number };
    precipitation?: { probability?: { percent?: number } };
    thunderstormProbability?: number;
    wind?: { speed?: { value?: number } };
    visibility?: { distance?: number };
    error?: { status?: string; message?: string };
  };

  if (
    response.status === 429 ||
    payload.error?.status === 'RESOURCE_EXHAUSTED'
  ) {
    throw new MapsApiError(
      'Kuota Google Maps Platform terlampaui.',
      429,
      true,
    );
  }

  if (!response.ok) {
    const safeMsg = redactMapsKey(
      payload.error?.message || `Weather API error (${response.status})`,
      apiKey,
    );
    throw new MapsApiError(safeMsg, 502);
  }

  return {
    conditionType: payload.weatherCondition?.type || 'CLEAR',
    descriptionText: payload.weatherCondition?.description?.text || 'Cerah',
    iconUri: payload.weatherCondition?.iconBaseUri
      ? `${payload.weatherCondition.iconBaseUri}.svg`
      : undefined,
    temperatureCelsius:
      typeof payload.temperature?.degrees === 'number'
        ? Math.round(payload.temperature.degrees * 10) / 10
        : null,
    precipitationPercent: Math.max(
      0,
      Math.min(100, Math.round(Number(payload.precipitation?.probability?.percent ?? 0))),
    ),
    thunderstormPercent: Math.max(
      0,
      Math.min(100, Math.round(Number(payload.thunderstormProbability ?? 0))),
    ),
    windKmh:
      typeof payload.wind?.speed?.value === 'number'
        ? Math.round(payload.wind.speed.value)
        : null,
    visibilityKm:
      typeof payload.visibility?.distance === 'number'
        ? Math.round(payload.visibility.distance * 10) / 10
        : null,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      aiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      mapsConfigured: Boolean(getMapsApiKey()),
    });
  });

  app.post('/api/commute/conditions', async (req: Request, res: Response) => {
    const apiKey = getMapsApiKey();
    if (!apiKey) {
      res.status(503).json({
        error:
          'Layanan Google Maps Platform belum aktif di environment server.',
      });
      return;
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;

    const originAddress = sanitizeString(body.originAddress, 160, '');
    const destinationAddress = sanitizeString(body.destinationAddress, 160, '');
    const originCoords = sanitizeCoords(body.originCoords);
    const forceRefresh = Boolean(body.forceRefresh);
    const rawTravelMode = sanitizeString(body.travelMode, 24, 'DRIVE') as CommuteTravelMode;
    const travelMode: CommuteTravelMode = VALID_TRAVEL_MODES.has(rawTravelMode)
      ? rawTravelMode
      : 'DRIVE';

    if ((!originAddress && !originCoords) || !destinationAddress) {
      res.status(400).json({
        error: 'Isi alamat asal (atau lokasi GPS) dan alamat tujuan kerja terlebih dahulu.',
      });
      return;
    }

    const originKey = originCoords
      ? `${originCoords.lat.toFixed(3)},${originCoords.lng.toFixed(3)}`
      : originAddress.toLowerCase();
    const cacheKey = `${originKey}__${destinationAddress.toLowerCase()}__${travelMode}`;
    const cached = commuteConditionsCache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      res.json(cached.data);
      return;
    }

    try {
      const [resolvedOrigin, resolvedDest] = await Promise.all([
        originCoords
          ? Promise.resolve({
              lat: originCoords.lat,
              lng: originCoords.lng,
              formattedAddress: originAddress || 'Lokasi GPS Saat Ini',
            })
          : geocodeAddressV4(originAddress, apiKey),
        geocodeAddressV4(destinationAddress, apiKey),
      ]);

      const [routeInfo, weatherInfo] = await Promise.all([
        computeTrafficAwareRoute(
          resolvedOrigin,
          resolvedDest,
          travelMode,
          apiKey,
        ),
        fetchCurrentWeatherForPoint(resolvedDest, apiKey),
      ]);

      const baseTravelMinutes = Math.max(
        1,
        Math.round(routeInfo.staticDurationSeconds / 60),
      );
      const liveTravelMinutes = Math.max(
        1,
        Math.round(routeInfo.durationSeconds / 60),
      );
      const trafficDelayMinutes = Math.max(
        0,
        liveTravelMinutes - baseTravelMinutes,
      );

      const weatherEval = evaluateWeatherBuffer(weatherInfo, travelMode);

      const result: LiveCommuteConditions = {
        fetchedAt: Date.now(),
        originLabel: resolvedOrigin.formattedAddress,
        destinationLabel: resolvedDest.formattedAddress,
        travelMode,
        distanceMeters: routeInfo.distanceMeters,
        baseTravelMinutes,
        liveTravelMinutes,
        trafficDelayMinutes,
        weatherConditionType: weatherInfo.conditionType,
        weatherDescription: weatherInfo.descriptionText,
        weatherIconUri: weatherInfo.iconUri,
        temperatureCelsius: weatherInfo.temperatureCelsius,
        precipitationPercent: weatherInfo.precipitationPercent,
        thunderstormPercent: weatherInfo.thunderstormPercent,
        windKmh: weatherInfo.windKmh,
        visibilityKm: weatherInfo.visibilityKm,
        weatherBufferMinutes: weatherEval.bufferMinutes,
        weatherReason: weatherEval.reason,
        recommendedTotalMinutes: liveTravelMinutes + weatherEval.bufferMinutes,
        hasBetaRouteWarning: isBetaRouteTravelMode(travelMode),
      };

      commuteConditionsCache.set(cacheKey, {
        expiresAt: Date.now() + COMMUTE_CACHE_TTL_MS,
        data: result,
      });

      res.json(result);
    } catch (err) {
      if (err instanceof MapsApiError) {
        res.status(err.statusCode).json({
          error: redactMapsKey(err.message, apiKey),
          status: err.quotaExceeded ? 'RESOURCE_EXHAUSTED' : 'ERROR',
          quotaExceeded: err.quotaExceeded,
        });
        return;
      }
      const message = redactMapsKey(
        err instanceof Error ? err.message : 'Gagal menghubungi layanan cuaca & rute.',
        apiKey,
      );
      res.status(502).json({ error: message });
    }
  });

  app.post('/api/commute/validate-departure', async (req: Request, res: Response) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;

    const currentCoords = sanitizeCoords(body.currentCoords);
    if (!currentCoords) {
      res.status(400).json({
        error: 'Koordinat GPS saat ini tidak valid.',
      });
      return;
    }

    const originAddress = sanitizeString(body.originAddress, 160, '');
    const destinationAddress = sanitizeString(body.destinationAddress, 160, '');
    let originCoords = sanitizeCoords(body.originCoords);
    let workplaceCoords = sanitizeCoords(body.workplaceCoords);
    const thresholdMeters = sanitizeNumber(body.thresholdMeters, 100, 5000, 500);

    let detectedLocationLabel: string | null = null;
    let expectedOriginLabel: string | null = originAddress || null;
    let workplaceLabel: string | null = destinationAddress || null;

    const apiKey = getMapsApiKey();
    if (apiKey) {
      const [reverseRes, originRes, destRes] = await Promise.allSettled([
        reverseGeocodeV4(currentCoords, apiKey),
        !originCoords && originAddress
          ? geocodeAddressV4(originAddress, apiKey)
          : Promise.resolve(null),
        !workplaceCoords && destinationAddress
          ? geocodeAddressV4(destinationAddress, apiKey)
          : Promise.resolve(null),
      ]);

      const quotaHit = [reverseRes, originRes, destRes].some(
        (item) =>
          item.status === 'rejected' &&
          item.reason instanceof MapsApiError &&
          item.reason.quotaExceeded,
      );
      if (quotaHit) {
        res.status(429).json({
          error: 'Kuota Google Maps Platform terlampaui.',
          status: 'RESOURCE_EXHAUSTED',
          quotaExceeded: true,
        });
        return;
      }

      if (reverseRes.status === 'fulfilled' && reverseRes.value) {
        detectedLocationLabel = reverseRes.value;
      }
      if (originRes.status === 'fulfilled' && originRes.value) {
        originCoords = { lat: originRes.value.lat, lng: originRes.value.lng };
        expectedOriginLabel = originRes.value.formattedAddress;
      }
      if (destRes.status === 'fulfilled' && destRes.value) {
        workplaceCoords = { lat: destRes.value.lat, lng: destRes.value.lng };
        workplaceLabel = destRes.value.formattedAddress;
      }
    }

    const evaluation = evaluateDepartureLocationMatch({
      currentCoords,
      originCoords,
      workplaceCoords,
      detectedLocationLabel,
      expectedOriginLabel,
      workplaceLabel,
      thresholdMeters,
    });

    res.json(evaluation);
  });

  app.post('/api/coach/briefing', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY belum terpasang di Settings > Secrets untuk Asisten Strategi AI.',
      });
      return;
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    const shiftName = sanitizeString(body.shiftName, 60, 'Jadwal Kerja');
    const jamMasuk = sanitizeString(body.jamMasuk, 10, '08:00');
    const jamBerangkat = sanitizeString(body.jamBerangkat, 10, '07:15');
    const travelMin = sanitizeNumber(body.travelMin, 0, 240, 35);
    const bufferMin = sanitizeNumber(body.bufferMin, 0, 120, 10);
    const prepDoneCount = sanitizeNumber(body.prepDoneCount, 0, 20, 0);
    const prepTotalCount = sanitizeNumber(body.prepTotalCount, 0, 20, 4);
    const streakCount = sanitizeNumber(body.streakCount, 0, 365, 0);
    const quickBufferPreset = sanitizeString(body.quickBufferPreset, 24, 'normal');
    const shiftNote = sanitizeString(body.shiftNote, 200, '');
    const timeOfDay = sanitizeString(body.timeOfDay, 20, 'pagi');

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = [
        `Buatkan briefing singkat keberangkatan kerja dalam bahasa Indonesia yang profesional, hangat, dan praktis.`,
        `Konteks jadwal:`,
        `- Shift: ${shiftName}`,
        `- Jam masuk: ${jamMasuk}, Target berangkat: ${jamBerangkat}`,
        `- Estimasi perjalanan: ${travelMin} menit + buffer keterlambatan ${bufferMin} menit (kondisi: ${quickBufferPreset})`,
        `- Checklist persiapan pagi selesai: ${prepDoneCount} dari ${prepTotalCount} langkah`,
        `- Streak tepat waktu beruntun: ${streakCount} hari`,
        `- Suasana waktu saat ini: ${timeOfDay}`,
        shiftNote ? `- Catatan shift pengguna: "${shiftNote}"` : `- Tidak ada catatan shift tambahan.`,
        `Berikan rekomendasi ringkas dan terukur untuk masing-masing kolom JSON.`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Anda adalah asisten manajemen waktu dan komuter profesional untuk aplikasi TepatKerja. Jawab selalu dalam Bahasa Indonesia yang ringkas, jelas, dan langsung bisa diterapkan.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: {
                type: Type.STRING,
                description: 'Kalimat pembuka singkat maksimal 12 kata.',
              },
              checklistFocus: {
                type: Type.STRING,
                description: 'Prioritas persiapan sebelum keluar rumah maksimal 20 kata.',
              },
              commuteAdvice: {
                type: Type.STRING,
                description: 'Saran perjalanan dan buffer waktu maksimal 22 kata.',
              },
              energyTip: {
                type: Type.STRING,
                description: 'Tips menjaga fokus dan energi di tempat kerja maksimal 20 kata.',
              },
            },
            required: ['headline', 'checklistFocus', 'commuteAdvice', 'energyTip'],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      const parsed = JSON.parse(rawText) as {
        headline?: string;
        checklistFocus?: string;
        commuteAdvice?: string;
        energyTip?: string;
      };

      res.json({
        headline: sanitizeString(parsed.headline, 160, 'Siapkan langkah terbaik hari ini.'),
        checklistFocus: sanitizeString(
          parsed.checklistFocus,
          240,
          'Selesaikan checklist persiapan sebelum waktu berangkat.',
        ),
        commuteAdvice: sanitizeString(
          parsed.commuteAdvice,
          240,
          'Pertahankan buffer perjalanan agar tiba tepat waktu.',
        ),
        energyTip: sanitizeString(
          parsed.energyTip,
          240,
          'Mulai sesi kerja dengan fokus terstruktur 25–50 menit.',
        ),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal menghubungi layanan AI Gemini.';
      res.status(502).json({ error: message });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });

    app.use('/@vite/client', (req, res, next) => {
      delete req.headers['accept-encoding'];
      delete req.headers['if-none-match'];
      const origEnd = res.end.bind(res);
      const chunks: Buffer[] = [];
      res.write = ((chunk: unknown) => {
        if (chunk && typeof chunk !== 'function') {
          chunks.push(
            Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)),
          );
        }
        return true;
      }) as typeof res.write;
      res.end = ((chunk?: unknown) => {
        if (chunk && typeof chunk !== 'function') {
          chunks.push(
            Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)),
          );
        }
        let body = Buffer.concat(chunks).toString('utf-8');
        body = body.replace(
          /let wsTransport = createWebSocketModuleRunnerTransport\(\{[\s\S]*?\}\);/,
          'let wsTransport = { async connect() {}, async disconnect() {}, send() {} };',
        );
        res.removeHeader('Content-Length');
        res.setHeader('Content-Length', Buffer.byteLength(body));
        return origEnd(body);
      }) as typeof res.end;
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TepatKerja server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start TepatKerja server:', err);
  process.exit(1);
});
