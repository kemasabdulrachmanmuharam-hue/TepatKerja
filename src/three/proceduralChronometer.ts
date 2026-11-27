import * as THREE from 'three';
import type { ThreeScenePalette } from '../utils/workspaceFeatures';

export interface ChronometerPartHandles {
  root: THREE.Group;
  deskPlane: THREE.Mesh;
  plinthGroup: THREE.Group;
  clockBodyGroup: THREE.Group;
  headGroup: THREE.Group;
  vFinGroup: THREE.Group;
  faceplateGroup: THREE.Group;
  leftShoulder: THREE.Group;
  rightShoulder: THREE.Group;
  backpackGroup: THREE.Group;
  bezelRing: THREE.Mesh;
  dialMesh: THREE.Mesh;
  hourMarkers: THREE.InstancedMesh;
  hourHandPivot: THREE.Group;
  minuteHandPivot: THREE.Group;
  secondHandPivot: THREE.Group;
  crystalLens: THREE.Mesh;
  orbitalGroup: THREE.Group;
  beaconOrb: THREE.Mesh;
  commuteTrack: THREE.Mesh;
  commuteRunner: THREE.Mesh;
  lampGroup: THREE.Group;
  lampBulb: THREE.Mesh;
  mugGroup: THREE.Group;
  interactables: THREE.Object3D[];
  materials: {
    desk: THREE.MeshStandardMaterial;
    plinth: THREE.MeshStandardMaterial;
    bezel: THREE.MeshStandardMaterial;
    dial: THREE.MeshStandardMaterial;
    hand: THREE.MeshStandardMaterial;
    accent: THREE.MeshStandardMaterial;
    beacon: THREE.MeshStandardMaterial;
    lampShade: THREE.MeshStandardMaterial;
    mug: THREE.MeshStandardMaterial;
    armorWhite: THREE.MeshStandardMaterial;
    armorBlue: THREE.MeshStandardMaterial;
    armorRed: THREE.MeshStandardMaterial;
    armorGold: THREE.MeshStandardMaterial;
    visor: THREE.MeshStandardMaterial;
  };
  disposables: {
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
    textures: THREE.Texture[];
  };
  dialTextures: {
    light: THREE.CanvasTexture;
    dark: THREE.CanvasTexture;
  };
}

function createBrushedSurfaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 2) {
      const shade = 116 + Math.floor((Math.sin(y * 0.45) + 1) * 14);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(0, y, 256, 1);
    }
    // Subtle mecha panel seam lines
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, 224, 224);
    ctx.beginPath();
    ctx.moveTo(0, 128);
    ctx.lineTo(256, 128);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0,0,0,0.56)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.22)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(canvas);
}

function createDialFaceTexture(isDark: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = isDark ? '#0B1222' : '#F8FAFD';
    ctx.fillRect(0, 0, 512, 512);

    ctx.save();
    ctx.translate(256, 256);

    // Outer mecha calibration ring
    ctx.strokeStyle = isDark ? 'rgba(96,165,250,0.34)' : 'rgba(29,78,216,0.22)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 214, 0, Math.PI * 2);
    ctx.stroke();

    // Inner reticle crosshairs
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.16)' : 'rgba(15,23,42,0.10)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 146, 0, Math.PI * 2);
    ctx.stroke();

    // 60 precision minute ticks
    for (let i = 0; i < 60; i += 1) {
      const angle = (i / 60) * Math.PI * 2;
      const isMajor = i % 5 === 0;
      const r1 = isMajor ? 182 : 196;
      const r2 = 208;
      ctx.strokeStyle = isDark
        ? isMajor
          ? 'rgba(248,250,252,0.85)'
          : 'rgba(148,163,184,0.38)'
        : isMajor
          ? 'rgba(12,20,36,0.82)'
          : 'rgba(71,85,105,0.32)';
      ctx.lineWidth = isMajor ? 5 : 2;
      ctx.beginPath();
      ctx.moveTo(Math.sin(angle) * r1, -Math.cos(angle) * r1);
      ctx.lineTo(Math.sin(angle) * r2, -Math.cos(angle) * r2);
      ctx.stroke();
    }

    ctx.fillStyle = isDark ? '#FF9E3D' : '#EA580C';
    ctx.font = 'bold 21px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TEPATKERJA', 0, -76);
    ctx.fillStyle = isDark ? 'rgba(255,183,3,0.82)' : 'rgba(51,65,85,0.78)';
    ctx.font = '700 13px monospace';
    ctx.fillText('RX-0[N] · BANSHEE', 0, 96);

    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createContactShadowMesh(
  radius: number,
  shadowTex: THREE.CanvasTexture,
  y = 0.015,
): { mesh: THREE.Mesh; geo: THREE.BufferGeometry; mat: THREE.Material } {
  const geo = new THREE.CircleGeometry(radius, 32);
  const mat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  return { mesh, geo, mat };
}

