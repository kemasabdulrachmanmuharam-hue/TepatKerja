import { useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  CloudRain,
  Compass,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  Play,
  RefreshCw,
  TrafficCone,
  UserCheck,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  CommuteRouteProfile,
  CommuteTravelMode,
  EffectiveCommuteSummary,
  GeoPoint,
  LiveCommuteConditions,
  UserProfileData,
} from '../types/schedule';
import {
  formatCoordsLabel,
  formatDistanceLabel,
  isBetaRouteTravelMode,
  TRAVEL_MODE_LABELS,
} from '../utils/smartCommute';
import { AnimatedModal } from './AnimatedModal';
import { tkInputClass, tkSelectClass, ToggleSwitch } from './ui/DesignSystem';

interface AccountPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  profile: UserProfileData | null;
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  syncMessage: string | null;
  authBusy: boolean;
  commuteProfile: CommuteRouteProfile;
  liveCommute: LiveCommuteConditions | null;
  liveCommuteLoading: boolean;
  liveCommuteError: string | null;
  commuteSummary: EffectiveCommuteSummary;
  onSaveCommuteProfile: (
    nextProfile: CommuteRouteProfile,
    refreshLiveNow: boolean,
  ) => Promise<void>;
  onSignInGoogle: () => void;
  onSignOut: () => void;
  onSaveProfile: (data: {
    displayName: string;
    roleTitle: string;
    workplaceName: string;
  }) => Promise<void>;
  onForceSync: () => Promise<void>;
  onReplayIntro: () => void;
}

const TRAVEL_MODE_OPTIONS: Array<{ value: CommuteTravelMode; label: string }> = [
  { value: 'DRIVE', label: 'Mobil (Traffic-Aware)' },
  { value: 'TWO_WHEELER', label: 'Motor (Traffic-Aware · Beta)' },
  { value: 'TRANSIT', label: 'Transportasi Umum (Transit)' },
  { value: 'WALK', label: 'Jalan Kaki (Beta)' },
];

