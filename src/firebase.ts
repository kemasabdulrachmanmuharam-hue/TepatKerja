import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type {
  GeoPoint,
  TepatKerjaState,
  UserProfileData,
  WorkspaceExtras,
} from './types/schedule';
import {
  clampNightEndHour,
  clampNightStartHour,
  type ThemeSettings,
} from './utils/theme';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function signOutAccount(): Promise<void> {
  await signOut(auth);
}

function sanitizeText(value: string | undefined, maxLen: number, fallback = ''): string {
  return (value ?? '').trim().slice(0, maxLen) || fallback;
}

export async function upsertUserAccount(
  user: User,
  overrides?: Partial<Pick<UserProfileData, 'displayName' | 'roleTitle' | 'workplaceName'>>,
): Promise<UserProfileData> {
  const userPath = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const displayName = sanitizeText(
    overrides?.displayName ?? user.displayName ?? 'Pengguna TepatKerja',
    80,
    'Pengguna TepatKerja',
  );
  const roleTitle = sanitizeText(overrides?.roleTitle, 60, '');
  const workplaceName = sanitizeText(overrides?.workplaceName, 80, '');

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerUid: user.uid,
        displayName,
        roleTitle,
        workplaceName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (overrides) {
      await updateDoc(ref, {
        displayName,
        roleTitle,
        workplaceName,
        updatedAt: serverTimestamp(),
      });
    }
    return {
      ownerUid: user.uid,
      displayName,
      roleTitle,
      workplaceName,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export interface CloudWorkspacePayload {
  state: TepatKerjaState;
  theme: ThemeSettings;
  extras: WorkspaceExtras;
}

function sanitizeGeoPointForCloud(pt: GeoPoint | null | undefined): GeoPoint | null {
  if (!pt || typeof pt !== 'object') {
    return null;
  }
  const lat = Number(pt.lat);
  const lng = Number(pt.lng);
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
  return {
    lat: Math.round(lat * 100000) / 100000,
    lng: Math.round(lng * 100000) / 100000,
  };
}

function sanitizeWorkspacePayload(
  uid: string,
  payload: CloudWorkspacePayload,
) {
  const cleanNotes: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload.extras.shiftNotes ?? {}).slice(0, 60)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === 'string' && v.trim()) {
      cleanNotes[k] = v.trim().slice(0, 200);
    }
  }

  const cleanTemplates = payload.state.shiftTemplates.slice(0, 30).map((tpl) => ({
    id: String(tpl.id).slice(0, 64),
    nama: String(tpl.nama).trim().slice(0, 40) || 'Shift',
    jamMasuk: String(tpl.jamMasuk).slice(0, 10),
    durasiKerjaMenit: Math.max(60, Math.min(960, Math.round(Number(tpl.durasiKerjaMenit) || 480))),
    catatan: String(tpl.catatan ?? '').trim().slice(0, 160),
  }));

  const cleanOverrides = payload.state.dateOverrides.slice(0, 120).map((ovr) => {
    const clean: Record<string, unknown> = {
      dateKey: String(ovr.dateKey).slice(0, 16),
      tipe: ovr.tipe === 'libur' ? 'libur' : 'shift',
    };
    if (ovr.kategoriStatus) {
      clean.kategoriStatus = ovr.kategoriStatus;
    }
    if (ovr.shiftId) {
      clean.shiftId = String(ovr.shiftId).slice(0, 64);
    }
    if (ovr.jamMasukKustom) {
      clean.jamMasukKustom = String(ovr.jamMasukKustom).slice(0, 10);
    }
    if (
      typeof ovr.durasiKustomMenit === 'number' &&
      Number.isFinite(ovr.durasiKustomMenit)
    ) {
      clean.durasiKustomMenit = Math.max(
        60,
        Math.min(960, Math.round(ovr.durasiKustomMenit)),
      );
    }
    if (ovr.label && ovr.label.trim()) {
      clean.label = ovr.label.trim().slice(0, 80);
    }
    return clean;
  });

  return {
    ownerUid: uid,
    version: Math.max(1, Math.min(100, payload.state.version || 1)),
    shiftTemplates: cleanTemplates,
    weeklyRules: payload.state.weeklyRules.slice(0, 7),
    dateOverrides: cleanOverrides,
    departureLogs: (payload.state.departureLogs ?? []).slice(-180),
    config: {
      durasiPersiapanMenit: Math.max(0, Math.min(240, payload.state.config.durasiPersiapanMenit)),
      durasiPerjalananMenit: Math.max(0, Math.min(240, payload.state.config.durasiPerjalananMenit)),
      bufferKeterlambatanMenit: Math.max(0, Math.min(120, payload.state.config.bufferKeterlambatanMenit)),
      tahapanAktif: { ...payload.state.config.tahapanAktif },
      nadaAlarm: payload.state.config.nadaAlarm,
      volume: Math.max(0, Math.min(1, payload.state.config.volume)),
      snoozeMenit: payload.state.config.snoozeMenit,
    },
    theme: {
      colorMode: payload.theme.colorMode,
      presetId: payload.theme.presetId,
    },
    extras: {
      checklistLabels: payload.extras.checklistLabels.slice(0, 15),
      checklistDoneKeys: payload.extras.checklistDoneKeys
        .slice(-40)
        .map((s) => s.slice(0, 120)),
      shiftNotes: cleanNotes,
      quickBufferPreset: payload.extras.quickBufferPreset,
      focusWorkMinutes: Math.max(5, Math.min(120, payload.extras.focusWorkMinutes)),
      focusBreakMinutes: Math.max(1, Math.min(60, payload.extras.focusBreakMinutes)),
      ambientPreset: payload.extras.ambientPreset,
      autoAdjustEnabled: Boolean(payload.extras.autoAdjustEnabled),
      originAddress: (payload.extras.originAddress ?? '').trim().slice(0, 160),
      destinationAddress: (payload.extras.destinationAddress ?? '').trim().slice(0, 160),
      travelMode: payload.extras.travelMode || 'DRIVE',
      gpsValidationEnabled: Boolean(payload.extras.gpsValidationEnabled),
      gpsRadiusMeters: Math.max(
        100,
        Math.min(5000, Math.round(Number(payload.extras.gpsRadiusMeters) || 500)),
      ),
      originCoords: sanitizeGeoPointForCloud(payload.extras.originCoords),
      workplaceCoords: sanitizeGeoPointForCloud(payload.extras.workplaceCoords),
      themeScheduleMode:
        payload.extras.themeScheduleMode === 'manual'
          ? 'manual'
          : payload.extras.themeScheduleMode === 'system'
            ? 'system'
            : 'auto',
      nightStartHour: clampNightStartHour(payload.extras.nightStartHour),
      nightEndHour: clampNightEndHour(payload.extras.nightEndHour),
    },
  };
}

