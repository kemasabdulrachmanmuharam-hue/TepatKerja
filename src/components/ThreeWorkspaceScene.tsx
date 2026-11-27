import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ChevronDown,
  ChevronUp,
  Layers,
  Maximize2,
  MousePointerClick,
  RotateCcw,
} from 'lucide-react';
import type { CameraPresetId } from '../types/schedule';
import type { ThemeSettings } from '../utils/theme';
import {
  get3DThemeScenePalette,
  getTimeOfDayMood,
  type TimeOfDayMoodId,
} from '../utils/workspaceFeatures';
import {
  buildProceduralChronometerScene,
  type ChronometerPartHandles,
} from '../three/proceduralChronometer';

interface ThreeWorkspaceSceneProps {
  theme: ThemeSettings;
  now: Date;
  urgencyTone: 'neutral' | 'green' | 'amber' | 'red';
  checklistPercent: number;
  alarmActive: boolean;
  shiftTitle: string;
  departTimeStr: string | null;
  heightClassName?: string;
  compactMode?: boolean;
  onOpenFullStudio?: () => void;
}

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  utama: { label: 'Utama', pos: [0.45, 2.55, 6.05], target: [0, 1.56, 0] },
  fokus_jam: { label: 'Dada & Kepala', pos: [0.0, 1.58, 3.35], target: [0, 1.52, 0.1] },
  atas: { label: 'Sudut Atas', pos: [0.25, 5.1, 3.65], target: [0, 1.15, 0] },
  meja_santai: { label: 'Sudut Hangar', pos: [-3.35, 2.3, 4.45], target: [0.0, 1.45, 0.0] },
};