export function AccountModal({
  isOpen,
  onClose,
  user,
  profile,
  syncStatus,
  syncMessage,
  authBusy,
  commuteProfile,
  liveCommute,
  liveCommuteLoading,
  liveCommuteError,
  commuteSummary,
  onSaveCommuteProfile,
  onSignInGoogle,
  onSignOut,
  onSaveProfile,
  onForceSync,
  onReplayIntro,
}: AccountPanelProps) {
  const [displayName, setDisplayName] = useState(
    profile?.displayName || user?.displayName || '',
  );
  const [roleTitle, setRoleTitle] = useState(profile?.roleTitle || '');
  const [workplaceName, setWorkplaceName] = useState(profile?.workplaceName || '');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Smart Commute & Weather Auto-Adjust local form fields
  const [autoAdjustEnabled, setAutoAdjustEnabled] = useState(
    commuteProfile.autoAdjustEnabled,
  );
  const [originAddress, setOriginAddress] = useState(commuteProfile.originAddress);
  const [destinationAddress, setDestinationAddress] = useState(
    commuteProfile.destinationAddress || profile?.workplaceName || '',
  );
  const [travelMode, setTravelMode] = useState<CommuteTravelMode>(
    commuteProfile.travelMode,
  );
  const [originGpsCoords, setOriginGpsCoords] = useState<GeoPoint | null>(
    commuteProfile.originCoords ?? null,
  );
  const [workplaceGpsCoords, setWorkplaceGpsCoords] = useState<GeoPoint | null>(
    commuteProfile.workplaceCoords ?? null,
  );
  const [gpsValidationEnabled, setGpsValidationEnabled] = useState<boolean>(
    commuteProfile.gpsValidationEnabled ?? true,
  );
  const [gpsRadiusMeters, setGpsRadiusMeters] = useState<number>(
    commuteProfile.gpsRadiusMeters ?? 500,
  );
  const [gpsBusyTarget, setGpsBusyTarget] = useState<'origin' | 'workplace' | null>(
    null,
  );
  const [routeNotice, setRouteNotice] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.displayName || user?.displayName || '');
    setRoleTitle(profile?.roleTitle || '');
    setWorkplaceName(profile?.workplaceName || '');
    setAutoAdjustEnabled(commuteProfile.autoAdjustEnabled);
    setOriginAddress(commuteProfile.originAddress);
    setDestinationAddress(
      commuteProfile.destinationAddress || profile?.workplaceName || '',
    );
    setTravelMode(commuteProfile.travelMode);
    setOriginGpsCoords(commuteProfile.originCoords ?? null);
    setWorkplaceGpsCoords(commuteProfile.workplaceCoords ?? null);
    setGpsValidationEnabled(commuteProfile.gpsValidationEnabled ?? true);
    setGpsRadiusMeters(commuteProfile.gpsRadiusMeters ?? 500);
    setRouteNotice(null);
    setSaveNotice(null);
  }, [profile, user, commuteProfile, isOpen]);

  const handleSubmitProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setSaveNotice('Nama tampilan wajib diisi.');
      return;
    }
    setSaving(true);
    setSaveNotice(null);
    try {
      await onSaveProfile({
        displayName: displayName.trim(),
        roleTitle: roleTitle.trim(),
        workplaceName: workplaceName.trim(),
      });
      setSaveNotice('Profil pribadi berhasil disimpan dan disinkronkan.');
    } catch {
      setSaveNotice('Gagal menyimpan profil ke cloud. Periksa koneksi Anda.');
    } finally {
      setSaving(false);
    }
  };

  const handleDetectGps = (target: 'origin' | 'workplace') => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setRouteNotice('Browser ini tidak mendukung akses lokasi GPS.');
      return;
    }
    setGpsBusyTarget(target);
    setRouteNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: GeoPoint = {
          lat: Math.round(pos.coords.latitude * 100000) / 100000,
          lng: Math.round(pos.coords.longitude * 100000) / 100000,
        };
        if (target === 'origin') {
          setOriginGpsCoords(coords);
          if (!originAddress.trim()) {
            setOriginAddress(`GPS (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
          }
          setRouteNotice(
            `Titik GPS keberangkatan dideteksi (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}).`,
          );
        } else {
          setWorkplaceGpsCoords(coords);
          if (!destinationAddress.trim()) {
            setDestinationAddress(`Lokasi Kerja (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
          }
          setRouteNotice(
            `Titik GPS lokasi kerja dideteksi (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}).`,
          );
        }
        setGpsBusyTarget(null);
      },
      () => {
        setGpsBusyTarget(null);
        setRouteNotice(
          'Akses lokasi GPS ditolak atau tidak tersedia. Masukkan alamat secara manual.',
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  };

  const handleApplyRouteSettings = async (refreshLiveNow: boolean) => {
    setRouteNotice(null);
    const cleanOrigin = originAddress.trim();
    const cleanDest = destinationAddress.trim();

    if (refreshLiveNow && (!cleanOrigin && !originGpsCoords)) {
      setRouteNotice('Isi alamat asal atau gunakan GPS sebelum mengecek rute & cuaca.');
      return;
    }
    if (refreshLiveNow && (!cleanDest && !workplaceGpsCoords)) {
      setRouteNotice('Isi alamat kantor / lokasi kerja tujuan terlebih dahulu.');
      return;
    }

    await onSaveCommuteProfile(
      {
        autoAdjustEnabled,
        originAddress: cleanOrigin,
        destinationAddress: cleanDest,
        travelMode,
        originCoords: originGpsCoords,
        workplaceCoords: workplaceGpsCoords,
        gpsValidationEnabled,
        gpsRadiusMeters,
      },
      refreshLiveNow,
    );

    if (!refreshLiveNow) {
      setRouteNotice('Pengaturan rute & validasi lokasi GPS tersimpan.');
    }
  };

  const handleToggleAutoAdjust = async () => {
    const nextEnabled = !autoAdjustEnabled;
    setAutoAdjustEnabled(nextEnabled);
    const cleanOrigin = originAddress.trim();
    const cleanDest = destinationAddress.trim();
    const hasRoute = Boolean((cleanOrigin || originGpsCoords) && cleanDest);
    await onSaveCommuteProfile(
      {
        autoAdjustEnabled: nextEnabled,
        originAddress: cleanOrigin,
        destinationAddress: cleanDest,
        travelMode,
        originCoords: originGpsCoords,
        workplaceCoords: workplaceGpsCoords,
        gpsValidationEnabled,
        gpsRadiusMeters,
      },
      nextEnabled && hasRoute && !liveCommute,
    );
    setRouteNotice(
      nextEnabled
        ? hasRoute
          ? 'Penyesuaian waktu berangkat otomatis diaktifkan.'
          : 'Penyesuaian otomatis aktif — isi alamat asal & tujuan lalu cek kondisi.'
        : 'Penyesuaian otomatis dimatikan. Kembali menggunakan durasi manual.',
    );
  };

  const handleToggleGpsValidation = async () => {
    const nextVal = !gpsValidationEnabled;
    setGpsValidationEnabled(nextVal);
    await onSaveCommuteProfile(
      {
        autoAdjustEnabled,
        originAddress: originAddress.trim(),
        destinationAddress: destinationAddress.trim(),
        travelMode,
        originCoords: originGpsCoords,
        workplaceCoords: workplaceGpsCoords,
        gpsValidationEnabled: nextVal,
        gpsRadiusMeters,
      },
      false,
    );
    setRouteNotice(
      nextVal
        ? 'Validasi GPS otomatis saat menekan "Sudah Berangkat" diaktifkan.'
        : 'Validasi lokasi GPS saat menekan "Sudah Berangkat" dimatikan.',
    );
  };

  const showBetaNotice = isBetaRouteTravelMode(travelMode);

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="account-modal-title"
      panelClassName="w-full max-w-xl bg-[var(--tk-surface-elevated)] border border-[var(--tk-border-strong)] rounded-[3px] shadow-[var(--tk-shadow-elevated)] overflow-hidden"
    >
        <div className="tk-mecha-stripe w-full" aria-hidden="true" />
        <div className="px-6 py-4 border-b border-[var(--tk-border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="tk-3d-badge h-8 w-8 rounded-[3px] bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] text-[var(--tk-accent-text)] flex items-center justify-center shrink-0">
              <UserCheck className="h-4 w-4" aria-hidden="true" />
            </div>
            <h2
              id="account-modal-title"
              className="font-display text-sm sm:text-base font-bold uppercase tracking-wide text-[var(--tk-text)]"
            >
              Pengaturan Profil, Rute &amp; Akun Pribadi
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel akun"
            className="p-1.5 rounded-[2px] text-[var(--tk-text-subtle)] hover:text-[var(--tk-text)] hover:bg-[var(--tk-surface-muted)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Section 1: Automatic Departure Adjustment (Real-Time Weather & Traffic) */}
          <section
            aria-label="Penyesuaian waktu berangkat otomatis cuaca dan lalu lintas"
            className="rounded-[3px] p-4 sm:p-5 bg-[var(--tk-surface-muted)] border border-[var(--tk-border)] space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Navigation
                    className="h-4 w-4 text-[var(--tk-accent-text)] shrink-0"
                    aria-hidden="true"
                  />
                  <h3 className="font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-[var(--tk-text)]">
                    Penyesuaian Berangkat Otomatis (Cuaca &amp; Lalu Lintas)
                  </h3>
                </div>
                <p className="text-xs text-[var(--tk-text-muted)] mt-1 leading-relaxed">
                  Sesuaikan jam berangkat &amp; notifikasi otomatis menggunakan data
                  lalu lintas dan cuaca real-time antara lokasi asal dan tempat kerja.
                </p>
              </div>

              <ToggleSwitch
                checked={autoAdjustEnabled}
                onToggle={() => void handleToggleAutoAdjust()}
                testId="toggle-auto-adjust"
                ariaLabel="Aktifkan penyesuaian waktu berangkat otomatis"
              />
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="acc-origin-address"
                    className="block text-xs font-semibold text-[var(--tk-text-muted)]"
                  >
                    Alamat Asal / Rumah
                  </label>
                  <button
                    type="button"
                    data-testid="btn-use-gps"
                    onClick={() => handleDetectGps('origin')}
                    disabled={gpsBusyTarget !== null}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--tk-accent-text)] hover:underline disabled:opacity-50"
                  >
                    <Compass className="h-3 w-3" aria-hidden="true" />
                    {gpsBusyTarget === 'origin' ? 'Mendeteksi...' : 'Gunakan GPS Saat Ini'}
                  </button>
                </div>
                <div className="relative mt-1">
                  <MapPin
                    className="h-3.5 w-3.5 text-[var(--tk-text-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="acc-origin-address"
                    data-testid="input-origin-address"
                    type="text"
                    maxLength={160}
                    value={originAddress}
                    onChange={(e) => {
                      setOriginAddress(e.target.value);
                      if (originGpsCoords) {
                        setOriginGpsCoords(null);
                      }
                    }}
                    placeholder="Contoh: Tebet, Jakarta Selatan"
                    className={`${tkInputClass} pl-8 text-xs sm:text-sm`}
                  />
                </div>
                {originGpsCoords && (
                  <p className="mt-1 text-[11px] font-mono text-[var(--tk-text-subtle)]">
                    Koordinat asal tersimpan: {formatCoordsLabel(originGpsCoords)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="acc-destination-address"
                      className="block text-xs font-semibold text-[var(--tk-text-muted)]"
                    >
                      Alamat Kantor / Lokasi Kerja
                    </label>
                    <button
                      type="button"
                      data-testid="btn-detect-workplace-gps"
                      onClick={() => handleDetectGps('workplace')}
                      disabled={gpsBusyTarget !== null}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--tk-accent-text)] hover:underline disabled:opacity-50"
                    >
                      <Compass className="h-3 w-3" aria-hidden="true" />
                      {gpsBusyTarget === 'workplace' ? 'Mendeteksi...' : 'GPS Kantor'}
                    </button>
                  </div>
                  <input
                    id="acc-destination-address"
                    data-testid="input-destination-address"
                    type="text"
                    maxLength={160}
                    value={destinationAddress}
                    onChange={(e) => {
                      setDestinationAddress(e.target.value);
                      if (workplaceGpsCoords) {
                        setWorkplaceGpsCoords(null);
                      }
                    }}
                    placeholder="Contoh: Jl. Jend. Sudirman, Jakarta"
                    className={`mt-1 text-xs sm:text-sm ${tkInputClass}`}
                  />
                  {workplaceGpsCoords && (
                    <p className="mt-1 text-[11px] font-mono text-[var(--tk-text-subtle)]">
                      GPS kerja: {formatCoordsLabel(workplaceGpsCoords)}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="acc-travel-mode"
                    className="block text-xs font-semibold text-[var(--tk-text-muted)]"
                  >
                    Moda Transportasi Rute
                  </label>
                  <select
                    id="acc-travel-mode"
                    data-testid="select-travel-mode"
                    value={travelMode}
                    onChange={(e) =>
                      setTravelMode(e.target.value as CommuteTravelMode)
                    }
                    className={`mt-1 text-xs sm:text-sm ${tkSelectClass}`}
                  >
                    {TRAVEL_MODE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* GPS Departure Validation Subsection */}
              <div className="pt-3 border-t border-[var(--tk-border)] flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[var(--tk-text)]">
                    Validasi Lokasi GPS saat &ldquo;Sudah Berangkat&rdquo;
                  </p>
                  <p className="text-[11px] text-[var(--tk-text-subtle)] mt-0.5">
                    Mengecek GPS otomatis untuk memastikan Anda berangkat dari titik asal yang benar dan belum berada di kantor.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <select
                    aria-label="Radius toleransi GPS titik keberangkatan"
                    data-testid="select-gps-radius"
                    value={gpsRadiusMeters}
                    onChange={(e) => setGpsRadiusMeters(Number(e.target.value))}
                    disabled={!gpsValidationEnabled}
                    className="px-2.5 py-1.5 text-xs bg-[var(--tk-surface)] border border-[var(--tk-border)] rounded-[3px] text-[var(--tk-text)] disabled:opacity-50 focus:outline-none focus:border-[var(--tk-accent)]"
                  >
                    <option value={300}>Radius 300 m</option>
                    <option value={500}>Radius 500 m</option>
                    <option value={1000}>Radius 1 km</option>
                  </select>

                  <ToggleSwitch
                    checked={gpsValidationEnabled}
                    onToggle={() => void handleToggleGpsValidation()}
                    testId="toggle-gps-validation"
                    ariaLabel="Aktifkan validasi GPS saat Sudah Berangkat"
                  />
                </div>
              </div>

              {showBetaNotice && (
                <p className="text-[11px] text-[var(--tk-warning-text)] bg-[var(--tk-warning-soft)] border border-[var(--tk-warning-border)] rounded-[3px] px-3 py-2 leading-relaxed">
                  Catatan Beta: Rute {TRAVEL_MODE_LABELS[travelMode].toLowerCase()}{' '}
                  berstatus beta dan terkadang belum mencakup jalur pedestrian atau lajur
                  khusus secara lengkap.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  data-testid="btn-refresh-commute"
                  disabled={liveCommuteLoading}
                  onClick={() => void handleApplyRouteSettings(true)}
                  className="tk-cta-3d tk-armor-cut-sm inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px] disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${liveCommuteLoading ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  {liveCommuteLoading
                    ? 'Memeriksa Cuaca & Rute...'
                    : 'Simpan & Cek Cuaca/Lalu Lintas'}
                </button>

                <button
                  type="button"
                  data-testid="btn-save-route-settings"
                  onClick={() => void handleApplyRouteSettings(false)}
                  className="tk-armor-cut-sm px-3 py-2 text-xs font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] transition-colors"
                >
                  Simpan Pengaturan Rute
                </button>
              </div>

              {(routeNotice || liveCommuteError) && (
                <p
                  role="status"
                  className={`text-xs font-medium rounded-[3px] px-3 py-2 border ${
                    liveCommuteError
                      ? 'text-[var(--tk-error-text)] bg-[var(--tk-error-soft)] border-[var(--tk-error-border)]'
                      : 'text-[var(--tk-accent-text)] bg-[var(--tk-accent-soft)] border-[var(--tk-accent-border)]'
                  }`}
                >
                  {liveCommuteError || routeNotice}
                </p>
              )}

              {/* Live Weather & Traffic Telemetry Preview */}
              {liveCommute && (
                <div
                  data-testid="live-commute-preview"
                  className="rounded-[3px] bg-[var(--tk-surface)] border border-[var(--tk-border)] p-3.5 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-display text-xs font-bold uppercase tracking-wide text-[var(--tk-text)]">
                      Kondisi Rute &amp; Cuaca Terkini
                    </span>
                    <span className="text-[11px] font-mono text-[var(--tk-text-subtle)]">
                      {formatDistanceLabel(liveCommute.distanceMeters)} ·{' '}
                      {TRAVEL_MODE_LABELS[liveCommute.travelMode]}
                    </span>
                  </div>

                  <p className="text-[11px] text-[var(--tk-text-muted)] truncate">
                    {liveCommute.originLabel} → {liveCommute.destinationLabel}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="rounded-[2px] bg-[var(--tk-surface-muted)] p-2.5 flex items-start gap-2">
                      <TrafficCone
                        className="h-4 w-4 text-[var(--tk-warning-text)] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-semibold text-[var(--tk-text)]">
                          Perjalanan:{' '}
                          <span className="font-mono tabular-nums">
                            {liveCommute.liveTravelMinutes} mnt
                          </span>
                        </p>
                        <p className="text-[11px] text-[var(--tk-text-subtle)]">
                          {liveCommute.trafficDelayMinutes > 0
                            ? `Tundaan lalu lintas +${liveCommute.trafficDelayMinutes} mnt dari normal (${liveCommute.baseTravelMinutes} mnt)`
                            : `Lalu lintas terpantau lancar (normal ${liveCommute.baseTravelMinutes} mnt)`}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[2px] bg-[var(--tk-surface-muted)] p-2.5 flex items-start gap-2">
                      <CloudRain
                        className="h-4 w-4 text-[var(--tk-info-text)] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-semibold text-[var(--tk-text)]">
                          {liveCommute.weatherDescription}
                          {liveCommute.temperatureCelsius !== null
                            ? ` · ${liveCommute.temperatureCelsius}°C`
                            : ''}
                        </p>
                        <p className="text-[11px] text-[var(--tk-text-subtle)]">
                          Buffer cuaca: +{liveCommute.weatherBufferMinutes} mnt (peluang
                          hujan {liveCommute.precipitationPercent}%)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--tk-border-subtle)] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="text-[var(--tk-text-muted)]">
                      {commuteSummary.isAutoAdjusted
                        ? `Aktif dipakai: ${commuteSummary.effectiveTravelMinutes} mnt jalan + ${commuteSummary.effectiveBufferMinutes} mnt buffer`
                        : 'Mode otomatis mati — masih menggunakan angka manual Anda.'}
                    </span>
                    <span className="font-mono font-bold text-[var(--tk-accent-text)]">
                      {commuteSummary.totalDeltaMinutes >= 0
                        ? `+${commuteSummary.totalDeltaMinutes} mnt vs manual`
                        : `${commuteSummary.totalDeltaMinutes} mnt vs manual`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 2: Google Account & Cloud Sync Status */}
          <div className="rounded-[3px] p-4 bg-[var(--tk-surface-muted)] border border-[var(--tk-border)] flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {user ? (
                <Cloud
                  className="h-5 w-5 text-[var(--tk-success-text)] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
              ) : (
                <CloudOff
                  className="h-5 w-5 text-[var(--tk-text-subtle)] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
              )}
              <div>
                <p className="text-sm font-bold text-[var(--tk-text)]">
                  {user
                    ? `Masuk sebagai ${profile?.displayName || user.displayName || user.email}`
                    : 'Mode Lokal Tanpa Akun'}
                </p>
                <p className="text-xs text-[var(--tk-text-muted)] mt-0.5">
                  {user
                    ? `${user.email ?? 'Akun Google'} · Status: ${
                        syncStatus === 'syncing'
                          ? 'Menyinkronkan...'
                          : syncStatus === 'error'
                            ? 'Perlu Sinkronisasi Ulang'
                            : 'Tersinkronisasi ke Cloud'
                      }`
                    : 'Masuk dengan Google untuk mencadangkan jadwal, shift, tema, rute, dan catatan kerja Anda lintas perangkat.'}
                </p>
              </div>
            </div>
          </div>

          {syncMessage && (
            <p
              role="status"
              className="text-xs font-medium text-[var(--tk-accent-text)] bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] rounded-[3px] px-3.5 py-2.5"
            >
              {syncMessage}
            </p>
          )}

          {!user ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={onSignInGoogle}
                disabled={authBusy}
                className="tk-cta-3d tk-armor-cut-sm w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px] disabled:opacity-60"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                {authBusy ? 'Membuka Jendela Masuk...' : 'Buat / Masuk Akun Pribadi (Google)'}
              </button>
              <p className="text-xs text-[var(--tk-text-subtle)] text-center">
                Data lokal &amp; pengaturan rute Anda tetap aman dan otomatis digabungkan saat masuk.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitProfile} className="space-y-4">
              <div>
                <label
                  htmlFor="acc-display-name"
                  className="block text-xs font-semibold text-[var(--tk-text-muted)]"
                >
                  Nama Panggilan / Tampilan
                </label>
                <input
                  id="acc-display-name"
                  type="text"
                  maxLength={80}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`mt-1 ${tkInputClass}`}
                  placeholder="Contoh: Kemas Rachman"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="acc-role"
                    className="block text-xs font-semibold text-[var(--tk-text-muted)]"
                  >
                    Jabatan / Profesi
                  </label>
                  <input
                    id="acc-role"
                    type="text"
                    maxLength={60}
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className={`mt-1 ${tkInputClass}`}
                    placeholder="Contoh: Supervisor Operasional"
                  />
                </div>
                <div>
                  <label
                    htmlFor="acc-workplace"
                    className="block text-xs font-semibold text-[var(--tk-text-muted)]"
                  >
                    Kantor / Lokasi Kerja
                  </label>
                  <input
                    id="acc-workplace"
                    type="text"
                    maxLength={80}
                    value={workplaceName}
                    onChange={(e) => setWorkplaceName(e.target.value)}
                    className={`mt-1 ${tkInputClass}`}
                    placeholder="Contoh: Gedung Sudirman Lt. 8"
                  />
                </div>
              </div>

              {saveNotice && (
                <p
                  role="status"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--tk-success-text)]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{saveNotice}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="tk-cta-3d tk-armor-cut-sm px-4 py-2 text-xs font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px] disabled:opacity-60"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Profil Pribadi'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onForceSync()}
                    className="tk-armor-cut-sm inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Sinkronkan Data
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onSignOut}
                  className="tk-armor-cut-sm inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--tk-error-text)] bg-[var(--tk-error-soft)] border border-[var(--tk-error-border)] hover:opacity-90 rounded-[2px] transition-opacity"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  Keluar
                </button>
              </div>
            </form>
          )}

          <div className="pt-4 border-t border-[var(--tk-border)] flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[var(--tk-text)]">
                Animasi Pembuka Aplikasi
              </p>
              <p className="text-xs text-[var(--tk-text-subtle)]">
                Putar ulang animasi pembuka TepatKerja sesuai tema aktif saat ini.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onReplayIntro();
              }}
              className="tk-armor-cut-sm inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[var(--tk-accent-text)] bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] rounded-[2px] hover:opacity-90"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              Putar Ulang Intro
            </button>
          </div>
        </div>
    </AnimatedModal>
  );
}
