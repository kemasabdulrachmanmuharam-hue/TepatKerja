/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { MotionConfig } from 'motion/react';
import { AccountModal } from './components/AccountPanel';
import { ActiveAlertModal } from './components/ActiveAlertModal';
import { CommuteAlarmView } from './components/CommuteAlarmView';
import { DashboardView } from './components/DashboardView';
import { GpsDepartureModal } from './components/GpsDepartureModal';
import { IntroSplash } from './components/IntroSplash';
import {
  OfflineIndicator,
  PWAInstallBanner,
} from './components/PWAInstallBanner';
import { QuickShiftModal } from './components/QuickShiftModal';
import { ScheduleView } from './components/ScheduleView';
import { SidebarNav } from './components/SidebarNav';
import { Studio3DView } from './components/Studio3DView';
import { ThemeBackdrop } from './components/ThemeBackdrop';
import { ThemeQuickBar } from './components/ThemeSwitcher';
import { TopBar } from './components/TopBar';
import { ZenFocusOverlay } from './components/ZenFocusOverlay';
import {
  auth,
  saveWorkspaceToCloud,
  signInWithGoogle,
  signOutAccount,
  subscribeToAccountAndWorkspace,
  upsertUserAccount,
} from './firebase';
import type {
  ActiveAlert,
  AlarmRuntimeState,
  AlarmToneId,
  AmbientSoundPreset,
  AppTab,
  CommuteAndReminderConfig,
  CommuteRouteProfile,
  DateOverride,
  DayOfWeek,
  DepartureLocationValidationResult,
  GeoPoint,
  LiveCommuteConditions,
  NonWorkCategory,
  QuickBufferPreset,
  ShiftTemplate,
  TepatKerjaState,
  UserProfileData,
  WorkspaceExtras,
} from './types/schedule';
import { alarmAudio } from './utils/audioAlarm';
import { createDepartureLogFromOccurrence } from './utils/analytics';
import {
  evaluateDueReminder,
  findCurrentWorkingOccurrence,
  findNextActiveOccurrence,
  formatDateKey,
  getActiveInlineReminderNotice,
  getUpcomingWeekSchedule,
  validateImportedState,
} from './utils/scheduleEngine';
import {
  computeEffectiveCommuteConfig,
  evaluateDepartureLocationMatch,
  fetchLiveCommuteConditions,
  validateDepartureLocation,
} from './utils/smartCommute';
import {
  STANDARD_SHIFT_TEMPLATES,
  createDefaultExtras,
  createDefaultRuntime,
  createDefaultState,
  loadExtrasFromStorage,
  loadLiveCommuteFromStorage,
  loadRuntimeFromStorage,
  loadStateFromStorage,
  saveExtrasToStorage,
  saveLiveCommuteToStorage,
  saveRuntimeToStorage,
  saveStateToStorage,
} from './utils/storage';
import {
  applyThemeToDocument,
  clampNightEndHour,
  clampNightStartHour,
  getSystemColorMode,
  isNightTime,
  loadThemeSettings,
  resolveEffectiveColorMode,
  saveThemeSettings,
  type ColorMode,
  type ThemePresetId,
  type ThemeSettings,
} from './utils/theme';
import {
  computePunctualityStreak,
  downloadUpcomingIcs,
  getBufferMinutesForPreset,
  getChecklistProgress,
} from './utils/workspaceFeatures';

function getBrowserNotificationPermission():
  | NotificationPermission
  | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

function shouldSkipIntroOnLoad(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('autostart') === '1';
}