export async function saveWorkspaceToCloud(
  user: User,
  payload: CloudWorkspacePayload,
): Promise<void> {
  const workspacePath = `users/${user.uid}/workspace/main`;
  await upsertUserAccount(user);
  const ref = doc(db, 'users', user.uid, 'workspace', 'main');
  const sanitized = sanitizeWorkspacePayload(user.uid, payload);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        version: sanitized.version,
        shiftTemplates: sanitized.shiftTemplates,
        weeklyRules: sanitized.weeklyRules,
        dateOverrides: sanitized.dateOverrides,
        departureLogs: sanitized.departureLogs,
        config: sanitized.config,
        theme: sanitized.theme,
        extras: sanitized.extras,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, workspacePath);
  }
}

export function subscribeToAccountAndWorkspace(
  uid: string,
  callbacks: {
    onAccount: (profile: UserProfileData | null) => void;
    onWorkspace: (payload: Partial<CloudWorkspacePayload> | null) => void;
    onError: (err: Error) => void;
  },
): Unsubscribe {
  const userPath = `users/${uid}`;
  const workspacePath = `users/${uid}/workspace/main`;

  const unsubUser = onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        callbacks.onAccount(null);
        return;
      }
      const data = snapshot.data();
      callbacks.onAccount({
        ownerUid: String(data.ownerUid ?? uid),
        displayName: String(data.displayName ?? 'Pengguna TepatKerja'),
        roleTitle: String(data.roleTitle ?? ''),
        workplaceName: String(data.workplaceName ?? ''),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, userPath);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    },
  );

  const unsubWorkspace = onSnapshot(
    doc(db, 'users', uid, 'workspace', 'main'),
    (snapshot) => {
      if (!snapshot.exists()) {
        callbacks.onWorkspace(null);
        return;
      }
      const data = snapshot.data();
      callbacks.onWorkspace({
        state: {
          version: Number(data.version ?? 1),
          shiftTemplates: Array.isArray(data.shiftTemplates) ? data.shiftTemplates : [],
          weeklyRules: Array.isArray(data.weeklyRules) ? data.weeklyRules : [],
          dateOverrides: Array.isArray(data.dateOverrides) ? data.dateOverrides : [],
          departureLogs: Array.isArray(data.departureLogs) ? data.departureLogs : [],
          config: data.config,
        },
        theme: data.theme,
        extras: data.extras,
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, workspacePath);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    },
  );

  return () => {
    unsubUser();
    unsubWorkspace();
  };
}
