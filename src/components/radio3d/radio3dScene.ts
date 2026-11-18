import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AudioFrameMetrics } from '../../audio/chipeoAudio';
import { EqSettings, RackFinish, RackShape, RadioCameraPreset } from '../../game/types';

export interface Radio3DStateSnapshot {
  eq: EqSettings;
  voltage: number;
  currentDb: number;
  isPlaying: boolean;
  isClipping: boolean;
  trackTitle: string;
  accentColor: string;
  rackFinish: RackFinish;
  rackShape: RackShape;
  showStand?: boolean;
  streamingMode: boolean;
  sensitivity: number;
}

export interface Radio3DCallbacks {
  onVolumeDelta: (delta: number) => void;
  onSubDelta: (delta: number) => void;
  onEqBandDelta: (bandKey: keyof EqSettings, delta: number) => void;
  onTogglePlay: () => void;
  onCyclePreset: () => void;
  onToggleAux: () => void;
  onOpenFolderChooser: () => void;
  onHoverControl: (label: string | null) => void;
}

export interface Radio3DController {
  updateState: (next: Radio3DStateSnapshot) => void;
  setCameraPreset: (preset: RadioCameraPreset) => void;
  zoomStep: (direction: 'in' | 'out') => void;
  dispose: () => void;
}

type InteractiveAction =
  | { kind: 'volume'; label: string }
  | { kind: 'sub'; label: string }
  | { kind: 'band'; bandKey: keyof EqSettings; label: string }
  | { kind: 'play'; label: string }
  | { kind: 'preset'; label: string }
  | { kind: 'aux'; label: string }
  | { kind: 'folder'; label: string };

const CAMERA_PRESETS: Record<
  RadioCameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  front: { pos: [0, -0.06, 7.15], target: [0, -0.08, 0] },
  angle: { pos: [1.55, 0.58, 7.05], target: [0, -0.08, 0] },
  knobs: { pos: [-0.42, -1.05, 4.5], target: [0, -1.15, 0.16] },
};

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _colorTmp = new THREE.Color();