export function ThreeWorkspaceScene({
  theme,
  now,
  urgencyTone,
  checklistPercent,
  alarmActive,
  shiftTitle,
  departTimeStr,
  heightClassName = 'h-[300px] sm:h-[340px]',
  compactMode = false,
  onOpenFullStudio,
}: ThreeWorkspaceSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('utama');
  const [exploded, setExploded] = useState(false);
  const [dockOpen, setDockOpen] = useState(!compactMode);
  const [selectedPart, setSelectedPart] = useState<{
    title: string;
    detail: string;
  } | null>(null);
  const [timeMoodOverride, setTimeMoodOverride] = useState<TimeOfDayMoodId | null>(
    null,
  );

  const activeTimeMood = timeMoodOverride ?? getTimeOfDayMood(now).id;

  const livePropsRef = useRef({
    theme,
    now,
    urgencyTone,
    checklistPercent,
    alarmActive,
    cameraPreset,
    exploded,
    activeTimeMood,
  });

  livePropsRef.current = {
    theme,
    now,
    urgencyTone,
    checklistPercent,
    alarmActive,
    cameraPreset,
    exploded,
    activeTimeMood,
  };

  const requestRenderRef = useRef<(() => void) | null>(null);
  const applyTargetCameraRef = useRef<((preset: CameraPresetId) => void) | null>(
    null,
  );

  useEffect(() => {
    const container = mountRef.current;
    if (!container) {
      return;
    }

    const width = Math.max(240, container.clientWidth);
    const height = Math.max(200, container.clientHeight);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });

    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    const isSoftwareGl =
      /SwiftShader|llvmpipe|Software|ANGLE.*Direct3D11.*Warp/i.test(rendererStr);

    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const initialPalette = get3DThemeScenePalette(
      livePropsRef.current.theme,
      livePropsRef.current.activeTimeMood,
      livePropsRef.current.urgencyTone,
    );
    scene.background = new THREE.Color(initialPalette.backgroundHex);
    scene.fog = new THREE.FogExp2(initialPalette.fogHex, 0.065);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.72;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
    const initialCam = CAMERA_PRESETS[livePropsRef.current.cameraPreset];
    camera.position.set(...initialCam.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 2.4;
    controls.maxDistance = 9.5;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.target.set(...initialCam.target);
    controls.update();

    // Warm directional key light + cool hemisphere fill
    const hemiLight = new THREE.HemisphereLight(
      new THREE.Color(initialPalette.hemiSkyHex),
      new THREE.Color(initialPalette.hemiGroundHex),
      0.85,
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(
      new THREE.Color(initialPalette.keyLightHex),
      1.85,
    );
    keyLight.position.set(4.5, 6.5, 4.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 20;
      keyLight.shadow.camera.left = -4.5;
      keyLight.shadow.camera.right = 4.5;
      keyLight.shadow.camera.top = 4.5;
      keyLight.shadow.camera.bottom = -4.5;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const handles: ChronometerPartHandles = buildProceduralChronometerScene(
      initialPalette,
      livePropsRef.current.theme.colorMode === 'dark',
    );
    const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    handles.dialTextures.light.anisotropy = maxAniso;
    handles.dialTextures.dark.anisotropy = maxAniso;
    scene.add(handles.root);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const desiredCamPos = new THREE.Vector3(...initialCam.pos);
    const desiredTarget = new THREE.Vector3(...initialCam.target);
    let camTransitioning = false;
    let userDragging = false;

    const onControlStart = () => {
      userDragging = true;
      camTransitioning = false;
    };
    const onControlEnd = () => {
      userDragging = false;
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('end', onControlEnd);

    applyTargetCameraRef.current = (preset: CameraPresetId) => {
      const cfg = CAMERA_PRESETS[preset];
      desiredCamPos.set(...cfg.pos);
      desiredTarget.set(...cfg.target);
      camTransitioning = true;
      requestRenderRef.current?.();
    };

    // Raycasting on pointer click (only against 5 small interactables)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 6) {
        return; // Ignore orbit drag releases
      }
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(handles.interactables, false);
      if (hits.length > 0 && hits[0].object.userData.partInfo) {
        setSelectedPart(
          hits[0].object.userData.partInfo as { title: string; detail: string },
        );
      } else {
        setSelectedPart(null);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const commuteCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.35, 0.34, 0.65),
      new THREE.Vector3(-0.65, 0.42, 1.15),
      new THREE.Vector3(0.65, 0.42, 1.15),
      new THREE.Vector3(1.35, 0.34, 0.65),
    ]);
    const scratchVec = new THREE.Vector3();

    let explodeBlend = 0;
    let disposed = false;
    let rafId = 0;
    let softTimerId: number | null = null;
    let needsRender = true;
    let lastTime = performance.now();

    const syncSceneToLiveState = (nowMs: number, dt: number) => {
      const state = livePropsRef.current;
      const palette = get3DThemeScenePalette(
        state.theme,
        state.activeTimeMood,
        state.urgencyTone,
      );

      (scene.background as THREE.Color).set(palette.backgroundHex);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.set(palette.fogHex);
      }

      handles.materials.desk.color.set(palette.deskHex);
      handles.materials.plinth.color.set(palette.plinthHex);
      handles.materials.bezel.color.set(palette.bezelHex);
      const targetDialTex =
        state.theme.colorMode === 'dark'
          ? handles.dialTextures.dark
          : handles.dialTextures.light;
      if (handles.materials.dial.map !== targetDialTex) {
        handles.materials.dial.map = targetDialTex;
        handles.materials.dial.needsUpdate = true;
      }
      handles.materials.hand.color.set(palette.handHex);
      handles.materials.accent.color.set(palette.accentHex);
      handles.materials.accent.emissive.set(palette.accentHex);
      handles.materials.beacon.color.set(palette.beaconHex);
      handles.materials.beacon.emissive.set(palette.beaconHex);
      handles.materials.lampShade.color.set(palette.lampShadeHex);
      handles.materials.mug.color.set(palette.mugHex);
      handles.materials.armorWhite.color.set(palette.armorWhiteHex);
      handles.materials.armorBlue.color.set(palette.armorBlueHex);
      handles.materials.armorRed.color.set(palette.armorRedHex);
      handles.materials.armorGold.color.set(palette.armorGoldHex);
      handles.materials.armorGold.emissive.set(palette.armorGoldHex);
      handles.materials.visor.color.set(palette.visorHex);
      handles.materials.visor.emissive.set(palette.visorHex);

      keyLight.color.set(palette.keyLightHex);
      hemiLight.color.set(palette.hemiSkyHex);
      hemiLight.groundColor.set(palette.hemiGroundHex);

      // Live real-time chest chronometer hands
      const d = state.now;
      const sec = d.getSeconds() + (isSoftwareGl ? 0 : d.getMilliseconds() / 1000);
      const min = d.getMinutes() + sec / 60;
      const hr = (d.getHours() % 12) + min / 60;
      handles.hourHandPivot.rotation.z = -(hr / 12) * Math.PI * 2;
      handles.minuteHandPivot.rotation.z = -(min / 60) * Math.PI * 2;
      handles.secondHandPivot.rotation.z = -(sec / 60) * Math.PI * 2;

      // Optical sensor & main camera pulse driven by readiness & alarm urgency
      const pulse =
        state.alarmActive || state.urgencyTone === 'red'
          ? 0.95 + Math.sin(nowMs * 0.008) * 0.65
          : 0.7 + (state.checklistPercent / 100) * 0.65;
      handles.materials.beacon.emissiveIntensity = pulse;
      handles.materials.visor.emissiveIntensity =
        state.alarmActive || state.urgencyTone === 'red' ? pulse * 1.15 : 1.05;

      // Subtle autonomous mecha head scan
      handles.headGroup.rotation.y = Math.sin(nowMs * 0.00075) * 0.08;

      // Commute progress runner node along arc
      const progressT = Math.max(
        0.08,
        Math.min(0.95, 0.15 + (state.checklistPercent / 100) * 0.8),
      );
      commuteCurve.getPoint(progressT, scratchVec);
      handles.commuteRunner.position.copy(scratchVec);

      // Floating 3D orbital targeting halo motion
      handles.orbitalGroup.rotation.y = (nowMs * 0.00028) % (Math.PI * 2);
      handles.orbitalGroup.position.y = 1.46 + Math.sin(nowMs * 0.0014) * 0.035;

      // Exploded Gundam Armor dissection damping
      const targetExplode = state.exploded ? 1 : 0;
      const blendFactor = 1 - Math.exp(-8 * Math.max(0.001, dt));
      explodeBlend += (targetExplode - explodeBlend) * blendFactor;

      handles.vFinGroup.position.y = 0.19 + explodeBlend * 0.36;
      handles.faceplateGroup.position.z = 0.31 + explodeBlend * 0.34;
      handles.leftShoulder.position.x = -1.04 - explodeBlend * 0.44;
      handles.rightShoulder.position.x = 1.04 + explodeBlend * 0.44;
      handles.backpackGroup.position.z = -0.48 - explodeBlend * 0.4;

      handles.bezelRing.position.z = 0.385 + explodeBlend * 0.42;
      handles.dialMesh.position.z = 0.388 + explodeBlend * 0.22;
      handles.hourHandPivot.position.z = 0.405 + explodeBlend * 0.34;
      handles.minuteHandPivot.position.z = 0.415 + explodeBlend * 0.42;
      handles.secondHandPivot.position.z = 0.425 + explodeBlend * 0.5;
      handles.crystalLens.position.z = 0.44 + explodeBlend * 0.62;
      handles.beaconOrb.position.z = 0.27 + explodeBlend * 0.32;

      // Damped camera preset transition
      if (camTransitioning && !userDragging) {
        const camAlpha = 1 - Math.exp(-6 * Math.max(0.001, dt));
        camera.position.lerp(desiredCamPos, camAlpha);
        controls.target.lerp(desiredTarget, camAlpha);
        if (
          camera.position.distanceTo(desiredCamPos) < 0.015 &&
          controls.target.distanceTo(desiredTarget) < 0.015
        ) {
          camera.position.copy(desiredCamPos);
          controls.target.copy(desiredTarget);
          camTransitioning = false;
        }
      }

      controls.update();
    };

    const drawFrame = () => {
      if (disposed || document.hidden) {
        return;
      }
      const nowMs = performance.now();
      const dt = Math.min(0.05, (nowMs - lastTime) / 1000);
      lastTime = nowMs;

      syncSceneToLiveState(nowMs, dt);
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        // Software-WebGL path: only schedule next tick after draw finishes at gentle cadence
        softTimerId = window.setTimeout(() => {
          if (!disposed) {
            drawFrame();
          }
        }, 250);
      } else {
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    const requestRender = () => {
      needsRender = true;
      if (isSoftwareGl && softTimerId === null && !disposed) {
        softTimerId = window.setTimeout(() => {
          softTimerId = null;
          if (!disposed && needsRender) {
            needsRender = false;
            drawFrame();
          }
        }, 16);
      }
    };
    requestRenderRef.current = requestRender;

    const onControlChange = () => {
      if (isSoftwareGl) {
        needsRender = true;
      }
    };
    controls.addEventListener('change', onControlChange);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || disposed) {
        return;
      }
      const w = Math.max(240, Math.floor(entry.contentRect.width));
      const h = Math.max(200, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (isSoftwareGl) {
        renderer.render(scene, camera);
      }
    });
    resizeObserver.observe(container);

    const onVisibilityChange = () => {
      if (!document.hidden && !disposed) {
        lastTime = performance.now();
        if (isSoftwareGl) {
          renderer.render(scene, camera);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Initial render
    drawFrame();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      if (softTimerId !== null) {
        window.clearTimeout(softTimerId);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('end', onControlEnd);
      controls.removeEventListener('change', onControlChange);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);

      handles.disposables.geometries.forEach((g) => g.dispose());
      handles.disposables.materials.forEach((m) => m.dispose());
      handles.disposables.textures.forEach((t) => t.dispose());
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Notify software-WebGL renderer whenever reactive props update
  useEffect(() => {
    requestRenderRef.current?.();
  }, [theme, urgencyTone, checklistPercent, alarmActive, exploded, activeTimeMood]);

  const handleSelectCamera = (preset: CameraPresetId) => {
    setCameraPreset(preset);
    applyTargetCameraRef.current?.(preset);
  };

  return (
    <section
      aria-label="Tampilan Ruang Kerja 3D Interaktif TepatKerja"
      className="tk-animate-card tk-stagger-2 tk-card relative overflow-hidden"
    >
      {/* WebGL Canvas Container (zero React children inside mountRef!) */}
      <div
        ref={mountRef}
        data-testid="three-chronometer-canvas"
        className={`w-full ${heightClassName} select-none touch-none`}
      />

      {/* Minimal Top Status Tag (No backdrop-blur!) */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
        <div
          className={`pointer-events-auto bg-[var(--tk-surface)] border border-[var(--tk-border)] rounded-[3px] shadow-sm max-w-[72%] ${
            compactMode ? 'px-2.5 py-1.5' : 'px-3 py-2'
          }`}
        >
          <p className="font-display text-[11px] font-semibold uppercase tracking-wide text-[var(--tk-accent-text)] truncate leading-tight">
            RX-02 Banshee 3D · {getTimeOfDayMood(now).label}
          </p>
          <p className="text-xs font-bold text-[var(--tk-text)] truncate mt-0.5 leading-tight">
            {shiftTitle}
            {departTimeStr ? ` · Berangkat ${departTimeStr}` : ''}
          </p>
        </div>

        {compactMode && onOpenFullStudio && (
          <button
            type="button"
            onClick={onOpenFullStudio}
            className="tk-armor-cut-sm pointer-events-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[var(--tk-text)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] shadow-sm whitespace-nowrap"
          >
            <Maximize2 className="h-3.5 w-3.5 text-[var(--tk-accent-text)]" aria-hidden="true" />
            <span>Ruang 3D Penuh</span>
          </button>
        )}
      </div>

      {/* Selected 3D Part Inspector Popup */}
      {selectedPart && (
        <div
          role="status"
          className="tk-animate-notice absolute top-16 left-3 max-w-xs bg-[var(--tk-surface)] border border-[var(--tk-accent-border)] rounded-[3px] px-3.5 py-2.5 shadow-md"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-xs font-bold text-[var(--tk-accent-text)]">
              {selectedPart.title}
            </p>
            <button
              type="button"
              onClick={() => setSelectedPart(null)}
              className="text-[11px] font-medium text-[var(--tk-text-subtle)] hover:text-[var(--tk-text)]"
            >
              Tutup
            </button>
          </div>
          <p className="mt-1 text-xs text-[var(--tk-text-muted)] leading-relaxed">
            {selectedPart.detail}
          </p>
        </div>
      )}

      {/* Collapsible Bottom Control Dock (<= 15% height, solid surface, zero backdrop-blur) */}
      <div className="border-t border-[var(--tk-border)] bg-[var(--tk-surface)] px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--tk-text-subtle)]">
            <MousePointerClick className="h-3.5 w-3.5 text-[var(--tk-accent-text)] shrink-0" aria-hidden="true" />
            <span className="truncate">
              Seret untuk memutar · Klik bagian unit 3D untuk detail
            </span>
          </div>

          <button
            type="button"
            onClick={() => setDockOpen((prev) => !prev)}
            aria-expanded={dockOpen}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[var(--tk-accent-text)] hover:bg-[var(--tk-surface-muted)] rounded-[2px] whitespace-nowrap"
          >
            <span>{dockOpen ? 'Ringkas Kontrol' : 'Kontrol 3D'}</span>
            {dockOpen ? (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>

        {dockOpen && (
          <div className="tk-animate-notice mt-2 pt-2 border-t border-[var(--tk-border-subtle)] flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {(Object.keys(CAMERA_PRESETS) as CameraPresetId[]).map((presetKey) => {
                const isActive = cameraPreset === presetKey;
                return (
                  <button
                    key={presetKey}
                    type="button"
                    onClick={() => handleSelectCamera(presetKey)}
                    className={`tk-armor-cut-sm px-2.5 py-1 text-xs font-medium border transition-colors ${
                      isActive
                        ? 'bg-[var(--tk-accent-soft)] border-[var(--tk-accent)] text-[var(--tk-accent-text)] font-semibold'
                        : 'bg-[var(--tk-surface)] border-[var(--tk-border)] text-[var(--tk-text-muted)] hover:text-[var(--tk-text)]'
                    }`}
                  >
                    {CAMERA_PRESETS[presetKey].label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {!compactMode && (
                <select
                  aria-label="Suasana pencahayaan 3D"
                  value={timeMoodOverride ?? 'auto'}
                  onChange={(e) =>
                    setTimeMoodOverride(
                      e.target.value === 'auto'
                        ? null
                        : (e.target.value as TimeOfDayMoodId),
                    )
                  }
                  className="px-2 py-1 text-xs font-medium bg-[var(--tk-surface)] border border-[var(--tk-border)] rounded-[2px] text-[var(--tk-text)]"
                >
                  <option value="auto">Cahaya Otomatis</option>
                  <option value="pagi">Suasana Pagi</option>
                  <option value="siang">Suasana Siang</option>
                  <option value="sore">Suasana Sore</option>
                  <option value="malam">Suasana Malam</option>
                </select>
              )}

              <button
                type="button"
                onClick={() => setExploded((prev) => !prev)}
                aria-pressed={exploded}
                className={`tk-armor-cut-sm inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border transition-colors ${
                  exploded
                    ? 'bg-[var(--tk-accent)] border-[var(--tk-accent)] text-white'
                    : 'bg-[var(--tk-surface)] border-[var(--tk-border)] text-[var(--tk-text-muted)] hover:text-[var(--tk-text)]'
                }`}
              >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Bedah Armor</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setExploded(false);
                  setTimeMoodOverride(null);
                  setSelectedPart(null);
                  handleSelectCamera('utama');
                }}
                aria-label="Atur ulang kamera 3D"
                className="tk-armor-cut-sm inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