function createOctagonShape(radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.closePath();
  return shape;
}

export function buildProceduralChronometerScene(
  palette: ThreeScenePalette,
  isDark: boolean,
): ChronometerPartHandles {
  const geometries: THREE.BufferGeometry[] = [];
  const materialsList: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const interactables: THREE.Object3D[] = [];

  const brushedTex = createBrushedSurfaceTexture();
  const shadowTex = createContactShadowTexture();
  const dialTexLight = createDialFaceTexture(false);
  const dialTexDark = createDialFaceTexture(true);
  const dialTex = isDark ? dialTexDark : dialTexLight;
  textures.push(brushedTex, shadowTex, dialTexLight, dialTexDark);

  const root = new THREE.Group();

  // Calibrated PBR Materials (matte hangar floor, satin armor, metallic frame, glowing optics)
  const deskMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.deskHex),
    roughness: 0.86,
    metalness: 0.08,
    bumpMap: brushedTex,
    bumpScale: 0.008,
  });
  const plinthMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.plinthHex),
    roughness: 0.52,
    metalness: 0.25,
    bumpMap: brushedTex,
    bumpScale: 0.01,
  });
  const bezelMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.bezelHex),
    roughness: 0.28,
    metalness: 0.78,
  });
  const dialMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: dialTex,
    roughness: 0.68,
    metalness: 0.05,
  });
  const handMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.handHex),
    roughness: 0.25,
    metalness: 0.7,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.accentHex),
    roughness: 0.28,
    metalness: 0.42,
    emissive: new THREE.Color(palette.accentHex),
    emissiveIntensity: 0.14,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.beaconHex),
    roughness: 0.14,
    metalness: 0.1,
    emissive: new THREE.Color(palette.beaconHex),
    emissiveIntensity: 1.0,
  });
  const lampShadeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.lampShadeHex),
    roughness: 0.35,
    metalness: 0.45,
  });
  const mugMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.mugHex),
    roughness: 0.24,
    metalness: 0.1,
  });
  const trackMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.bezelHex),
    roughness: 0.42,
    metalness: 0.55,
  });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: new THREE.Color(palette.visorHex),
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });

  // Dedicated Gundam Armor Materials
  const armorWhiteMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.armorWhiteHex),
    roughness: 0.34,
    metalness: 0.14,
    bumpMap: brushedTex,
    bumpScale: 0.004,
  });
  const armorBlueMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.armorBlueHex),
    roughness: 0.3,
    metalness: 0.26,
  });
  const armorRedMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.armorRedHex),
    roughness: 0.32,
    metalness: 0.22,
  });
  const armorGoldMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.armorGoldHex),
    roughness: 0.22,
    metalness: 0.68,
    emissive: new THREE.Color(palette.armorGoldHex),
    emissiveIntensity: 0.12,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.visorHex),
    roughness: 0.12,
    metalness: 0.15,
    emissive: new THREE.Color(palette.visorHex),
    emissiveIntensity: 1.15,
  });

  materialsList.push(
    deskMat,
    plinthMat,
    bezelMat,
    dialMat,
    handMat,
    accentMat,
    beaconMat,
    lampShadeMat,
    mugMat,
    trackMat,
    bulbMat,
    armorWhiteMat,
    armorBlueMat,
    armorRedMat,
    armorGoldMat,
    visorMat,
  );

  // 1. Hangar Floor Deck (y = 0)
  const deskGeo = new THREE.CircleGeometry(15, 64);
  geometries.push(deskGeo);
  const deskPlane = new THREE.Mesh(deskGeo, deskMat);
  deskPlane.rotation.x = -Math.PI / 2;
  deskPlane.receiveShadow = true;
  root.add(deskPlane);

  // 2. Octagonal Hangar Launch Turntable (flush at y = 0)
  const plinthGroup = new THREE.Group();
  const octShape = createOctagonShape(1.55);
  const plinthGeo = new THREE.ExtrudeGeometry(octShape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  plinthGeo.rotateX(-Math.PI / 2);
  plinthGeo.translate(0, 0.04, 0);
  geometries.push(plinthGeo);

  const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
  plinthMesh.castShadow = true;
  plinthMesh.receiveShadow = true;
  plinthMesh.userData.partInfo = {
    id: 'plinth',
    title: 'Dek Hangar Peluncuran',
    detail: 'Landasan oktagonal tempat unit Gundam dan pelacak jadwal kerja Anda berdiri.',
  };
  plinthGroup.add(plinthMesh);
  interactables.push(plinthMesh);

  // Upper recessed inner deck ring
  const innerDeckGeo = new THREE.CylinderGeometry(1.12, 1.18, 0.06, 8);
  geometries.push(innerDeckGeo);
  const innerDeck = new THREE.Mesh(innerDeckGeo, bezelMat);
  innerDeck.position.y = 0.31;
  innerDeck.rotation.y = Math.PI / 8;
  innerDeck.receiveShadow = true;
  plinthGroup.add(innerDeck);

  // Front tricolor caution accent bar on turntable
  const trimBlueGeo = new THREE.BoxGeometry(0.95, 0.055, 0.08);
  const trimGoldGeo = new THREE.BoxGeometry(0.28, 0.055, 0.08);
  const trimRedGeo = new THREE.BoxGeometry(0.28, 0.055, 0.08);
  geometries.push(trimBlueGeo, trimGoldGeo, trimRedGeo);

  const trimBlue = new THREE.Mesh(trimBlueGeo, armorBlueMat);
  trimBlue.position.set(-0.28, 0.16, 1.43);
  const trimGold = new THREE.Mesh(trimGoldGeo, armorGoldMat);
  trimGold.position.set(0.36, 0.16, 1.43);
  const trimRed = new THREE.Mesh(trimRedGeo, armorRedMat);
  trimRed.position.set(0.66, 0.16, 1.43);
  plinthGroup.add(trimBlue, trimGold, trimRed);

  const plinthShadow = createContactShadowMesh(2.25, shadowTex, 0.015);
  geometries.push(plinthShadow.geo);
  materialsList.push(plinthShadow.mat);
  plinthGroup.add(plinthShadow.mesh);

  root.add(plinthGroup);

  // 3. Gundam Torso & Chest Chronometer Core (clockBodyGroup)
  const clockBodyGroup = new THREE.Group();
  clockBodyGroup.position.set(0, 1.06, 0);

  // Waist & Lower Torso Core connecting torso to deck
  const waistGeo = new THREE.BoxGeometry(0.76, 0.42, 0.56);
  geometries.push(waistGeo);
  const waistMesh = new THREE.Mesh(waistGeo, bezelMat);
  waistMesh.position.set(0, -0.54, -0.02);
  waistMesh.castShadow = true;
  clockBodyGroup.add(waistMesh);

  const abdomenGeo = new THREE.BoxGeometry(0.64, 0.28, 0.52);
  geometries.push(abdomenGeo);
  const abdomenMesh = new THREE.Mesh(abdomenGeo, armorRedMat);
  abdomenMesh.position.set(0, -0.32, 0.02);
  abdomenMesh.castShadow = true;
  clockBodyGroup.add(abdomenMesh);

  // Main Cobalt-Blue Chest Armor Block (beveled ExtrudeGeometry)
  const chestShape = new THREE.Shape();
  chestShape.moveTo(-0.76, -0.22);
  chestShape.lineTo(0.76, -0.22);
  chestShape.lineTo(0.86, 0.12);
  chestShape.lineTo(0.68, 0.44);
  chestShape.lineTo(-0.68, 0.44);
  chestShape.lineTo(-0.86, 0.12);
  chestShape.closePath();

  const chestGeo = new THREE.ExtrudeGeometry(chestShape, {
    depth: 0.66,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  chestGeo.translate(0, 0, -0.34);
  geometries.push(chestGeo);
  const chestArmor = new THREE.Mesh(chestGeo, armorBlueMat);
  chestArmor.castShadow = true;
  chestArmor.receiveShadow = true;
  chestArmor.userData.partInfo = {
    id: 'torso',
    title: 'Armor Dada Unit Gundam',
    detail: 'Rangka dada berlapis baja kobalt yang menampung inti reaktor kronometer waktu nyata.',
  };
  clockBodyGroup.add(chestArmor);
  interactables.push(chestArmor);

  // Crimson Cockpit Hatch below Chest Core
  const cockpitGeo = new THREE.BoxGeometry(0.32, 0.34, 0.16);
  geometries.push(cockpitGeo);
  const cockpitMesh = new THREE.Mesh(cockpitGeo, armorRedMat);
  cockpitMesh.position.set(0, -0.1, 0.34);
  cockpitMesh.castShadow = true;
  clockBodyGroup.add(cockpitMesh);

  // Left & Right Psycho-Frame Glowing Chest Ribs & Exhaust Vents
  const ventHousingGeo = new THREE.BoxGeometry(0.3, 0.2, 0.13);
  const ventSlatGeo = new THREE.BoxGeometry(0.25, 0.032, 0.15);
  const psychoSeamGeo = new THREE.BoxGeometry(0.26, 0.045, 0.155);
  geometries.push(ventHousingGeo, ventSlatGeo, psychoSeamGeo);

  for (const side of [-1, 1] as const) {
    const ventFrame = new THREE.Mesh(ventHousingGeo, armorGoldMat);
    ventFrame.position.set(side * 0.54, 0.15, 0.33);
    ventFrame.rotation.y = side * -0.14;
    ventFrame.rotation.z = side * 0.12;
    ventFrame.castShadow = true;
    clockBodyGroup.add(ventFrame);

    const psychoSlit = new THREE.Mesh(psychoSeamGeo, visorMat);
    psychoSlit.position.set(side * 0.54, 0.15, 0.345);
    psychoSlit.rotation.y = side * -0.14;
    psychoSlit.rotation.z = side * 0.12;
    clockBodyGroup.add(psychoSlit);

    for (const s of [-1, 1] as const) {
      const slat = new THREE.Mesh(ventSlatGeo, bezelMat);
      slat.position.set(side * 0.54, 0.15 + s * 0.056, 0.338);
      slat.rotation.y = side * -0.14;
      slat.rotation.z = side * 0.12;
      clockBodyGroup.add(slat);
    }
  }

  // Banshee Lion-Mane Collar Guard (Gold Armor + Glowing Psycho-Frame Core)
  const collarGeo = new THREE.BoxGeometry(0.62, 0.13, 0.46);
  const collarManeGeo = new THREE.BoxGeometry(0.14, 0.24, 0.34);
  geometries.push(collarGeo, collarManeGeo);
  const collarMesh = new THREE.Mesh(collarGeo, armorGoldMat);
  collarMesh.position.set(0, 0.46, 0.02);
  collarMesh.castShadow = true;
  clockBodyGroup.add(collarMesh);
  for (const side of [-1, 1] as const) {
    const mane = new THREE.Mesh(collarManeGeo, armorGoldMat);
    mane.position.set(side * 0.36, 0.48, 0.05);
    mane.rotation.z = side * -0.35;
    clockBodyGroup.add(mane);
  }

  // Chest Reactor Chronometer Assembly (Embedded in Front Chest Core)
  const dialRadius = 0.36;
  const bezelGeo = new THREE.TorusGeometry(dialRadius + 0.035, 0.036, 16, 48, Math.PI * 1.72);
  geometries.push(bezelGeo);
  const bezelRing = new THREE.Mesh(bezelGeo, bezelMat);
  bezelRing.rotation.z = Math.PI * 0.25;
  bezelRing.position.set(0, 0.12, 0.385);
  bezelRing.castShadow = true;
  bezelRing.userData.partInfo = {
    id: 'bezel',
    title: 'Cincin Inti Kronometer',
    detail: 'Cincin pelindung reaktor waktu pada dada Gundam untuk memantau jam berangkat.',
  };
  clockBodyGroup.add(bezelRing);
  interactables.push(bezelRing);

  const dialBackGeo = new THREE.CylinderGeometry(dialRadius, dialRadius, 0.03, 40);
  dialBackGeo.rotateX(Math.PI / 2);
  geometries.push(dialBackGeo);
  const dialBackMesh = new THREE.Mesh(dialBackGeo, plinthMat);
  dialBackMesh.position.set(0, 0.12, 0.37);
  clockBodyGroup.add(dialBackMesh);

  const dialGeo = new THREE.CircleGeometry(dialRadius, 48);
  geometries.push(dialGeo);
  const dialMesh = new THREE.Mesh(dialGeo, dialMat);
  dialMesh.position.set(0, 0.12, 0.388);
  dialMesh.userData.partInfo = {
    id: 'dial',
    title: 'Kronometer Reaktor Dada',
    detail: 'Menunjukkan waktu aktual dan progres menuju jam berangkat kerja Anda.',
  };
  clockBodyGroup.add(dialMesh);
  interactables.push(dialMesh);

  // 12 Instanced Hour Markers scaled to Chest Reactor
  const markerGeo = new THREE.BoxGeometry(0.018, 0.052, 0.014);
  geometries.push(markerGeo);
  const hourMarkers = new THREE.InstancedMesh(markerGeo, bezelMat, 12);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    dummy.position.set(
      Math.sin(angle) * 0.29,
      0.12 + Math.cos(angle) * 0.29,
      0.394,
    );
    dummy.rotation.set(0, 0, -angle);
    dummy.scale.set(i % 3 === 0 ? 1.25 : 0.85, i % 3 === 0 ? 1.15 : 0.85, 1);
    dummy.updateMatrix();
    hourMarkers.setMatrixAt(i, dummy.matrix);
  }
  hourMarkers.instanceMatrix.needsUpdate = true;
  clockBodyGroup.add(hourMarkers);

  // Clock Hands anchored at (0, 0.12, z)
  const hourHandPivot = new THREE.Group();
  hourHandPivot.position.set(0, 0.12, 0.405);
  const hourGeo = new THREE.BoxGeometry(0.032, 0.19, 0.014);
  hourGeo.translate(0, 0.075, 0);
  geometries.push(hourGeo);
  hourHandPivot.add(new THREE.Mesh(hourGeo, handMat));
  clockBodyGroup.add(hourHandPivot);

  const minuteHandPivot = new THREE.Group();
  minuteHandPivot.position.set(0, 0.12, 0.415);
  const minGeo = new THREE.BoxGeometry(0.022, 0.26, 0.012);
  minGeo.translate(0, 0.11, 0);
  geometries.push(minGeo);
  minuteHandPivot.add(new THREE.Mesh(minGeo, handMat));
  clockBodyGroup.add(minuteHandPivot);

  const secondHandPivot = new THREE.Group();
  secondHandPivot.position.set(0, 0.12, 0.425);
  const secGeo = new THREE.BoxGeometry(0.01, 0.29, 0.008);
  secGeo.translate(0, 0.115, 0);
  geometries.push(secGeo);
  secondHandPivot.add(new THREE.Mesh(secGeo, armorRedMat));
  clockBodyGroup.add(secondHandPivot);

  const capGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.032, 20);
  capGeo.rotateX(Math.PI / 2);
  geometries.push(capGeo);
  const capMesh = new THREE.Mesh(capGeo, armorGoldMat);
  capMesh.position.set(0, 0.12, 0.422);
  clockBodyGroup.add(capMesh);

  const crystalGeo = new THREE.CylinderGeometry(dialRadius, dialRadius, 0.014, 40);
  crystalGeo.rotateX(Math.PI / 2);
  geometries.push(crystalGeo);
  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.16,
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1.0,
    depthWrite: false,
  });
  materialsList.push(crystalMat);
  const crystalLens = new THREE.Mesh(crystalGeo, crystalMat);
  crystalLens.position.set(0, 0.12, 0.44);
  crystalLens.renderOrder = 2;
  clockBodyGroup.add(crystalLens);

  // Left & Right White Armor Shoulder Pauldrons
  const buildShoulderPauldron = (side: -1 | 1): THREE.Group => {
    const group = new THREE.Group();
    group.position.set(side * 1.04, 0.26, 0);
    group.rotation.z = side * -0.18;

    const mainGeo = new THREE.BoxGeometry(0.56, 0.5, 0.64);
    geometries.push(mainGeo);
    const mainMesh = new THREE.Mesh(mainGeo, armorWhiteMat);
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    mainMesh.userData.partInfo = {
      id: 'shoulder',
      title: 'Armor Bahu & Vernier',
      detail: 'Pelindung bahu titanium yang melepaskan panas saat persiapan keberangkatan.',
    };
    group.add(mainMesh);
    interactables.push(mainMesh);

    const topCapGeo = new THREE.BoxGeometry(0.5, 0.12, 0.56);
    geometries.push(topCapGeo);
    const topCap = new THREE.Mesh(topCapGeo, armorBlueMat);
    topCap.position.y = 0.28;
    topCap.castShadow = true;
    group.add(topCap);

    const trimEdgeGeo = new THREE.BoxGeometry(0.08, 0.46, 0.66);
    geometries.push(trimEdgeGeo);
    const trimEdge = new THREE.Mesh(trimEdgeGeo, visorMat);
    trimEdge.position.x = side * 0.28;
    group.add(trimEdge);

    const sideThrusterGeo = new THREE.BoxGeometry(0.08, 0.16, 0.34);
    geometries.push(sideThrusterGeo);
    const sideThruster = new THREE.Mesh(sideThrusterGeo, armorGoldMat);
    sideThruster.position.set(side * 0.3, -0.04, 0);
    group.add(sideThruster);

    // Upper arm cylinder stump underneath
    const armJointGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.42, 16);
    geometries.push(armJointGeo);
    const armJoint = new THREE.Mesh(armJointGeo, bezelMat);
    armJoint.position.set(side * 0.04, -0.38, 0);
    group.add(armJoint);

    return group;
  };

  const leftShoulder = buildShoulderPauldron(-1);
  const rightShoulder = buildShoulderPauldron(1);
  clockBodyGroup.add(leftShoulder, rightShoulder);

  // Backpack & Twin Armed Armor / Psycho-Frame Wing Stabilizers
  const backpackGroup = new THREE.Group();
  backpackGroup.position.set(0, 0.18, -0.48);

  const packCoreGeo = new THREE.BoxGeometry(0.84, 0.56, 0.34);
  geometries.push(packCoreGeo);
  const packCore = new THREE.Mesh(packCoreGeo, bezelMat);
  packCore.castShadow = true;
  backpackGroup.add(packCore);

  const thrusterGeo = new THREE.CylinderGeometry(0.1, 0.13, 0.18, 16);
  geometries.push(thrusterGeo);
  for (const side of [-1, 1] as const) {
    const thruster = new THREE.Mesh(thrusterGeo, armorRedMat);
    thruster.position.set(side * 0.24, -0.28, -0.06);
    thruster.rotation.x = 0.25;
    backpackGroup.add(thruster);
  }

  // Swept Wing / Armed Armor XC Stabilizers rising diagonally behind shoulders
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(0.24, 0);
  wingShape.lineTo(0.58, 0.92);
  wingShape.lineTo(0.32, 0.96);
  wingShape.closePath();

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  geometries.push(wingGeo);

  for (const side of [-1, 1] as const) {
    const wing = new THREE.Mesh(wingGeo, armorWhiteMat);
    wing.position.set(side * 0.32, 0.14, -0.04);
    wing.scale.x = side;
    wing.castShadow = true;
    backpackGroup.add(wing);

    const saberGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.56, 12);
    geometries.push(saberGeo);
    const saber = new THREE.Mesh(saberGeo, visorMat);
    saber.position.set(side * 0.34, 0.44, 0.08);
    saber.rotation.z = side * -0.24;
    backpackGroup.add(saber);
  }
  clockBodyGroup.add(backpackGroup);

  // 4. Sculpted Gundam Head Assembly (headGroup)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.84, 0.02);

  // Neck piston cylinder
  const neckGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.36, 20);
  geometries.push(neckGeo);
  const neckMesh = new THREE.Mesh(neckGeo, bezelMat);
  neckMesh.position.set(0, -0.26, 0);
  headGroup.add(neckMesh);

  // Main White Helmet Shell
  const helmetGeo = new THREE.BoxGeometry(0.58, 0.52, 0.62);
  geometries.push(helmetGeo);
  const helmetMesh = new THREE.Mesh(helmetGeo, armorWhiteMat);
  helmetMesh.castShadow = true;
  helmetMesh.receiveShadow = true;
  helmetMesh.userData.partInfo = {
    id: 'head',
    title: 'Unit Kepala & Sensor Gundam',
    detail: 'Dilengkapi V-fin emas, kamera utama, dan mata optik yang merespons urgensi jadwal.',
  };
  headGroup.add(helmetMesh);
  interactables.push(helmetMesh);

  // Helmet Top Crest Fin (White Housing + Red Crown)
  const mohawkGeo = new THREE.BoxGeometry(0.15, 0.16, 0.64);
  geometries.push(mohawkGeo);
  const mohawkMesh = new THREE.Mesh(mohawkGeo, armorWhiteMat);
  mohawkMesh.position.set(0, 0.31, -0.01);
  mohawkMesh.castShadow = true;
  headGroup.add(mohawkMesh);

  // Glowing Main Camera Sensor on Forehead (beaconOrb — reflects urgency & checklist!)
  const beaconGeo = new THREE.BoxGeometry(0.12, 0.11, 0.14);
  geometries.push(beaconGeo);
  const beaconOrb = new THREE.Mesh(beaconGeo, beaconMat);
  beaconOrb.position.set(0, 0.32, 0.27);
  beaconOrb.userData.partInfo = {
    id: 'beacon',
    title: 'Kamera Sensor Utama',
    detail: 'Berubah warna mengikuti urgensi jam berangkat & persentase checklist persiapan pagi.',
  };
  headGroup.add(beaconOrb);
  interactables.push(beaconOrb);

  // Temple Vulcan Pods + Cheek Side Guards
  const cheekGeo = new THREE.BoxGeometry(0.09, 0.36, 0.54);
  geometries.push(cheekGeo);
  for (const side of [-1, 1] as const) {
    const cheek = new THREE.Mesh(cheekGeo, armorWhiteMat);
    cheek.position.set(side * 0.31, -0.06, 0.04);
    cheek.rotation.z = side * 0.1;
    cheek.castShadow = true;
    headGroup.add(cheek);

    const earVentGeo = new THREE.BoxGeometry(0.05, 0.18, 0.16);
    geometries.push(earVentGeo);
    const earVent = new THREE.Mesh(earVentGeo, bezelMat);
    earVent.position.set(side * 0.35, 0.02, 0);
    headGroup.add(earVent);
  }

  // Iconic Multi-Pronged Banshee Gold V-Fin Antenna + Psycho-Frame Center Crest
  const vFinGroup = new THREE.Group();
  vFinGroup.position.set(0, 0.19, 0.33);

  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(0.58, 0.38);
  finShape.lineTo(0.64, 0.48);
  finShape.lineTo(0.42, 0.35);
  finShape.lineTo(0.49, 0.49);
  finShape.lineTo(0.26, 0.25);
  finShape.lineTo(0.05, 0.12);
  finShape.closePath();

  const finGeo = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.038,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geometries.push(finGeo);

  const rightFin = new THREE.Mesh(finGeo, armorGoldMat);
  rightFin.position.set(0.03, -0.02, 0);
  rightFin.rotation.y = -0.18;
  rightFin.castShadow = true;

  const leftFin = new THREE.Mesh(finGeo, armorGoldMat);
  leftFin.position.set(-0.03, -0.02, 0);
  leftFin.scale.x = -1;
  leftFin.rotation.y = 0.18;
  leftFin.castShadow = true;

  const jewelGeo = new THREE.BoxGeometry(0.11, 0.17, 0.08);
  geometries.push(jewelGeo);
  const centerJewel = new THREE.Mesh(jewelGeo, visorMat);
  centerJewel.position.set(0, 0.04, 0.015);
  centerJewel.castShadow = true;
  centerJewel.userData.partInfo = {
    id: 'vfin',
    title: 'Tanduk V-Fin Emas Banshee',
    detail: 'Tanduk V-fin khas RX-0 Banshee dengan sensor Psycho-Frame pemantau jadwal kerja.',
  };

  vFinGroup.add(rightFin, leftFin, centerJewel);
  interactables.push(centerJewel);
  headGroup.add(vFinGroup);

  // Dark Eye Recess + Glowing Twin Optical Eyes
  const eyeSocketGeo = new THREE.BoxGeometry(0.46, 0.13, 0.1);
  geometries.push(eyeSocketGeo);
  const eyeSocket = new THREE.Mesh(eyeSocketGeo, bezelMat);
  eyeSocket.position.set(0, 0.03, 0.285);
  headGroup.add(eyeSocket);

  const eyeGeo = new THREE.BoxGeometry(0.14, 0.068, 0.04);
  geometries.push(eyeGeo);
  for (const side of [-1, 1] as const) {
    const eye = new THREE.Mesh(eyeGeo, visorMat);
    eye.position.set(side * 0.125, 0.032, 0.328);
    eye.rotation.z = side * 0.16;
    headGroup.add(eye);
  }

  // Faceplate Mask + Red Chin Guard (separates during Exploded Armor view)
  const faceplateGroup = new THREE.Group();
  faceplateGroup.position.set(0, -0.14, 0.31);

  const maskGeo = new THREE.BoxGeometry(0.32, 0.18, 0.12);
  geometries.push(maskGeo);
  const maskMesh = new THREE.Mesh(maskGeo, armorWhiteMat);
  maskMesh.castShadow = true;
  faceplateGroup.add(maskMesh);

  // Dual Horizontal Faceplate Vent Slits
  const slitGeo = new THREE.BoxGeometry(0.16, 0.022, 0.02);
  geometries.push(slitGeo);
  for (const yOff of [0.025, -0.025]) {
    const slit = new THREE.Mesh(slitGeo, bezelMat);
    slit.position.set(0, yOff, 0.06);
    faceplateGroup.add(slit);
  }

  const chinGeo = new THREE.BoxGeometry(0.15, 0.095, 0.13);
  geometries.push(chinGeo);
  const chinMesh = new THREE.Mesh(chinGeo, armorRedMat);
  chinMesh.position.set(0, -0.11, 0.01);
  faceplateGroup.add(chinMesh);

  headGroup.add(faceplateGroup);
  clockBodyGroup.add(headGroup);
  root.add(clockBodyGroup);

  // 5. Floating Orbital Targeting Chrono Ring
  const orbitalGroup = new THREE.Group();
  orbitalGroup.position.set(0, 1.46, 0);
  orbitalGroup.rotation.set(0.32, 0.18, -0.18);

  const haloGeo = new THREE.TorusGeometry(1.66, 0.02, 12, 72);
  geometries.push(haloGeo);
  const haloMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.accentHex),
    transparent: true,
    opacity: 0.48,
    roughness: 0.2,
    metalness: 0.65,
    emissive: new THREE.Color(palette.accentHex),
    emissiveIntensity: 0.25,
  });
  materialsList.push(haloMat);
  const haloRing = new THREE.Mesh(haloGeo, haloMat);
  haloRing.rotation.x = Math.PI / 2.25;
  orbitalGroup.add(haloRing);

  const satGeo = new THREE.OctahedronGeometry(0.08, 0);
  geometries.push(satGeo);
  const satNode = new THREE.Mesh(satGeo, armorGoldMat);
  satNode.position.set(1.66, 0.06, 0);
  orbitalGroup.add(satNode);
  root.add(orbitalGroup);

  // 6. Curved Hangar Commute Route Progress Arc (TubeGeometry) + Runner Node
  const commuteCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.35, 0.34, 0.65),
    new THREE.Vector3(-0.65, 0.42, 1.15),
    new THREE.Vector3(0.65, 0.42, 1.15),
    new THREE.Vector3(1.35, 0.34, 0.65),
  ]);
  const trackGeo = new THREE.TubeGeometry(commuteCurve, 40, 0.03, 12, false);
  geometries.push(trackGeo);
  const commuteTrack = new THREE.Mesh(trackGeo, trackMat);
  commuteTrack.userData.partInfo = {
    id: 'commute',
    title: 'Jalur Progres Komuter',
    detail: 'Melacak kesiapan pagi hingga berangkat tepat waktu ke lokasi kerja.',
  };
  root.add(commuteTrack);
  interactables.push(commuteTrack);

  const runnerGeo = new THREE.SphereGeometry(0.075, 18, 18);
  geometries.push(runnerGeo);
  const commuteRunner = new THREE.Mesh(runnerGeo, beaconMat);
  commuteRunner.position.copy(commuteCurve.getPoint(0.25));
  root.add(commuteRunner);

  // 7. Hangar Spotlight Tower (left side, flush at y = 0)
  const lampGroup = new THREE.Group();
  lampGroup.position.set(-2.35, 0, -0.35);

  const lampShadow = createContactShadowMesh(0.5, shadowTex, 0.015);
  geometries.push(lampShadow.geo);
  materialsList.push(lampShadow.mat);
  lampGroup.add(lampShadow.mesh);

  const pylonBaseGeo = new THREE.CylinderGeometry(0.28, 0.36, 0.12, 8);
  pylonBaseGeo.translate(0, 0.06, 0);
  geometries.push(pylonBaseGeo);
  const pylonBase = new THREE.Mesh(pylonBaseGeo, bezelMat);
  pylonBase.castShadow = true;
  lampGroup.add(pylonBase);

  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.1, 0),
    new THREE.Vector3(-0.18, 1.1, -0.1),
    new THREE.Vector3(0.12, 2.0, 0.1),
    new THREE.Vector3(0.55, 1.85, 0.22),
  ]);
  const armGeo = new THREE.TubeGeometry(armCurve, 28, 0.042, 10, false);
  geometries.push(armGeo);
  const lampArm = new THREE.Mesh(armGeo, bezelMat);
  lampArm.castShadow = true;
  lampGroup.add(lampArm);

  const shadeGeo = new THREE.BoxGeometry(0.32, 0.22, 0.24);
  geometries.push(shadeGeo);
  const lampShade = new THREE.Mesh(shadeGeo, lampShadeMat);
  lampShade.position.set(0.58, 1.78, 0.24);
  lampShade.rotation.z = -0.5;
  lampShade.castShadow = true;
  lampShade.userData.partInfo = {
    id: 'lamp',
    title: 'Lampu Sorot Hangar',
    detail: 'Pencahayaan hangar menyesuaikan pagi, siang, sore, dan mode malam otomatis.',
  };
  lampGroup.add(lampShade);
  interactables.push(lampShade);

  const bulbGeo = new THREE.BoxGeometry(0.18, 0.06, 0.16);
  geometries.push(bulbGeo);
  const lampBulb = new THREE.Mesh(bulbGeo, bulbMat);
  lampBulb.position.set(0.62, 1.7, 0.24);
  lampBulb.rotation.z = -0.5;
  lampGroup.add(lampBulb);

  root.add(lampGroup);

  // 8. Hangar Tool / Energy Capsule Crate (right side, flush at y = 0)
  const mugGroup = new THREE.Group();
  mugGroup.position.set(2.2, 0, 0.42);

  const mugShadow = createContactShadowMesh(0.45, shadowTex, 0.015);
  geometries.push(mugShadow.geo);
  materialsList.push(mugShadow.mat);
  mugGroup.add(mugShadow.mesh);

  const crateGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
  crateGeo.translate(0, 0.24, 0);
  geometries.push(crateGeo);
  const crateMesh = new THREE.Mesh(crateGeo, mugMat);
  crateMesh.castShadow = true;
  crateMesh.receiveShadow = true;
  crateMesh.userData.partInfo = {
    id: 'capsule',
    title: 'Kapsul Energi Persiapan',
    detail: 'Pengingat sarapan, hidrasi, dan perlengkapan kerja sebelum berangkat.',
  };
  mugGroup.add(crateMesh);
  interactables.push(crateMesh);

  const crateBandGeo = new THREE.BoxGeometry(0.51, 0.09, 0.51);
  geometries.push(crateBandGeo);
  const crateBand = new THREE.Mesh(crateBandGeo, armorGoldMat);
  crateBand.position.y = 0.26;
  mugGroup.add(crateBand);

  const coreCylinderGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.54, 16);
  geometries.push(coreCylinderGeo);
  const coreCylinder = new THREE.Mesh(coreCylinderGeo, visorMat);
  coreCylinder.position.y = 0.27;
  mugGroup.add(coreCylinder);

  root.add(mugGroup);

  return {
    root,
    deskPlane,
    plinthGroup,
    clockBodyGroup,
    headGroup,
    vFinGroup,
    faceplateGroup,
    leftShoulder,
    rightShoulder,
    backpackGroup,
    bezelRing,
    dialMesh,
    hourMarkers,
    hourHandPivot,
    minuteHandPivot,
    secondHandPivot,
    crystalLens,
    orbitalGroup,
    beaconOrb,
    commuteTrack,
    commuteRunner,
    lampGroup,
    lampBulb,
    mugGroup,
    interactables,
    materials: {
      desk: deskMat,
      plinth: plinthMat,
      bezel: bezelMat,
      dial: dialMat,
      hand: handMat,
      accent: accentMat,
      beacon: beaconMat,
      lampShade: lampShadeMat,
      mug: mugMat,
      armorWhite: armorWhiteMat,
      armorBlue: armorBlueMat,
      armorRed: armorRedMat,
      armorGold: armorGoldMat,
      visor: visorMat,
    },
    disposables: {
      geometries,
      materials: materialsList,
      textures,
    },
    dialTextures: {
      light: dialTexLight,
      dark: dialTexDark,
    },
  };
}