function detectSoftwareGl(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function createRadio3DScene(
  mountEl: HTMLElement,
  initialState: Radio3DStateSnapshot,
  metricsRef: React.MutableRefObject<AudioFrameMetrics>,
  callbacks: Radio3DCallbacks
): Radio3DController | null {
  const isSoftwareGl = detectSoftwareGl();

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = 'none';

  mountEl.innerHTML = '';
  mountEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x060911, 0.032);

  const width = Math.max(260, mountEl.clientWidth || 380);
  const height = Math.max(260, mountEl.clientHeight || 360);
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 40);
  camera.position.set(...CAMERA_PRESETS.angle.pos);

  // Studio environment reflection for realistic brushed aluminum & chrome
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRt = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRt.texture;
  pmrem.dispose();

  // Warm/Cool 3-Point Studio Lighting Rig
  const hemiLight = new THREE.HemisphereLight(0x9ecbff, 0x10141f, 0.72);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff1dc, 1.85);
  keyLight.position.set(3.4, 4.8, 5.2);
  if (!isSoftwareGl) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 18;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
  }
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.15);
  rimLight.position.set(-4.2, -1.8, 3.6);
  scene.add(rimLight);

  const accentPoint = new THREE.PointLight(initialState.accentColor, 1.35, 9, 2);
  accentPoint.position.set(0.3, 0.2, 2.3);
  scene.add(accentPoint);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minDistance = 2.9;
  controls.maxDistance = 9.6;
  controls.minPolarAngle = Math.PI * 0.25;
  controls.maxPolarAngle = Math.PI * 0.75;
  controls.minAzimuthAngle = -Math.PI * 0.36;
  controls.maxAzimuthAngle = Math.PI * 0.36;
  controls.target.set(...CAMERA_PRESETS.angle.target);
  controls.update();

  // Shared Geometries & Materials for cleanup
  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];
  const disposableTexs: THREE.Texture[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMats.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    disposableTexs.push(t);
    return t;
  };

  // Procedural brushed metal bump texture
  const brushedCanvas = document.createElement('canvas');
  brushedCanvas.width = 256;
  brushedCanvas.height = 128;
  const bCtx = brushedCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 128);
  for (let y = 0; y < 128; y++) {
    const shade = 112 + ((y * 37) % 36);
    bCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
    bCtx.fillRect(0, y, 256, 1);
  }
  const brushedBumpTex = trackTex(new THREE.CanvasTexture(brushedCanvas));
  brushedBumpTex.wrapS = THREE.RepeatWrapping;
  brushedBumpTex.wrapT = THREE.RepeatWrapping;

  const rackMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x111622,
      roughness: 0.42,
      metalness: 0.78,
      bumpMap: brushedBumpTex,
      bumpScale: 0.008,
    })
  );
  const bezelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1b2232,
      roughness: 0.28,
      metalness: 0.65,
    })
  );
  const chromeMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      roughness: 0.14,
      metalness: 0.96,
      clearcoat: 0.6,
    })
  );
  const darkKnobMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e2536,
      roughness: 0.58,
      metalness: 0.3,
    })
  );
  const accentRingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: initialState.accentColor,
      emissive: initialState.accentColor,
      emissiveIntensity: 0.72,
      roughness: 0.25,
      metalness: 0.4,
    })
  );
  const auxLedMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    })
  );

  // Dynamic CanvasTexture: Top Digital Voltmeter + dB Display
  const voltCanvas = document.createElement('canvas');
  voltCanvas.width = 512;
  voltCanvas.height = 128;
  const voltCtx = voltCanvas.getContext('2d')!;
  const voltTex = trackTex(new THREE.CanvasTexture(voltCanvas));
  voltTex.colorSpace = THREE.SRGBColorSpace;
  voltTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Dynamic CanvasTexture: Pioneer OLED Screen ("ELEGIR CARPETA" + live spectrum)
  const oledCanvas = document.createElement('canvas');
  oledCanvas.width = 640;
  oledCanvas.height = 220;
  const oledCtx = oledCanvas.getContext('2d')!;
  const oledTex = trackTex(new THREE.CanvasTexture(oledCanvas));
  oledTex.colorSpace = THREE.SRGBColorSpace;
  oledTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Dynamic CanvasTexture: ATEQ Lower Faceplate Markings (high-res crisp labels)
  const ateqLabelCanvas = document.createElement('canvas');
  ateqLabelCanvas.width = 1024;
  ateqLabelCanvas.height = 256;
  const aCtx = ateqLabelCanvas.getContext('2d')!;
  aCtx.clearRect(0, 0, 1024, 256);
  aCtx.fillStyle = '#cbd5e1';
  aCtx.font = 'bold 14px sans-serif';
  aCtx.textAlign = 'center';
  const labels = ['SUB', 'VOL', 'AUX', 'FADER', '50Hz', '125', '315', '750', '2.2K', '6KHz', '16K'];
  labels.forEach((lbl, idx) => {
    const x = 66 + idx * 89.2;
    aCtx.fillText(lbl, x, 36);
  });
  aCtx.fillStyle = '#94a3b8';
  aCtx.font = 'bold 18px sans-serif';
  aCtx.textAlign = 'right';
  aCtx.fillText('ATEQ 7-BAND', 1004, 232);
  const ateqLabelTex = trackTex(new THREE.CanvasTexture(ateqLabelCanvas));
  ateqLabelTex.colorSpace = THREE.SRGBColorSpace;
  ateqLabelTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Root 3D Rack Assembly
  const rackGroup = new THREE.Group();
  scene.add(rackGroup);

  const interactables: THREE.Object3D[] = [];
  const registerInteractive = (mesh: THREE.Object3D, action: InteractiveAction) => {
    mesh.layers.enable(1);
    mesh.userData.action = action;
    interactables.push(mesh);
  };

  // 1. Main Rack Chassis & Side Rails (multi-part silhouette)
  const chassisMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.45, 3.65, 0.52)), rackMat);
  chassisMesh.position.set(0, 0, -0.22);
  chassisMesh.castShadow = !isSoftwareGl;
  chassisMesh.receiveShadow = !isSoftwareGl;
  rackGroup.add(chassisMesh);

  const railGeo = trackGeo(new THREE.BoxGeometry(0.14, 3.74, 0.58));
  [-1.76, 1.76].forEach((x) => {
    const rail = new THREE.Mesh(railGeo, bezelMat);
    rail.position.set(x, 0, -0.18);
    rackGroup.add(rail);
  });

  // 1b. Outer Case Frame Variants ('square' | 'rounded' | 'bevel') matching reference aesthetic
  const caseMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0b0f19,
      roughness: 0.36,
      metalness: 0.55,
    })
  );

  // Square sharp frame
  const caseSquareGroup = new THREE.Group();
  const sqTopBotGeo = trackGeo(new THREE.BoxGeometry(3.86, 0.14, 0.64));
  const sqSideGeo = trackGeo(new THREE.BoxGeometry(0.14, 3.92, 0.64));
  [-1.94, 1.94].forEach((y) => {
    const bar = new THREE.Mesh(sqTopBotGeo, caseMat);
    bar.position.set(0, y, -0.16);
    caseSquareGroup.add(bar);
  });
  [-1.88, 1.88].forEach((x) => {
    const side = new THREE.Mesh(sqSideGeo, caseMat);
    side.position.set(x, 0, -0.16);
    caseSquareGroup.add(side);
  });
  rackGroup.add(caseSquareGroup);

  // Rounded tubular case frame
  const caseRoundedGroup = new THREE.Group();
  const rPipeH = trackGeo(new THREE.CylinderGeometry(0.085, 0.085, 3.66, 16));
  const rPipeV = trackGeo(new THREE.CylinderGeometry(0.085, 0.085, 3.84, 16));
  const rCornerGeo = trackGeo(new THREE.SphereGeometry(0.11, 16, 16));
  [-1.94, 1.94].forEach((y) => {
    const bar = new THREE.Mesh(rPipeH, caseMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, y, -0.14);
    caseRoundedGroup.add(bar);
  });
  [-1.88, 1.88].forEach((x) => {
    const side = new THREE.Mesh(rPipeV, caseMat);
    side.position.set(x, 0, -0.14);
    caseRoundedGroup.add(side);
  });
  (
    [
      [-1.88, 1.94],
      [1.88, 1.94],
      [-1.88, -1.94],
      [1.88, -1.94],
    ] as [number, number][]
  ).forEach(([cx, cy]) => {
    const corner = new THREE.Mesh(rCornerGeo, accentRingMat);
    corner.position.set(cx, cy, -0.12);
    caseRoundedGroup.add(corner);
  });
  rackGroup.add(caseRoundedGroup);

  // Bevel chamfered competition frame
  const caseBevelGroup = new THREE.Group();
  const bevH = trackGeo(new THREE.BoxGeometry(3.48, 0.14, 0.66));
  const bevV = trackGeo(new THREE.BoxGeometry(0.14, 3.48, 0.66));
  const bevCornerGeo = trackGeo(new THREE.BoxGeometry(0.36, 0.14, 0.68));
  [-1.94, 1.94].forEach((y) => {
    const bar = new THREE.Mesh(bevH, caseMat);
    bar.position.set(0, y, -0.15);
    caseBevelGroup.add(bar);
  });
  [-1.88, 1.88].forEach((x) => {
    const side = new THREE.Mesh(bevV, caseMat);
    side.position.set(x, 0, -0.15);
    caseBevelGroup.add(side);
  });
  (
    [
      [-1.78, 1.84, Math.PI / 4],
      [1.78, 1.84, -Math.PI / 4],
      [-1.78, -1.84, -Math.PI / 4],
      [1.78, -1.84, Math.PI / 4],
    ] as [number, number, number][]
  ).forEach(([cx, cy, rz]) => {
    const gusset = new THREE.Mesh(bevCornerGeo, accentRingMat);
    gusset.position.set(cx, cy, -0.13);
    gusset.rotation.z = rz;
    caseBevelGroup.add(gusset);
  });
  rackGroup.add(caseBevelGroup);

  // 1c. Dark Studio Tripod Pedestal Stand (below rackGroup)
  const standGroup = new THREE.Group();
  const standMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x111520,
      roughness: 0.48,
      metalness: 0.65,
    })
  );
  const standCollar = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.24, 0.28, 0.18, 20)),
    bezelMat
  );
  standCollar.position.set(0, -2.06, -0.18);
  standGroup.add(standCollar);

  const standShaft = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.1, 0.12, 0.88, 16)),
    standMat
  );
  standShaft.position.set(0, -2.52, -0.18);
  standGroup.add(standShaft);

  const legGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.065, 1.15, 12));
  [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach((ang) => {
    const leg = new THREE.Mesh(legGeo, standMat);
    leg.position.set(Math.sin(ang) * 0.42, -2.88, -0.18 + Math.cos(ang) * 0.42);
    leg.rotation.z = -Math.sin(ang) * 0.62;
    leg.rotation.x = Math.cos(ang) * 0.62;
    standGroup.add(leg);
  });
  rackGroup.add(standGroup);

  // Grounding contact shadow disc below rack / stand
  const shadowDisc = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(2.3, 32)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      })
    )
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.set(0, -2.95, 0.05);
  rackGroup.add(shadowDisc);

  // Corner mounting bolts via InstancedMesh
  const screwGeo = trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.06, 12));
  const screwMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.25 }));
  const screwPositions: [number, number, number][] = [];
  for (let row = -1.6; row <= 1.65; row += 0.65) {
    screwPositions.push([-1.76, row, 0.11], [1.76, row, 0.11]);
  }
  const screwsMesh = new THREE.InstancedMesh(screwGeo, screwMat, screwPositions.length);
  const dummyObj = new THREE.Object3D();
  screwPositions.forEach(([x, y, z], idx) => {
    dummyObj.position.set(x, y, z);
    dummyObj.rotation.set(Math.PI / 2, 0, 0);
    dummyObj.updateMatrix();
    screwsMesh.setMatrixAt(idx, dummyObj.matrix);
  });
  screwsMesh.computeBoundingSphere();
  rackGroup.add(screwsMesh);

  // 2. Top Digital Voltmeter + Meter Pod (Y = +1.48)
  const voltPod = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.26, 0.48, 0.16)), bezelMat);
  voltPod.position.set(0, 1.48, 0.06);
  rackGroup.add(voltPod);

  const voltScreenMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: voltTex,
    })
  );
  const voltScreen = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(3.1, 0.36)), voltScreenMat);
  voltScreen.position.set(0, 1.48, 0.145);
  rackGroup.add(voltScreen);

  // 3. Upper ATEQ Pre-Amp Bar (Y = +0.96)
  const upperAteq = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.26, 0.42, 0.16)), rackMat);
  upperAteq.position.set(0, 0.96, 0.06);
  rackGroup.add(upperAteq);

  const upperKnobGeo = trackGeo(new THREE.CylinderGeometry(0.085, 0.095, 0.11, 20));
  const upperRingGeo = trackGeo(new THREE.TorusGeometry(0.105, 0.012, 8, 24));
  for (let i = 0; i < 8; i++) {
    const x = -1.26 + i * 0.36;
    const ring = new THREE.Mesh(upperRingGeo, accentRingMat);
    ring.position.set(x, 0.96, 0.145);
    rackGroup.add(ring);

    const knob = new THREE.Mesh(upperKnobGeo, darkKnobMat);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(x, 0.96, 0.18);
    rackGroup.add(knob);
  }

  // 4. Pioneer DEH Center Headunit (Y = +0.26)
  const pioneerBezel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.32, 0.86, 0.22)), bezelMat);
  pioneerBezel.position.set(0, 0.26, 0.08);
  rackGroup.add(pioneerBezel);

  // Rotary Aluminum Volume Dial (left side of Pioneer)
  const volumeGroup = new THREE.Group();
  volumeGroup.position.set(-1.02, 0.26, 0.2);
  rackGroup.add(volumeGroup);

  const volHalo = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.25, 0.018, 12, 36)), accentRingMat);
  volumeGroup.add(volHalo);

  const volDial = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.22, 0.23, 0.16, 32)), chromeMat);
  volDial.rotation.x = Math.PI / 2;
  volDial.position.z = 0.06;
  volumeGroup.add(volDial);

  const volNotch = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.025, 0.11, 0.03)),
    accentRingMat
  );
  volNotch.position.set(0, 0.13, 0.145);
  volumeGroup.add(volNotch);
  registerInteractive(volDial, { kind: 'volume', label: 'Perilla Volumen Pioneer (clic/rueda)' });

  // Pioneer SRC (Play/Pause) & BAND/EQ buttons
  const btnGeo = trackGeo(new THREE.BoxGeometry(0.28, 0.14, 0.06));
  const srcBtn = new THREE.Mesh(btnGeo, chromeMat);
  srcBtn.position.set(-0.56, 0.12, 0.21);
  rackGroup.add(srcBtn);
  registerInteractive(srcBtn, { kind: 'play', label: 'SRC: Sonar / Pausar Música' });

  const eqBtn = new THREE.Mesh(btnGeo, bezelMat);
  eqBtn.position.set(-0.56, 0.36, 0.21);
  rackGroup.add(eqBtn);
  registerInteractive(eqBtn, { kind: 'preset', label: 'BAND/EQ: Cambiar Preset' });

  // Pioneer OLED Display (Click to choose folder / songs)
  const oledFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.76, 0.62, 0.06)), rackMat);
  oledFrame.position.set(0.55, 0.26, 0.18);
  rackGroup.add(oledFrame);

  const oledMat = trackMat(new THREE.MeshBasicMaterial({ map: oledTex }));
  const oledScreen = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.66, 0.54)), oledMat);
  oledScreen.position.set(0.55, 0.26, 0.215);
  rackGroup.add(oledScreen);
  registerInteractive(oledScreen, { kind: 'folder', label: 'Pantalla Pioneer: Elegir Carpeta / Canciones' });

  // 5. Middle ATEQ Strip (Y = -0.38)
  const midAteq = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.26, 0.34, 0.16)), rackMat);
  midAteq.position.set(0, -0.38, 0.06);
  rackGroup.add(midAteq);

  const midGlowBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.96, 0.03, 0.03)), accentRingMat);
  midGlowBar.position.set(0, -0.38, 0.145);
  rackGroup.add(midGlowBar);

  // 6. Lower ATEQ 7-Band Equalizer Module (Y = -1.16)
  const lowerAteq = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.32, 1.08, 0.18)), rackMat);
  lowerAteq.position.set(0, -1.16, 0.07);
  rackGroup.add(lowerAteq);

  const labelPlane = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(3.22, 0.9)),
    trackMat(
      new THREE.MeshBasicMaterial({
        map: ateqLabelTex,
        transparent: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    )
  );
  labelPlane.position.set(0, -1.08, 0.165);
  rackGroup.add(labelPlane);

  const eqBandKeys: (keyof EqSettings)[] = [
    'hz50',
    'hz125',
    'hz315',
    'hz750',
    'khz2_2',
    'khz6',
    'khz16',
  ];
  const bandLabels = ['50Hz', '125Hz', '315Hz', '750Hz', '2.2K', '6KHz', '16KHz'];

  interface KnobBinding {
    kind: 'sub' | 'vol2' | 'fader' | 'band';
    bandKey?: keyof EqSettings;
    group: THREE.Group;
  }
  const knobBindings: KnobBinding[] = [];
  const lowerKnobGeo = trackGeo(new THREE.CylinderGeometry(0.088, 0.098, 0.14, 24));
  const lowerRingGeo = trackGeo(new THREE.TorusGeometry(0.108, 0.013, 8, 24));
  const notchGeo = trackGeo(new THREE.BoxGeometry(0.018, 0.055, 0.025));

  for (let i = 0; i < 11; i++) {
    const x = -1.47 + i * 0.294;
    const y = -1.18;

    if (i === 2) {
      // AUX S/W push button + status LED
      const auxBtn = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.078, 0.082, 0.11, 20)),
        chromeMat
      );
      auxBtn.rotation.x = Math.PI / 2;
      auxBtn.position.set(x, y, 0.18);
      rackGroup.add(auxBtn);
      registerInteractive(auxBtn, { kind: 'aux', label: 'AUX S/W: Activar / Bypass EQ' });

      const auxLed = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.026, 12, 12)), auxLedMat);
      auxLed.position.set(x, y + 0.15, 0.18);
      rackGroup.add(auxLed);
      continue;
    }

    const ring = new THREE.Mesh(lowerRingGeo, accentRingMat);
    ring.position.set(x, y, 0.165);
    rackGroup.add(ring);

    const kGroup = new THREE.Group();
    kGroup.position.set(x, y, 0.18);
    rackGroup.add(kGroup);

    const knobMesh = new THREE.Mesh(lowerKnobGeo, darkKnobMat);
    knobMesh.rotation.x = Math.PI / 2;
    knobMesh.position.z = 0.04;
    kGroup.add(knobMesh);

    const marker = new THREE.Mesh(notchGeo, chromeMat);
    marker.position.set(0, 0.052, 0.115);
    kGroup.add(marker);

    if (i === 0) {
      knobBindings.push({ kind: 'sub', group: kGroup });
      registerInteractive(knobMesh, { kind: 'sub', label: 'Perilla SUB LEVEL (clic/rueda)' });
    } else if (i === 1) {
      knobBindings.push({ kind: 'vol2', group: kGroup });
      registerInteractive(knobMesh, { kind: 'volume', label: 'Perilla VOLUME ATEQ (clic/rueda)' });
    } else if (i === 3) {
      knobBindings.push({ kind: 'fader', group: kGroup });
    } else {
      const bandIdx = i - 4;
      const bandKey = eqBandKeys[bandIdx];
      knobBindings.push({ kind: 'band', bandKey, group: kGroup });
      registerInteractive(knobMesh, {
        kind: 'band',
        bandKey,
        label: `Banda ${bandLabels[bandIdx]} (clic/rueda)`,
      });
    }
  }

  let state: Radio3DStateSnapshot = { ...initialState };
  let activeTransition: {
    targetPos: THREE.Vector3;
    targetLook: THREE.Vector3;
  } | null = null;

  const updateVoltCanvas = (nowSec: number) => {
    voltCtx.fillStyle = '#050811';
    voltCtx.fillRect(0, 0, 512, 128);

    // Subtle border
    voltCtx.strokeStyle = state.accentColor;
    voltCtx.lineWidth = 3;
    voltCtx.strokeRect(4, 4, 504, 120);

    // Voltage digital readout
    const lowV = state.voltage < 12.2;
    voltCtx.fillStyle = lowV ? '#f59e0b' : state.accentColor;
    voltCtx.font = 'bold 56px monospace';
    voltCtx.textAlign = 'left';
    voltCtx.fillText(`${state.voltage.toFixed(1)}V`, 20, 74);

    // Peak dB badge
    voltCtx.fillStyle = state.isClipping ? '#ef4444' : '#38bdf8';
    voltCtx.font = 'bold 42px monospace';
    voltCtx.textAlign = 'right';
    voltCtx.fillText(`${state.currentDb} dB`, 492, 62);

    // Live stereo VU meter bar
    const m = metricsRef.current;
    const barCount = 16;
    const activeBars = state.isPlaying
      ? Math.round(Math.min(1, m.overall * 1.15 + Math.sin(nowSec * 8) * 0.06) * barCount)
      : 1;
    for (let b = 0; b < barCount; b++) {
      const bx = 220 + b * 17;
      const on = b < activeBars;
      voltCtx.fillStyle = !on
        ? '#1e293b'
        : b > 12
          ? '#ef4444'
          : b > 9
            ? '#f59e0b'
            : '#22c55e';
      voltCtx.fillRect(bx, 86, 12, 24);
    }
    voltTex.needsUpdate = true;
  };

  const updateOledCanvas = (nowSec: number) => {
    oledCtx.fillStyle = '#060c18';
    oledCtx.fillRect(0, 0, 640, 220);

    // Top OLED status row
    oledCtx.fillStyle = state.accentColor;
    oledCtx.font = 'bold 20px monospace';
    oledCtx.textAlign = 'left';
    oledCtx.fillText(state.isPlaying ? 'USB · SONANDO' : 'CD / USB · PAUSA', 20, 34);

    oledCtx.fillStyle = state.eq.eqBypass ? '#94a3b8' : '#22c55e';
    oledCtx.textAlign = 'right';
    const dspBadge = !state.eq.crossoverEnabled
      ? 'OFF'
      : state.eq.dspMode === 'processor'
        ? 'PROC'
        : 'XOVER';
    oledCtx.fillText(
      `AUX:${state.eq.eqBypass ? 'OFF' : 'ON'}  DSP:${dspBadge}`,
      620,
      34
    );

    // Main title ("ELEGIR CARPETA" or active track)
    oledCtx.fillStyle = '#f8fafc';
    oledCtx.font = 'bold 34px sans-serif';
    oledCtx.textAlign = 'left';
    const mainLabel =
      state.isPlaying && state.trackTitle
        ? `▶ ${state.trackTitle}`.slice(0, 26)
        : 'ELEGIR CARPETA';
    oledCtx.fillText(mainLabel, 20, 88);

    // Volume & sub status
    oledCtx.fillStyle = '#94a3b8';
    oledCtx.font = 'bold 20px monospace';
    const volText = state.eq.muted
      ? 'MUTE ACTIVO'
      : state.streamingMode
        ? 'MODO STREAM · VOL •••'
        : `VOL ${state.eq.volume}%  ·  SUB ${state.eq.subLevel}%`;
    oledCtx.fillText(volText, 20, 126);

    // Live 24-bar OLED spectrum
    const m = metricsRef.current;
    const bars = 24;
    for (let i = 0; i < bars; i++) {
      const ratio = i / bars;
      const bandVal = !state.isPlaying
        ? 0.08
        : ratio < 0.35
          ? m.bassEnergy
          : ratio < 0.7
            ? m.voiceEnergy
            : m.driverEnergy;
      const wave = 0.45 + 0.55 * Math.abs(Math.sin(nowSec * 9 + i * 0.6));
      const h = Math.max(6, Math.round(bandVal * wave * 64));
      oledCtx.fillStyle =
        ratio < 0.35 ? state.accentColor : ratio < 0.7 ? '#38bdf8' : '#f59e0b';
      oledCtx.fillRect(20 + i * 25, 204 - h, 18, h);
    }
    oledTex.needsUpdate = true;
  };

  const applyStaticStateToMeshes = () => {
    _colorTmp.set(state.accentColor);
    accentRingMat.color.copy(_colorTmp);
    accentRingMat.emissive.copy(_colorTmp);
    accentPoint.color.copy(_colorTmp);

    // Apply case shape & tripod stand visibility
    caseSquareGroup.visible = state.rackShape === 'square';
    caseRoundedGroup.visible = state.rackShape === 'rounded';
    caseBevelGroup.visible = state.rackShape === 'bevel';
    standGroup.visible = state.showStand !== false;
    shadowDisc.position.y = state.showStand !== false ? -2.95 : -2.04;

    // Apply selected rack finish to chassis & bezel materials
    if (state.rackFinish === 'carbon') {
      rackMat.color.setHex(0x0d1118);
      rackMat.roughness = 0.62;
      rackMat.metalness = 0.34;
      rackMat.bumpScale = 0.012;
      bezelMat.color.setHex(0x141923);
      caseMat.color.setHex(0x0a0d14);
      accentRingMat.emissiveIntensity = 0.78;
    } else if (state.rackFinish === 'wood') {
      rackMat.color.setHex(0x3b2314);
      rackMat.roughness = 0.56;
      rackMat.metalness = 0.14;
      rackMat.bumpScale = 0.015;
      bezelMat.color.setHex(0x24150c);
      caseMat.color.setHex(0x2b170b);
      accentRingMat.emissiveIntensity = 0.72;
    } else if (state.rackFinish === 'neon') {
      rackMat.color.setHex(0x070a14);
      rackMat.roughness = 0.22;
      rackMat.metalness = 0.72;
      rackMat.bumpScale = 0.005;
      bezelMat.color.setHex(0x0f172a);
      caseMat.color.setHex(0x060913);
      accentRingMat.emissiveIntensity = 1.25;
    } else {
      rackMat.color.setHex(0x131926);
      rackMat.roughness = 0.38;
      rackMat.metalness = 0.82;
      rackMat.bumpScale = 0.008;
      bezelMat.color.setHex(0x1d2536);
      caseMat.color.setHex(0x111724);
      accentRingMat.emissiveIntensity = 0.75;
    }

    auxLedMat.color.setHex(state.eq.eqBypass ? 0x475569 : 0x22c55e);
    auxLedMat.emissive.setHex(state.eq.eqBypass ? 0x1e293b : 0x22c55e);

    // Volume dial angle (-135deg to +135deg)
    const volRad = -THREE.MathUtils.degToRad((state.eq.volume / 100) * 270 - 135);
    volumeGroup.rotation.z = volRad;

    for (const kb of knobBindings) {
      let norm = 0.5;
      if (kb.kind === 'sub') norm = state.eq.subLevel / 100;
      else if (kb.kind === 'vol2') norm = state.eq.volume / 100;
      else if (kb.kind === 'fader') norm = (state.eq.fader + 50) / 100;
      else if (kb.kind === 'band' && kb.bandKey) {
        norm = ((state.eq[kb.bandKey] as number) + 12) / 24;
      }
      kb.group.rotation.z = -THREE.MathUtils.degToRad(norm * 270 - 135);
    }
  };

  applyStaticStateToMeshes();
  updateVoltCanvas(0);
  updateOledCanvas(0);

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // Rendering & Frame Pacing
  let frameId = 0;
  let renderBusy = false;
  let renderDirty = false;
  let disposed = false;
  let lastHudRedrawMs = 0;
  let lastTimeMs = performance.now();

  function afterDraw(cb: () => void) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    } else {
      frameId = window.setTimeout(cb, 80);
    }
  }

  function stepAndDraw(nowMs: number) {
    const dt = Math.min(0.1, Math.max(0.001, (nowMs - lastTimeMs) / 1000));
    lastTimeMs = nowMs;
    const elapsed = nowMs / 1000;

    if (activeTransition) {
      const alpha = 1 - Math.exp(-7.5 * dt);
      camera.position.lerp(activeTransition.targetPos, alpha);
      controls.target.lerp(activeTransition.targetLook, alpha);
      if (
        camera.position.distanceTo(activeTransition.targetPos) < 0.015 &&
        controls.target.distanceTo(activeTransition.targetLook) < 0.015
      ) {
        camera.position.copy(activeTransition.targetPos);
        controls.target.copy(activeTransition.targetLook);
        activeTransition = null;
      }
    }

    // Keep 3D rack chassis rock-solid stationary while pulsing studio accent lighting
    rackGroup.position.set(0, 0, 0);
    if (state.isPlaying) {
      const m = metricsRef.current;
      accentPoint.intensity = 1.15 + m.bassEnergy * 0.95;
    } else {
      accentPoint.intensity = 1.25;
    }

    if (nowMs - lastHudRedrawMs > 90) {
      lastHudRedrawMs = nowMs;
      updateVoltCanvas(elapsed);
      updateOledCanvas(elapsed);
    }

    controls.update();
    renderer.render(scene, camera);
  }

  function requestRender() {
    if (disposed) return;
    if (renderBusy) {
      renderDirty = true;
      return;
    }
    renderBusy = true;
    frameId = requestAnimationFrame((nowMs) => {
      if (disposed) return;
      renderDirty = false;
      stepAndDraw(nowMs);
      const done = () => {
        renderBusy = false;
        if (!disposed && (renderDirty || activeTransition || state.isPlaying)) {
          requestRender();
        }
      };
      if (isSoftwareGl) afterDraw(done);
      else done();
    });
  }

  // Cancel scripted camera glide if user manually orbits
  const handleControlsStart = () => {
    activeTransition = null;
  };
  const handleControlsChange = () => {
    requestRender();
  };
  controls.addEventListener('start', handleControlsStart);
  controls.addEventListener('change', handleControlsChange);

  // Layer-1 Raycasting Interaction
  const raycaster = new THREE.Raycaster();
  raycaster.layers.set(1);
  const pointerNdc = new THREE.Vector2();
  let pointerDownPos = { x: 0, y: 0 };
  let lastMoveTime = 0;

  const pickTarget = (clientX: number, clientY: number): InteractiveAction | null => {
    const rect = renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(interactables, false);
    if (hits.length === 0) return null;
    return (hits[0].object.userData.action as InteractiveAction) ?? null;
  };

  const onPointerDown = (e: PointerEvent) => {
    pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: PointerEvent) => {
    const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
    if (dist > 6) return; // User was orbiting camera, not clicking control
    const action = pickTarget(e.clientX, e.clientY);
    if (!action) return;

    const dir = e.button === 2 ? -1 : 1;
    if (action.kind === 'volume') callbacks.onVolumeDelta(8 * dir);
    else if (action.kind === 'sub') callbacks.onSubDelta(8 * dir);
    else if (action.kind === 'band') callbacks.onEqBandDelta(action.bandKey, 2 * dir);
    else if (action.kind === 'play') callbacks.onTogglePlay();
    else if (action.kind === 'preset') callbacks.onCyclePreset();
    else if (action.kind === 'aux') callbacks.onToggleAux();
    else if (action.kind === 'folder') callbacks.onOpenFolderChooser();
    requestRender();
  };

  const onPointerMove = (e: PointerEvent) => {
    const now = performance.now();
    if (now - lastMoveTime < 55) return;
    lastMoveTime = now;
    const action = pickTarget(e.clientX, e.clientY);
    renderer.domElement.style.cursor = action ? 'pointer' : 'grab';
    callbacks.onHoverControl(action ? action.label : null);
  };

  const onContextMenu = (e: MouseEvent) => {
    if (pickTarget(e.clientX, e.clientY)) {
      e.preventDefault();
    }
  };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('contextmenu', onContextMenu);

  const handleResize = () => {
    if (disposed) return;
    const w = Math.max(260, mountEl.clientWidth || 380);
    const h = Math.max(260, mountEl.clientHeight || 360);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    requestRender();
  };
  const ro = new ResizeObserver(handleResize);
  ro.observe(mountEl);
  handleResize();

  return {
    updateState(next: Radio3DStateSnapshot) {
      const wasPlaying = state.isPlaying;
      state = next;
      applyStaticStateToMeshes();
      updateVoltCanvas(performance.now() / 1000);
      updateOledCanvas(performance.now() / 1000);
      if (!wasPlaying && next.isPlaying) {
        requestRender();
      } else {
        requestRender();
      }
    },
    setCameraPreset(preset: RadioCameraPreset) {
      const spec = CAMERA_PRESETS[preset];
      activeTransition = {
        targetPos: _vec3A.set(...spec.pos).clone(),
        targetLook: _vec3B.set(...spec.target).clone(),
      };
      requestRender();
    },
    zoomStep(direction: 'in' | 'out') {
      const factor = direction === 'in' ? 0.86 : 1.16;
      const offset = _vec3A.copy(camera.position).sub(controls.target).multiplyScalar(factor);
      const len = THREE.MathUtils.clamp(offset.length(), controls.minDistance, controls.maxDistance);
      offset.normalize().multiplyScalar(len);
      activeTransition = {
        targetPos: _vec3B.copy(controls.target).add(offset).clone(),
        targetLook: controls.target.clone(),
      };
      requestRender();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      controls.removeEventListener('start', handleControlsStart);
      controls.removeEventListener('change', handleControlsChange);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      disposableGeos.forEach((g) => g.dispose());
      disposableMats.forEach((m) => m.dispose());
      disposableTexs.forEach((t) => t.dispose());
      envRt.dispose();
      renderer.dispose();
    },
  };
}