export default function App() {
  const [state, setState] = useState<TepatKerjaState>(() =>
    loadStateFromStorage(),
  );
  const [runtime, setRuntime] = useState<AlarmRuntimeState>(() =>
    loadRuntimeFromStorage(),
  );
  const [extras, setExtras] = useState<WorkspaceExtras>(() =>
    loadExtrasFromStorage(),
  );
  const [systemColorMode, setSystemColorMode] = useState<ColorMode>(() =>
    getSystemColorMode(),
  );
  const [theme, setTheme] = useState<ThemeSettings>(() => {
    const storedTheme = loadThemeSettings();
    const initialExtras = loadExtrasFromStorage();
    return {
      ...storedTheme,
      colorMode: resolveEffectiveColorMode({
        scheduleMode: initialExtras.themeScheduleMode,
        manualColorMode: storedTheme.colorMode,
        now: new Date(),
        nightStartHour: initialExtras.nightStartHour,
        nightEndHour: initialExtras.nightEndHour,
        systemColorMode: getSystemColorMode(),
      }),
    };
  });

  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const [sessionStartMs] = useState<number>(() => Date.now());
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const [isQuickShiftOpen, setIsQuickShiftOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [focusMode, setFocusMode] = useState<'work' | 'break'>('work');
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusSecondsLeft, setFocusSecondsLeft] = useState<number>(
    () => extras.focusWorkMinutes * 60,
  );
  const [showIntro, setShowIntro] = useState<boolean>(() => !shouldSkipIntroOnLoad());
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => getBrowserNotificationPermission());
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  // Firebase Auth & Cloud Sync states
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [syncStatus, setSyncStatus] = useState<
    'local' | 'syncing' | 'synced' | 'error'
  >('local');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Smart Commute (Real-Time Weather & Traffic via Google Maps Platform)
  const [liveCommute, setLiveCommute] = useState<LiveCommuteConditions | null>(
    () => loadLiveCommuteFromStorage(),
  );
  const [liveCommuteLoading, setLiveCommuteLoading] = useState(false);
  const [liveCommuteError, setLiveCommuteError] = useState<string | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  // Automatic GPS departure location validation state
  const [gpsChecking, setGpsChecking] = useState(false);
  const [pendingGpsDeparture, setPendingGpsDeparture] = useState<{
    occurrenceKey: string;
    shiftName: string;
    validation: DepartureLocationValidationResult;
  } | null>(null);

  const gpsCheckInFlightRef = useRef(false);
  const applyingRemoteRef = useRef(false);
  const hydratedUidRef = useRef<string | null>(null);
  const latestPayloadRef = useRef({ state, theme, extras });
  latestPayloadRef.current = { state, theme, extras };

  // Listen for Google Maps Platform auth/quota failures anywhere in the app
  useEffect(() => {
    const handleQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Persist & apply Light/Dark mode + 5 theme preset
  useEffect(() => {
    applyThemeToDocument(theme);
    saveThemeSettings(theme);
  }, [theme]);

  // Listen for OS prefers-color-scheme changes
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemColorMode(event.matches ? 'dark' : 'light');
    };
    setSystemColorMode(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Automatically switch theme in Otomatis (night/day) or Sistem (OS preference) modes
  const isNightNow = useMemo(
    () => isNightTime(now, extras.nightStartHour, extras.nightEndHour),
    [now, extras.nightStartHour, extras.nightEndHour],
  );

  useEffect(() => {
    if (extras.themeScheduleMode === 'manual') {
      return;
    }
    const targetColorMode: ColorMode =
      extras.themeScheduleMode === 'system'
        ? systemColorMode
        : isNightNow
          ? 'dark'
          : 'light';
    setTheme((prev) =>
      prev.colorMode === targetColorMode
        ? prev
        : { ...prev, colorMode: targetColorMode },
    );
  }, [extras.themeScheduleMode, isNightNow, systemColorMode]);

  // Persist state, runtime, extras & live commute cache locally
  useEffect(() => {
    saveStateToStorage(state);
  }, [state]);

  useEffect(() => {
    saveRuntimeToStorage(runtime);
  }, [runtime]);

  useEffect(() => {
    saveExtrasToStorage(extras);
  }, [extras]);

  useEffect(() => {
    saveLiveCommuteToStorage(liveCommute);
  }, [liveCommute]);

  // Sync Web Audio ambient focus soundscape with selected preset & volume
  useEffect(() => {
    if (extras.ambientPreset === 'off') {
      alarmAudio.stopAmbient();
      return;
    }
    alarmAudio.startAmbient(extras.ambientPreset, state.config.volume);
  }, [extras.ambientPreset]);

  useEffect(() => {
    if (extras.ambientPreset !== 'off') {
      alarmAudio.setAmbientVolume(state.config.volume);
    }
  }, [state.config.volume, extras.ambientPreset]);

  // Subscribe to Firebase Auth state & user's private cloud workspace
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (nextUser) => {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }
      hydratedUidRef.current = null;
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setSyncStatus('local');
        setSyncMessage(null);
        return;
      }

      setSyncStatus('syncing');
      void upsertUserAccount(nextUser).catch((err) => {
        console.error(err);
      });

      unsubFirestore = subscribeToAccountAndWorkspace(nextUser.uid, {
        onAccount: (nextProfile) => {
          setProfile(nextProfile);
        },
        onWorkspace: (payload) => {
          if (!payload) {
            hydratedUidRef.current = nextUser.uid;
            // First login with empty cloud workspace: seed cloud with local state
            void saveWorkspaceToCloud(nextUser, latestPayloadRef.current)
              .then(() => {
                setSyncStatus('synced');
              })
              .catch(() => {
                setSyncStatus('error');
                setSyncMessage('Gagal mengunggah data awal ke cloud.');
              });
            return;
          }

          applyingRemoteRef.current = true;
          try {
            if (payload.state && validateImportedState(payload.state)) {
              setState(payload.state);
            }
            const remoteScheduleMode =
              payload.extras?.themeScheduleMode === 'manual'
                ? 'manual'
                : payload.extras?.themeScheduleMode === 'system'
                  ? 'system'
                  : 'auto';
            const remoteNightStart = clampNightStartHour(
              payload.extras?.nightStartHour ?? latestPayloadRef.current.extras.nightStartHour,
            );
            const remoteNightEnd = clampNightEndHour(
              payload.extras?.nightEndHour ?? latestPayloadRef.current.extras.nightEndHour,
            );
            if (
              payload.theme &&
              (payload.theme.colorMode === 'light' ||
                payload.theme.colorMode === 'dark')
            ) {
              setTheme({
                ...payload.theme,
                colorMode: resolveEffectiveColorMode({
                  scheduleMode: remoteScheduleMode,
                  manualColorMode: payload.theme.colorMode,
                  now: new Date(),
                  nightStartHour: remoteNightStart,
                  nightEndHour: remoteNightEnd,
                  systemColorMode: getSystemColorMode(),
                }),
              });
            }
            if (payload.extras) {
              setExtras((prev) => ({
                ...prev,
                ...payload.extras,
                themeScheduleMode: remoteScheduleMode,
                nightStartHour: remoteNightStart,
                nightEndHour: remoteNightEnd,
                checklistLabels:
                  Array.isArray(payload.extras?.checklistLabels) &&
                  payload.extras.checklistLabels.length > 0
                    ? payload.extras.checklistLabels
                    : prev.checklistLabels,
                checklistDoneKeys: Array.isArray(payload.extras?.checklistDoneKeys)
                  ? payload.extras.checklistDoneKeys
                  : prev.checklistDoneKeys,
                shiftNotes:
                  payload.extras?.shiftNotes &&
                  typeof payload.extras.shiftNotes === 'object'
                    ? payload.extras.shiftNotes
                    : prev.shiftNotes,
              }));
            }
            hydratedUidRef.current = nextUser.uid;
            setSyncStatus('synced');
            setSyncMessage(null);
          } finally {
            window.setTimeout(() => {
              applyingRemoteRef.current = false;
            }, 60);
          }
        },
        onError: () => {
          setSyncStatus('error');
          setSyncMessage('Sinkronisasi cloud terganggu. Perubahan tetap aman di browser.');
        },
      });
    });

    return () => {
      if (unsubFirestore) {
        unsubFirestore();
      }
      unsubAuth();
    };
  }, []);

  // Debounced auto-save to Firestore when authenticated and hydrated
  useEffect(() => {
    if (!user || hydratedUidRef.current !== user.uid || applyingRemoteRef.current) {
      return;
    }

    setSyncStatus('syncing');
    const timer = window.setTimeout(() => {
      void saveWorkspaceToCloud(user, { state, theme, extras })
        .then(() => {
          setSyncStatus('synced');
          setSyncMessage(null);
        })
        .catch(() => {
          setSyncStatus('error');
          setSyncMessage('Gagal menyinkronkan ke cloud. Data tersimpan di browser.');
        });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [user, state, theme, extras]);

  // 1-second real-time ticker
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Shared focus countdown tick (persists across normal view & Mode Fokus Zen)
  useEffect(() => {
    if (!focusRunning) {
      return;
    }
    const timer = window.setInterval(() => {
      setFocusSecondsLeft((prev) => {
        if (prev <= 1) {
          const nextMode = focusMode === 'work' ? 'break' : 'work';
          setFocusMode(nextMode);
          return (
            (nextMode === 'work'
              ? extras.focusWorkMinutes
              : extras.focusBreakMinutes) * 60
          );
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [focusRunning, focusMode, extras.focusWorkMinutes, extras.focusBreakMinutes]);

  // Allow Esc key to exit Mode Fokus Zen cleanly
  useEffect(() => {
    if (!isZenMode) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !activeAlert) {
        setIsZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode, activeAlert]);

  const commuteProfile: CommuteRouteProfile = useMemo(
    () => ({
      autoAdjustEnabled: extras.autoAdjustEnabled,
      originAddress: extras.originAddress,
      destinationAddress: extras.destinationAddress,
      travelMode: extras.travelMode,
      originCoords: extras.originCoords,
      workplaceCoords: extras.workplaceCoords,
      gpsValidationEnabled: extras.gpsValidationEnabled,
      gpsRadiusMeters: extras.gpsRadiusMeters,
    }),
    [
      extras.autoAdjustEnabled,
      extras.originAddress,
      extras.destinationAddress,
      extras.travelMode,
      extras.originCoords,
      extras.workplaceCoords,
      extras.gpsValidationEnabled,
      extras.gpsRadiusMeters,
    ],
  );

  const commuteSummary = useMemo(
    () =>
      computeEffectiveCommuteConfig(
        state.config,
        extras.autoAdjustEnabled,
        liveCommute,
      ),
    [state.config, extras.autoAdjustEnabled, liveCommute],
  );

  const effectiveState = useMemo(
    () =>
      commuteSummary.isAutoAdjusted
        ? { ...state, config: commuteSummary.effectiveConfig }
        : state,
    [state, commuteSummary],
  );

  const currentWorkingShift = useMemo(
    () => findCurrentWorkingOccurrence(now, effectiveState),
    [now, effectiveState],
  );

  const nextOccurrence = useMemo(
    () =>
      findNextActiveOccurrence(
        now,
        effectiveState,
        runtime.departedOccurrenceKey,
      ),
    [now, effectiveState, runtime.departedOccurrenceKey],
  );

  const upcomingWeek = useMemo(
    () => getUpcomingWeekSchedule(now, effectiveState, 7),
    [now, effectiveState],
  );

  const inlineNotice = useMemo(
    () =>
      activeAlert
        ? null
        : getActiveInlineReminderNotice(
            now,
            nextOccurrence,
            commuteSummary.effectiveConfig,
            runtime,
          ),
    [activeAlert, now, nextOccurrence, commuteSummary.effectiveConfig, runtime],
  );

  const streakStats = useMemo(
    () => computePunctualityStreak(state.departureLogs ?? []),
    [state.departureLogs],
  );

  const checklistStats = useMemo(
    () =>
      getChecklistProgress(
        nextOccurrence?.occurrenceKey ?? null,
        extras.checklistLabels,
        extras.checklistDoneKeys,
      ),
    [nextOccurrence?.occurrenceKey, extras.checklistLabels, extras.checklistDoneKeys],
  );

  const refreshLiveCommute = async (
    profileOverride?: CommuteRouteProfile,
    forceRefresh = false,
  ) => {
    const target = profileOverride ?? commuteProfile;
    const origin = target.originAddress.trim();
    const destination = target.destinationAddress.trim();
    if ((!origin && !target.originCoords) || !destination) {
      setLiveCommuteError(
        'Isi alamat asal dan lokasi kerja terlebih dahulu di Pengaturan Profil.',
      );
      return;
    }

    setLiveCommuteLoading(true);
    setLiveCommuteError(null);
    try {
      const nextLive = await fetchLiveCommuteConditions({
        originAddress: origin,
        destinationAddress: destination,
        travelMode: target.travelMode,
        originCoords: target.originCoords ?? null,
        forceRefresh,
      });
      setLiveCommute(nextLive);
    } catch (err) {
      setLiveCommuteError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil kondisi cuaca & lalu lintas terkini.',
      );
    } finally {
      setLiveCommuteLoading(false);
    }
  };

  // Gentle auto-refresh every 30 minutes when smart commute is enabled
  useEffect(() => {
    if (!extras.autoAdjustEnabled) {
      return;
    }
    const origin = extras.originAddress.trim();
    const destination = extras.destinationAddress.trim();
    if (!origin || !destination) {
      return;
    }

    const thirtyMinutesMs = 30 * 60_000;
    const fetchedMs =
      typeof liveCommute?.fetchedAt === 'number'
        ? liveCommute.fetchedAt
        : NaN;
    const isRouteChanged =
      !liveCommute ||
      liveCommute.travelMode !== extras.travelMode;
    const isStale =
      !Number.isFinite(fetchedMs) || Date.now() - fetchedMs > thirtyMinutesMs;

    if (isRouteChanged || isStale) {
      void refreshLiveCommute({
        autoAdjustEnabled: extras.autoAdjustEnabled,
        originAddress: origin,
        destinationAddress: destination,
        travelMode: extras.travelMode,
      });
    }

    const interval = window.setInterval(() => {
      void refreshLiveCommute({
        autoAdjustEnabled: extras.autoAdjustEnabled,
        originAddress: origin,
        destinationAddress: destination,
        travelMode: extras.travelMode,
      });
    }, thirtyMinutesMs);

    return () => window.clearInterval(interval);
  }, [
    extras.autoAdjustEnabled,
    extras.originAddress,
    extras.destinationAddress,
    extras.travelMode,
  ]);

  // Unlock Web Audio on first user gesture anywhere in the app
  useEffect(() => {
    const handleFirstGesture = () => {
      alarmAudio.unlockAudio();
    };
    window.addEventListener('pointerdown', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  const fireBrowserNotification = (title: string, body: string) => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(title, { body });
      } catch {
        // Fallback silently to in-app alert
      }
    }
  };

  // Evaluate due reminder stage every tick (live milestones & snooze only)
  useEffect(() => {
    if (activeAlert) {
      return;
    }
    const due = evaluateDueReminder(
      now,
      nextOccurrence,
      commuteSummary.effectiveConfig,
      runtime,
      sessionStartMs,
    );
    if (!due) {
      return;
    }

    setActiveAlert(due);
    alarmAudio.startLoop(
      commuteSummary.effectiveConfig.nadaAlarm,
      commuteSummary.effectiveConfig.volume,
    );
    fireBrowserNotification(due.title, due.message);

    if (runtime.snoozedUntil !== null) {
      setRuntime((prev) => ({
        ...prev,
        snoozedUntil: null,
        snoozedAlert: null,
      }));
    }
  }, [
    now,
    nextOccurrence,
    commuteSummary.effectiveConfig,
    runtime,
    activeAlert,
    sessionStartMs,
  ]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      alarmAudio.stop();
      alarmAudio.stopAmbient();
    };
  }, []);

  const handleSelectAutoThemeMode = () => {
    const detectedMode: ColorMode = isNightTime(
      now,
      extras.nightStartHour,
      extras.nightEndHour,
    )
      ? 'dark'
      : 'light';
    setExtras((prev) => ({ ...prev, themeScheduleMode: 'auto' }));
    setTheme((prev) => ({ ...prev, colorMode: detectedMode }));
  };

  const handleSelectSystemThemeMode = () => {
    const detectedMode = getSystemColorMode();
    setSystemColorMode(detectedMode);
    setExtras((prev) => ({ ...prev, themeScheduleMode: 'system' }));
    setTheme((prev) => ({ ...prev, colorMode: detectedMode }));
  };

  const handleChangeColorMode = (colorMode: ColorMode) => {
    setExtras((prev) => ({ ...prev, themeScheduleMode: 'manual' }));
    setTheme((prev) => ({ ...prev, colorMode }));
  };

  const handleChangeNightWindow = (
    nightStartHour: number,
    nightEndHour: number,
  ) => {
    const cleanStart = clampNightStartHour(nightStartHour);
    const cleanEnd = clampNightEndHour(nightEndHour);
    setExtras((prev) => ({
      ...prev,
      themeScheduleMode: 'auto',
      nightStartHour: cleanStart,
      nightEndHour: cleanEnd,
    }));
    const detectedMode: ColorMode = isNightTime(now, cleanStart, cleanEnd)
      ? 'dark'
      : 'light';
    setTheme((prev) => ({ ...prev, colorMode: detectedMode }));
  };

  const handleChangePreset = (presetId: ThemePresetId) => {
    setTheme((prev) => ({ ...prev, presetId }));
  };

  const handleSignInGoogle = async () => {
    setAuthBusy(true);
    setSyncMessage(null);
    try {
      await signInWithGoogle();
    } catch {
      setSyncMessage(
        'Proses masuk dibatalkan atau gagal. Silakan coba lagi.',
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOutAccount();
    setSyncMessage('Anda keluar dari akun pribadi. Mode lokal tetap aktif.');
  };

  const handleSaveProfile = async (data: {
    displayName: string;
    roleTitle: string;
    workplaceName: string;
  }) => {
    if (!user) {
      return;
    }
    const updated = await upsertUserAccount(user, data);
    setProfile(updated);
  };

  const handleForceSync = async () => {
    if (!user) {
      return;
    }
    setSyncStatus('syncing');
    await saveWorkspaceToCloud(user, { state, theme, extras });
    setSyncStatus('synced');
    setSyncMessage('Seluruh data workspace berhasil disinkronkan.');
  };

  const handleSaveCommuteProfile = async (
    nextProfile: CommuteRouteProfile,
    refreshLiveNow: boolean,
  ) => {
    setExtras((prev) => ({
      ...prev,
      autoAdjustEnabled: nextProfile.autoAdjustEnabled,
      originAddress: nextProfile.originAddress,
      destinationAddress: nextProfile.destinationAddress,
      travelMode: nextProfile.travelMode,
      originCoords:
        nextProfile.originCoords !== undefined
          ? nextProfile.originCoords
          : prev.originCoords,
      workplaceCoords:
        nextProfile.workplaceCoords !== undefined
          ? nextProfile.workplaceCoords
          : prev.workplaceCoords,
      gpsValidationEnabled:
        nextProfile.gpsValidationEnabled !== undefined
          ? nextProfile.gpsValidationEnabled
          : prev.gpsValidationEnabled,
      gpsRadiusMeters:
        nextProfile.gpsRadiusMeters !== undefined
          ? nextProfile.gpsRadiusMeters
          : prev.gpsRadiusMeters,
    }));

    if (
      user &&
      profile &&
      nextProfile.destinationAddress.trim() &&
      !profile.workplaceName.trim()
    ) {
      void upsertUserAccount(user, {
        displayName: profile.displayName,
        roleTitle: profile.roleTitle,
        workplaceName: nextProfile.destinationAddress.trim(),
      })
        .then((updated) => setProfile(updated))
        .catch(() => {
          // Non-blocking workplace sync
        });
    }

    if (refreshLiveNow) {
      await refreshLiveCommute(nextProfile, true);
    } else if (!nextProfile.autoAdjustEnabled) {
      setLiveCommuteError(null);
    }
  };

  const handleSelectQuickBuffer = (preset: QuickBufferPreset) => {
    const minutes = getBufferMinutesForPreset(preset);
    setExtras((prev) => ({ ...prev, quickBufferPreset: preset }));
    setState((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        bufferKeterlambatanMenit: minutes,
      },
    }));
  };

  const handleUpdateShiftNote = (dateKey: string, note: string) => {
    setExtras((prev) => ({
      ...prev,
      shiftNotes: {
        ...prev.shiftNotes,
        [dateKey]: note,
      },
    }));
  };

  const handleToggleChecklistItem = (itemId: string) => {
    const occKey = nextOccurrence?.occurrenceKey ?? 'default';
    const fullKey = `${occKey}__${itemId}`;
    setExtras((prev) => {
      const exists = prev.checklistDoneKeys.includes(fullKey);
      return {
        ...prev,
        checklistDoneKeys: exists
          ? prev.checklistDoneKeys.filter((k) => k !== fullKey)
          : [...prev.checklistDoneKeys.slice(-39), fullKey],
      };
    });
  };

  const handleAddChecklistItem = (label: string) => {
    const clean = label.trim().slice(0, 60);
    if (!clean) {
      return;
    }
    setExtras((prev) => {
      if (prev.checklistLabels.length >= 15) {
        return prev;
      }
      return {
        ...prev,
        checklistLabels: [
          ...prev.checklistLabels,
          { id: `chk-${Date.now().toString(36)}`, label: clean },
        ],
      };
    });
  };

  const handleRemoveChecklistItem = (itemId: string) => {
    setExtras((prev) => ({
      ...prev,
      checklistLabels:
        prev.checklistLabels.length > 1
          ? prev.checklistLabels.filter((item) => item.id !== itemId)
          : prev.checklistLabels,
    }));
  };

  const handleToggleFocusRunning = () => {
    setFocusRunning((prev) => !prev);
  };

  const handleResetFocusTimer = () => {
    setFocusRunning(false);
    setFocusSecondsLeft(
      (focusMode === 'work'
        ? extras.focusWorkMinutes
        : extras.focusBreakMinutes) * 60,
    );
  };

  const handleSelectFocusPreset = (workMin: number, breakMin: number) => {
    setFocusRunning(false);
    setFocusMode('work');
    setFocusSecondsLeft(workMin * 60);
    setExtras((prev) => ({
      ...prev,
      focusWorkMinutes: workMin,
      focusBreakMinutes: breakMin,
    }));
  };

  const handleChangeAmbientPreset = (preset: AmbientSoundPreset) => {
    alarmAudio.unlockAudio();
    setExtras((prev) => ({
      ...prev,
      ambientPreset: preset,
    }));
  };

  const handleRequestNotification = async () => {
    alarmAudio.unlockAudio();
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      setTestFeedback('Browser ini tidak mendukung notifikasi desktop.');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      if (result === 'granted') {
        setTestFeedback('Notifikasi browser berhasil diaktifkan.');
        fireBrowserNotification(
          'TepatKerja Siap Mengingatkan',
          'Notifikasi pengingat waktu berangkat sudah aktif.',
        );
      } else {
        setTestFeedback(
          'Izin notifikasi ditolak. Alarm suara & peringatan di halaman tetap aktif.',
        );
      }
    } catch {
      setTestFeedback('Gagal meminta izin notifikasi browser.');
    }
  };

  const triggerAlarmSimulation = () => {
    alarmAudio.unlockAudio();
    const targetShift = nextOccurrence?.shiftName || 'Kantor Reguler';
    const targetDepart = nextOccurrence?.jamBerangkatStr || '07:15';
    const targetCheckIn = nextOccurrence?.jamMasukStr || '08:00';

    const simAlert: ActiveAlert = {
      key: `sim__${Date.now()}`,
      occurrenceKey: nextOccurrence?.occurrenceKey || 'simulation',
      stageId: 'depart_now',
      title: 'Waktunya Berangkat (Simulasi)',
      message: `${targetShift} · Ini adalah simulasi alarm pengingat keberangkatan kerja.`,
      shiftName: targetShift,
      departTimeStr: targetDepart,
      checkInTimeStr: targetCheckIn,
      isSimulation: true,
    };

    setActiveAlert(simAlert);
    alarmAudio.startLoop(state.config.nadaAlarm, state.config.volume);
    fireBrowserNotification(simAlert.title, simAlert.message);
    setTestFeedback('Simulasi alarm sedang dijalankan.');
  };

  const handleSnoozeAlert = () => {
    alarmAudio.stop();
    if (!activeAlert) {
      return;
    }
    if (activeAlert.isSimulation) {
      setActiveAlert(null);
      setTestFeedback(
        `Simulasi ditunda ${state.config.snoozeMenit} menit (dinonaktifkan otomatis).`,
      );
      return;
    }

    const snoozeMs = state.config.snoozeMenit * 60_000;
    const snoozedAlert = activeAlert;
    setRuntime((prev) => ({
      ...prev,
      triggeredKeys: prev.triggeredKeys.includes(snoozedAlert.key)
        ? prev.triggeredKeys
        : [...prev.triggeredKeys, snoozedAlert.key],
      snoozedUntil: Date.now() + snoozeMs,
      snoozedAlert,
    }));
    setActiveAlert(null);
  };

  const handleDismissAlert = () => {
    alarmAudio.stop();
    if (!activeAlert) {
      return;
    }
    if (!activeAlert.isSimulation) {
      const dismissedKey = activeAlert.key;
      setRuntime((prev) => ({
        ...prev,
        triggeredKeys: prev.triggeredKeys.includes(dismissedKey)
          ? prev.triggeredKeys
          : [...prev.triggeredKeys, dismissedKey],
        snoozedUntil: null,
        snoozedAlert: null,
      }));
    }
    setActiveAlert(null);
  };

  const readCurrentBrowserGps = (): Promise<{
    coords: GeoPoint | null;
    error: 'denied' | 'unavailable' | null;
  }> => {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        resolve({ coords: null, error: 'unavailable' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            coords: {
              lat: Math.round(pos.coords.latitude * 100000) / 100000,
              lng: Math.round(pos.coords.longitude * 100000) / 100000,
            },
            error: null,
          });
        },
        (err) => {
          resolve({
            coords: null,
            error: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable',
          });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      );
    });
  };

  const commitMarkDeparted = (
    occurrenceKey: string,
    validationResult: DepartureLocationValidationResult | null,
  ) => {
    if (nextOccurrence && nextOccurrence.occurrenceKey === occurrenceKey) {
      const gpsDistanceMeters =
        validationResult?.status === 'at_workplace'
          ? validationResult.distanceToWorkplaceMeters
          : validationResult?.distanceToOriginMeters ?? null;

      const logEntry = createDepartureLogFromOccurrence(
        nextOccurrence,
        new Date(),
        validationResult
          ? {
              gpsStatus: validationResult.status,
              gpsDistanceMeters,
              gpsLocationLabel: validationResult.detectedLocationLabel,
            }
          : undefined,
      );
      setState((prev) => ({
        ...prev,
        departureLogs: [
          ...(prev.departureLogs ?? []).filter(
            (item) => item.dateKey !== logEntry.dateKey,
          ),
          logEntry,
        ],
      }));
    }

    setRuntime((prev) => ({
      ...prev,
      departedOccurrenceKey: occurrenceKey,
      snoozedUntil: null,
      snoozedAlert: null,
    }));

    if (validationResult) {
      setTestFeedback(
        `${validationResult.message} Status keberangkatan dicatat.`,
      );
    } else {
      setTestFeedback(
        'Status keberangkatan dicatat. Beralih ke jadwal kerja berikutnya.',
      );
    }
  };

  const handleMarkDeparted = async (occurrenceKey: string) => {
    if (gpsCheckInFlightRef.current) {
      return;
    }

    alarmAudio.stop();
    setActiveAlert(null);

    if (!extras.gpsValidationEnabled) {
      commitMarkDeparted(occurrenceKey, null);
      return;
    }

    gpsCheckInFlightRef.current = true;
    setGpsChecking(true);
    setTestFeedback('Mendeteksi posisi GPS untuk validasi titik keberangkatan...');

    try {
      const { coords, error } = await readCurrentBrowserGps();
      let validationResult: DepartureLocationValidationResult;

      if (!coords) {
        validationResult = evaluateDepartureLocationMatch({
          currentCoords: null,
          originCoords: extras.originCoords,
          workplaceCoords: extras.workplaceCoords,
          expectedOriginLabel: extras.originAddress,
          workplaceLabel: extras.destinationAddress || profile?.workplaceName || '',
          thresholdMeters: extras.gpsRadiusMeters,
          gpsError: error,
        });
      } else {
        validationResult = await validateDepartureLocation({
          currentCoords: coords,
          originAddress: extras.originAddress,
          destinationAddress:
            extras.destinationAddress || profile?.workplaceName || '',
          originCoords: extras.originCoords,
          workplaceCoords: extras.workplaceCoords,
          thresholdMeters: extras.gpsRadiusMeters,
        });

        // Cache newly resolved origin/workplace coordinates if they weren't stored yet
        if (
          (!extras.originCoords && validationResult.resolvedOriginCoords) ||
          (!extras.workplaceCoords && validationResult.resolvedWorkplaceCoords)
        ) {
          setExtras((prev) => ({
            ...prev,
            originCoords:
              prev.originCoords ?? validationResult.resolvedOriginCoords,
            workplaceCoords:
              prev.workplaceCoords ?? validationResult.resolvedWorkplaceCoords,
          }));
        }
      }

      if (validationResult.shouldConfirm) {
        setPendingGpsDeparture({
          occurrenceKey,
          shiftName: nextOccurrence?.shiftName || 'Jadwal Kerja',
          validation: validationResult,
        });
        setTestFeedback(validationResult.message);
        return;
      }

      commitMarkDeparted(occurrenceKey, validationResult);
    } finally {
      gpsCheckInFlightRef.current = false;
      setGpsChecking(false);
    }
  };

  const handleAddShift = (shift: Omit<ShiftTemplate, 'id'>): string => {
    const newId = `shift-${Date.now().toString(36)}`;
    const created: ShiftTemplate = { id: newId, ...shift };
    setState((prev) => ({
      ...prev,
      shiftTemplates: [...prev.shiftTemplates, created],
    }));
    return newId;
  };

  const handleQuickShiftSave = (
    shift: Omit<ShiftTemplate, 'id'>,
    applyOption: 'template_only' | 'today_override' | 'weekdays',
  ) => {
    const newId = `shift-${Date.now().toString(36)}`;
    const created: ShiftTemplate = { id: newId, ...shift };
    const todayKey = formatDateKey(new Date());

    setState((prev) => {
      const nextTemplates = [...prev.shiftTemplates, created];
      let nextRules = prev.weeklyRules;
      let nextOverrides = prev.dateOverrides;

      if (applyOption === 'weekdays') {
        nextRules = prev.weeklyRules.map((rule) =>
          rule.dayOfWeek >= 1 && rule.dayOfWeek <= 5
            ? { ...rule, aktif: true, shiftId: newId }
            : rule,
        );
      } else if (applyOption === 'today_override') {
        nextOverrides = [
          ...prev.dateOverrides.filter((o) => o.dateKey !== todayKey),
          {
            dateKey: todayKey,
            tipe: 'shift',
            shiftId: newId,
            label: created.nama,
          },
        ];
      }

      return {
        ...prev,
        shiftTemplates: nextTemplates,
        weeklyRules: nextRules,
        dateOverrides: nextOverrides,
      };
    });
  };

  const handleUpdateShift = (updated: ShiftTemplate) => {
    setState((prev) => ({
      ...prev,
      shiftTemplates: prev.shiftTemplates.map((tpl) =>
        tpl.id === updated.id ? updated : tpl,
      ),
    }));
  };

  const handleDeleteShift = (shiftId: string) => {
    setState((prev) => {
      if (prev.shiftTemplates.length <= 1) {
        return prev;
      }
      const remaining = prev.shiftTemplates.filter((s) => s.id !== shiftId);
      const fallbackId = remaining[0]?.id ?? null;

      return {
        ...prev,
        shiftTemplates: remaining,
        weeklyRules: prev.weeklyRules.map((rule) =>
          rule.shiftId === shiftId ? { ...rule, shiftId: fallbackId } : rule,
        ),
        dateOverrides: prev.dateOverrides.filter(
          (ovr) => ovr.shiftId !== shiftId,
        ),
      };
    });
  };

  const handleUpdateWeeklyRule = (
    dayOfWeek: DayOfWeek,
    aktif: boolean,
    shiftId: string | null,
  ) => {
    setState((prev) => ({
      ...prev,
      weeklyRules: prev.weeklyRules.map((rule) =>
        rule.dayOfWeek === dayOfWeek ? { ...rule, aktif, shiftId } : rule,
      ),
    }));
  };

  const handleApplyWeeklyWorkdaysPreset = (
    workDays: DayOfWeek[],
    shiftId: string,
  ) => {
    const activeSet = new Set(workDays);
    setState((prev) => ({
      ...prev,
      weeklyRules: prev.weeklyRules.map((rule) => {
        const active = activeSet.has(rule.dayOfWeek);
        return {
          ...rule,
          aktif: active,
          shiftId: active ? rule.shiftId || shiftId : null,
        };
      }),
    }));
  };

  const handleRestoreStandardShifts = () => {
    setState((prev) => {
      const existingIds = new Set(prev.shiftTemplates.map((s) => s.id));
      const missing = STANDARD_SHIFT_TEMPLATES.filter(
        (std) => !existingIds.has(std.id),
      );
      if (missing.length === 0) {
        return prev;
      }
      return {
        ...prev,
        shiftTemplates: [...prev.shiftTemplates, ...missing].slice(0, 30),
      };
    });
  };

  const handleUpsertDateOverride = (override: DateOverride) => {
    setState((prev) => ({
      ...prev,
      dateOverrides: [
        ...prev.dateOverrides.filter((o) => o.dateKey !== override.dateKey),
        override,
      ],
    }));
  };

  const handleRemoveDateOverride = (dateKey: string) => {
    setState((prev) => ({
      ...prev,
      dateOverrides: prev.dateOverrides.filter((o) => o.dateKey !== dateKey),
    }));
  };

  const handleApplyMonthOverrides = (
    year: number,
    monthIndex: number,
    overrides: DateOverride[],
  ) => {
    const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`;
    setState((prev) => ({
      ...prev,
      dateOverrides: [
        ...prev.dateOverrides.filter((o) => !o.dateKey.startsWith(prefix)),
        ...overrides,
      ],
    }));
  };

  const handleClearMonthOverrides = (year: number, monthIndex: number) => {
    const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`;
    setState((prev) => ({
      ...prev,
      dateOverrides: prev.dateOverrides.filter(
        (o) => !o.dateKey.startsWith(prefix),
      ),
    }));
  };

  const handleQuickDateMode = (
    dateKey: string,
    mode: 'rutin' | 'libur' | string,
  ) => {
    if (mode === 'rutin') {
      handleRemoveDateOverride(dateKey);
      return;
    }
    if (mode === 'libur') {
      handleUpsertDateOverride({
        dateKey,
        tipe: 'libur',
        kategoriStatus: 'libur',
      });
      return;
    }
    if (mode.startsWith('nonwork:')) {
      const cat = mode.slice('nonwork:'.length) as NonWorkCategory;
      handleUpsertDateOverride({
        dateKey,
        tipe: 'libur',
        kategoriStatus: cat,
      });
      return;
    }
    handleUpsertDateOverride({
      dateKey,
      tipe: 'shift',
      shiftId: mode,
    });
  };

  const handleUpdateConfig = (nextConfig: CommuteAndReminderConfig) => {
    setState((prev) => ({
      ...prev,
      config: nextConfig,
    }));
  };

  const handlePreviewTone = (tone: AlarmToneId, volume: number) => {
    alarmAudio.unlockAudio();
    alarmAudio.preview(tone, volume);
  };

  const handleImportState = (imported: TepatKerjaState) => {
    if (!validateImportedState(imported)) {
      throw new Error('Invalid state payload');
    }
    setState(imported);
    setRuntime(createDefaultRuntime());
  };

  const handleResetDefault = () => {
    alarmAudio.stop();
    alarmAudio.stopAmbient();
    setActiveAlert(null);
    setState(createDefaultState());
    setExtras(createDefaultExtras());
    setRuntime(createDefaultRuntime());
    setTestFeedback(null);
  };

  const accountDisplayName =
    profile?.displayName || user?.displayName || null;

  const nextShiftIntroSummary = nextOccurrence
    ? `Jadwal berikutnya: ${nextOccurrence.shiftName} · Berangkat pukul ${nextOccurrence.jamBerangkatStr} (${nextOccurrence.dateLabel}).`
    : 'Menyiapkan ruang kerja 3D, kalender shift, dan pengingat keberangkatan Anda.';

  const activeShiftNoteTarget = currentWorkingShift ?? nextOccurrence;
  const activeZenShiftNote = activeShiftNoteTarget
    ? extras.shiftNotes[activeShiftNoteTarget.dateKey] ?? ''
    : '';

  return (
    <MotionConfig reducedMotion="user">
    <div className="relative min-h-screen flex flex-col bg-[var(--tk-bg)] text-[var(--tk-text)] transition-colors duration-150 overflow-x-clip">
      {gmpQuotaExceeded && (
        <div
          role="alert"
          data-testid="gmp-quota-banner"
          className="bg-[var(--tk-warning-soft)] border-b border-[var(--tk-warning-border)] text-[var(--tk-warning-text)] px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm"
        >
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold hover:opacity-80"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <ThemeBackdrop theme={theme} now={now} />

      <IntroSplash
        visible={showIntro}
        theme={theme}
        userName={accountDisplayName}
        nextShiftSummary={nextShiftIntroSummary}
        onComplete={() => setShowIntro(false)}
      />

      {isZenMode ? (
        <ZenFocusOverlay
          now={now}
          currentWorkingShift={currentWorkingShift}
          nextOccurrence={nextOccurrence}
          inlineNotice={inlineNotice}
          activeShiftNote={activeZenShiftNote}
          focusMode={focusMode}
          focusRunning={focusRunning}
          focusSecondsLeft={focusSecondsLeft}
          focusWorkMinutes={extras.focusWorkMinutes}
          ambientPreset={extras.ambientPreset}
          commuteSummary={commuteSummary}
          liveCommute={liveCommute}
          onToggleFocusRunning={handleToggleFocusRunning}
          onResetFocusTimer={handleResetFocusTimer}
          onSelectFocusPreset={handleSelectFocusPreset}
          onChangeAmbientPreset={handleChangeAmbientPreset}
          gpsChecking={gpsChecking}
          onMarkDeparted={(occKey) => void handleMarkDeparted(occKey)}
          onDismissInlineNotice={(alertKey) =>
            setRuntime((prev) => ({
              ...prev,
              triggeredKeys: prev.triggeredKeys.includes(alertKey)
                ? prev.triggeredKeys
                : [...prev.triggeredKeys, alertKey],
            }))
          }
          onExitZenMode={() => setIsZenMode(false)}
        />
      ) : (
        <>
          <div className="relative z-10 flex-1 flex flex-col md:flex-row">
            <SidebarNav
              activeTab={activeTab}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
              onSelectTab={setActiveTab}
              onOpenQuickShift={() => setIsQuickShiftOpen(true)}
              onOpenAccount={() => setIsAccountOpen(true)}
              accountDisplayName={accountDisplayName}
              isSignedIn={Boolean(user)}
              syncStatus={syncStatus}
              nextOccurrence={nextOccurrence}
            />

            <div className="flex-1 min-w-0 flex flex-col">
              <TopBar
                activeTab={activeTab}
                onSelectTab={setActiveTab}
                onOpenQuickShift={() => setIsQuickShiftOpen(true)}
                onOpenAccount={() => setIsAccountOpen(true)}
                accountDisplayName={accountDisplayName}
                isSignedIn={Boolean(user)}
                syncStatus={syncStatus}
              />

              <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-24 md:py-7">
                <OfflineIndicator />
                <PWAInstallBanner />
                <ThemeQuickBar
                  theme={theme}
                  scheduleMode={extras.themeScheduleMode}
                  nightStartHour={extras.nightStartHour}
                  nightEndHour={extras.nightEndHour}
                  isNightNow={isNightNow}
                  onSelectAutoMode={handleSelectAutoThemeMode}
                  onSelectSystemMode={handleSelectSystemThemeMode}
                  onChangeColorMode={handleChangeColorMode}
                  onChangePreset={handleChangePreset}
                />

              {activeTab === 'dashboard' && (
                <DashboardView
                  now={now}
                  currentWorkingShift={currentWorkingShift}
                  nextOccurrence={nextOccurrence}
                  inlineNotice={inlineNotice}
                  upcomingWeek={upcomingWeek}
                  departureLogs={state.departureLogs ?? []}
                  shiftTemplates={state.shiftTemplates}
                  config={commuteSummary.effectiveConfig}
                  theme={theme}
                  extras={extras}
                  alarmActive={Boolean(activeAlert)}
                  notificationPermission={notificationPermission}
                  testFeedback={testFeedback}
                  focusMode={focusMode}
                  focusRunning={focusRunning}
                  focusSecondsLeft={focusSecondsLeft}
                  liveCommute={liveCommute}
                  liveCommuteLoading={liveCommuteLoading}
                  commuteSummary={commuteSummary}
                  gpsChecking={gpsChecking}
                  onOpenAccount={() => setIsAccountOpen(true)}
                  onRefreshLiveCommute={() => void refreshLiveCommute(undefined, true)}
                  onToggleFocusRunning={handleToggleFocusRunning}
                  onResetFocusTimer={handleResetFocusTimer}
                  onSelectFocusPreset={handleSelectFocusPreset}
                  onEnterZenMode={() => setIsZenMode(true)}
                  onRequestNotification={handleRequestNotification}
                  onTestAlarm={triggerAlarmSimulation}
                  onDismissInlineNotice={(alertKey) =>
                    setRuntime((prev) => ({
                      ...prev,
                      triggeredKeys: prev.triggeredKeys.includes(alertKey)
                        ? prev.triggeredKeys
                        : [...prev.triggeredKeys, alertKey],
                    }))
                  }
                  onMarkDeparted={(occKey) => void handleMarkDeparted(occKey)}
                  onSetDateOverride={handleQuickDateMode}
                  onSelectQuickBuffer={handleSelectQuickBuffer}
                  onUpdateShiftNote={handleUpdateShiftNote}
                  onToggleChecklistItem={handleToggleChecklistItem}
                  onAddChecklistItem={handleAddChecklistItem}
                  onRemoveChecklistItem={handleRemoveChecklistItem}
                  onChangeAmbientPreset={handleChangeAmbientPreset}
                  onExportScheduleIcs={() =>
                    downloadUpcomingIcs(effectiveState, 30, extras.shiftNotes)
                  }
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'studio3d' && (
                <div key="tab-studio3d" className="tk-animate-fade">
                  <Studio3DView
                    theme={theme}
                    now={now}
                    nextOccurrence={nextOccurrence}
                    checklistPercent={checklistStats.percent}
                    alarmActive={Boolean(activeAlert)}
                    streakCount={streakStats.currentStreak}
                    onChangeColorMode={handleChangeColorMode}
                    onChangePreset={handleChangePreset}
                  />
                </div>
              )}

              {activeTab === 'schedule' && (
                <div key="tab-schedule" className="tk-animate-fade">
                  <ScheduleView
                    state={effectiveState}
                    shiftNotes={extras.shiftNotes}
                    shiftTemplates={state.shiftTemplates}
                    weeklyRules={state.weeklyRules}
                    dateOverrides={state.dateOverrides}
                    onAddShift={handleAddShift}
                    onUpdateShift={handleUpdateShift}
                    onDeleteShift={handleDeleteShift}
                    onUpdateWeeklyRule={handleUpdateWeeklyRule}
                    onApplyWeeklyWorkdaysPreset={handleApplyWeeklyWorkdaysPreset}
                    onRestoreStandardShifts={handleRestoreStandardShifts}
                    onUpdateShiftNote={handleUpdateShiftNote}
                    onUpsertDateOverride={handleUpsertDateOverride}
                    onRemoveDateOverride={handleRemoveDateOverride}
                    onApplyMonthOverrides={handleApplyMonthOverrides}
                    onClearMonthOverrides={handleClearMonthOverrides}
                  />
                </div>
              )}

              {activeTab === 'commute' && (
                <div key="tab-commute" className="tk-animate-fade">
                  <CommuteAlarmView
                    state={state}
                    shiftNotes={extras.shiftNotes}
                    theme={theme}
                    scheduleMode={extras.themeScheduleMode}
                    nightStartHour={extras.nightStartHour}
                    nightEndHour={extras.nightEndHour}
                    isNightNow={isNightNow}
                    isSignedIn={Boolean(user)}
                    accountLabel={accountDisplayName}
                    commuteSummary={commuteSummary}
                    liveCommute={liveCommute}
                    onOpenAccount={() => setIsAccountOpen(true)}
                    onReplayIntro={() => setShowIntro(true)}
                    onSelectAutoThemeMode={handleSelectAutoThemeMode}
                    onSelectSystemMode={handleSelectSystemThemeMode}
                    onChangeColorMode={handleChangeColorMode}
                    onChangePreset={handleChangePreset}
                    onChangeNightWindow={handleChangeNightWindow}
                    onUpdateConfig={handleUpdateConfig}
                    onPreviewTone={handlePreviewTone}
                    onSimulateAlarm={triggerAlarmSimulation}
                    onImportState={handleImportState}
                    onResetDefault={handleResetDefault}
                  />
                </div>
              )}
              </main>

              <footer className="border-t border-[var(--tk-border)] bg-[var(--tk-surface)] pb-16 md:pb-0">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--tk-text-subtle)]">
                  <span>TepatKerja · Kronometer 3D, Jadwal Shift &amp; Pengingat Berangkat</span>
                  <span>
                    {user
                      ? `Tersinkronisasi pribadi untuk ${accountDisplayName || user.email}`
                      : 'Tersimpan lokal di browser · Masuk akun untuk sinkronisasi cloud'}
                  </span>
                </div>
              </footer>
            </div>
          </div>

          <QuickShiftModal
            isOpen={isQuickShiftOpen}
            onClose={() => setIsQuickShiftOpen(false)}
            onSaveShift={handleQuickShiftSave}
          />

          <AccountModal
            isOpen={isAccountOpen}
            onClose={() => setIsAccountOpen(false)}
            user={user}
            profile={profile}
            syncStatus={syncStatus}
            syncMessage={syncMessage}
            authBusy={authBusy}
            commuteProfile={commuteProfile}
            liveCommute={liveCommute}
            liveCommuteLoading={liveCommuteLoading}
            liveCommuteError={liveCommuteError}
            commuteSummary={commuteSummary}
            onSaveCommuteProfile={handleSaveCommuteProfile}
            onSignInGoogle={() => void handleSignInGoogle()}
            onSignOut={() => void handleSignOut()}
            onSaveProfile={handleSaveProfile}
            onForceSync={handleForceSync}
            onReplayIntro={() => setShowIntro(true)}
          />
        </>
      )}

      <ActiveAlertModal
        alert={activeAlert}
        snoozeMenit={state.config.snoozeMenit}
        gpsChecking={gpsChecking}
        onSnooze={handleSnoozeAlert}
        onMarkDeparted={() => {
          if (activeAlert) {
            void handleMarkDeparted(activeAlert.occurrenceKey);
          }
        }}
        onDismiss={handleDismissAlert}
      />

      <GpsDepartureModal
        pending={pendingGpsDeparture}
        onConfirm={() => {
          if (!pendingGpsDeparture) {
            return;
          }
          commitMarkDeparted(
            pendingGpsDeparture.occurrenceKey,
            pendingGpsDeparture.validation,
          );
          setPendingGpsDeparture(null);
        }}
        onCancel={() => {
          setPendingGpsDeparture(null);
          setTestFeedback(
            'Pencatatan keberangkatan dibatalkan — pastikan Anda berada di titik keberangkatan yang benar.',
          );
        }}
      />
    </div>
    </MotionConfig>
  );
}
