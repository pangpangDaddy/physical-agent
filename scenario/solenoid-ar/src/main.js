import * as THREE from 'three';
import { SolenoidScene } from './scene.js';
import { HandTracker, classifyGesture } from './hands.js';

const sceneCanvas = document.getElementById('scene');
const video = document.getElementById('video');
const overlay = document.getElementById('handsCanvas');
const statusEl = document.getElementById('status');
const handStatusEl = document.getElementById('handStatus');
const gestureNameEl = document.getElementById('gestureName');
const currentDirEl = document.getElementById('currentDir');
const currentMagEl = document.getElementById('currentMag');
const fpsEl = document.getElementById('fps');
const showLandmarksBtn = document.getElementById('showLandmarksBtn');
const flipBtn = document.getElementById('flipBtn');

const sceneObj = new SolenoidScene(sceneCanvas);
const tracker = new HandTracker(video, overlay);

flipBtn.addEventListener('click', () => sceneObj.flipCurrent());
showLandmarksBtn.addEventListener('click', () => {
  overlay.classList.toggle('visible');
  showLandmarksBtn.classList.toggle('active');
});

const GESTURE_LABELS = {
  none: '--',
  unknown: '识别中…',
  open_palm: '五指张开',
  fist: '握拳（强电流）',
  pinch: '捏合（反向）',
};

const STATUS_LABELS = {
  fresh: '已检测',
  stale: '保持',
  tolerated: '短暂丢失',
  lost: '未检测',
  noVideo: '无视频',
};

const PINCH_COOLDOWN_MS = 1000;
const PINCH_HOLD_FRAMES = 2; // require N consecutive fresh frames of pinch

let lastFlipTime = 0;
let smoothedMag = 1.0;

// AR anchor smoothing state (EMA)
const smoothedPos = new THREE.Vector3(0, 0, 0);
const smoothedAxis = new THREE.Vector3(1, 0, 0);
let smoothedScale = 0.5;
let anchorPrimed = false; // becomes true after first fresh detection

// Pinch edge state
let pinchStreak = 0;
let pinchLatched = false; // true while currently pinching

function setStatus(msg, cls = '') {
  statusEl.textContent = msg;
  statusEl.className = cls;
}

async function bootstrap() {
  try {
    setStatus('加载手势识别模型…');
    await tracker.init();
    setStatus('请求摄像头权限…');
    await tracker.startCamera();
    setStatus('运行中 · 把手伸到画面里', 'ok');
  } catch (err) {
    console.error(err);
    setStatus(`初始化失败：${err.message || err}（请通过 localhost/HTTPS 访问并允许摄像头）`, 'error');
  }
  startLoop();
}

let frameCount = 0;
let fpsT0 = performance.now();
let prevT = performance.now();

function startLoop() {
  function loop() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - prevT) / 1000);
    prevT = now;

    let result = { status: 'noVideo', landmarks: null };
    if (tracker.landmarker) {
      result = tracker.detect(now);
    }

    let gesture = { name: 'none' };

    if (result.status === 'fresh') {
      gesture = classifyGesture(result.landmarks);
      applyHandAnchor(result.landmarks);
      handleGesture(gesture, now);
    } else if (
      (result.status === 'stale' || result.status === 'tolerated')
      && result.landmarks
      && anchorPrimed
    ) {
      // Keep showing existing anchor pose — no jitter from null gaps
      // Do NOT re-trigger gesture actions.
      gesture = classifyGesture(result.landmarks);
    } else {
      // lost or noVideo
      sceneObj.hideAnchor();
      anchorPrimed = false;
      pinchStreak = 0;
      pinchLatched = false;
    }

    handStatusEl.textContent = STATUS_LABELS[result.status] || '--';
    handStatusEl.style.color =
      result.status === 'fresh' ? '#8fc'
      : result.status === 'lost' || result.status === 'noVideo' ? '#99b'
      : '#ffd166'; // stale/tolerated

    gestureNameEl.textContent = GESTURE_LABELS[gesture.name] || gesture.name;
    currentDirEl.textContent = sceneObj.currentDirection > 0 ? '→ 正向' : '← 反向';
    currentMagEl.textContent = sceneObj.currentMagnitude.toFixed(2);

    tracker.draw(result);
    sceneObj.update(dt);

    frameCount++;
    if (now - fpsT0 > 1000) {
      const fps = (frameCount * 1000) / (now - fpsT0);
      fpsEl.textContent = fps.toFixed(0);
      frameCount = 0;
      fpsT0 = now;
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function applyHandAnchor(lm) {
  const { halfW, halfH } = sceneObj.getWorldPlaneSize();

  // Palm center: wrist + 4 finger MCPs averaged
  const palmIdx = [0, 5, 9, 13, 17];
  let px = 0, py = 0;
  for (const i of palmIdx) { px += lm[i].x; py += lm[i].y; }
  px /= palmIdx.length;
  py /= palmIdx.length;

  // World position (mirror x to match selfie view)
  const worldX = (0.5 - px) * 2 * halfW;
  const worldY = (0.5 - py) * 2 * halfH;
  const targetPos = new THREE.Vector3(worldX, worldY, 0);

  // Hand axis: wrist → middle MCP (model's +X points to fingertips)
  const dxRaw = lm[9].x - lm[0].x;
  const dyRaw = lm[9].y - lm[0].y;
  const axisX = -dxRaw;
  const axisY = -dyRaw;
  let len = Math.hypot(axisX, axisY);
  if (len < 1e-6) len = 1;
  const targetAxis = new THREE.Vector3(axisX / len, axisY / len, 0);

  // Scale from palm size in normalized video coords
  const palmSize = Math.hypot(dxRaw, dyRaw);
  const palmWorld = palmSize * 2 * halfH;
  const targetScale = Math.max(0.15, Math.min(1.6, (palmWorld * 2.8) / 4.0));

  // EMA smoothing (gentler than before to reduce visible swim)
  const ALPHA_POS = anchorPrimed ? 0.22 : 1.0;
  const ALPHA_AXIS = anchorPrimed ? 0.18 : 1.0;
  const ALPHA_SCALE = anchorPrimed ? 0.18 : 1.0;

  smoothedPos.lerp(targetPos, ALPHA_POS);
  smoothedAxis.lerp(targetAxis, ALPHA_AXIS).normalize();
  smoothedScale = smoothedScale * (1 - ALPHA_SCALE) + targetScale * ALPHA_SCALE;
  anchorPrimed = true;

  sceneObj.setHandAnchor(smoothedPos, smoothedAxis, smoothedScale);
}

function handleGesture(g, nowMs) {
  // Edge-triggered pinch with streak debounce — only fire once per gesture cycle
  if (g.name === 'pinch') {
    pinchStreak++;
    if (
      !pinchLatched
      && pinchStreak >= PINCH_HOLD_FRAMES
      && nowMs - lastFlipTime > PINCH_COOLDOWN_MS
    ) {
      sceneObj.flipCurrent();
      lastFlipTime = nowMs;
      pinchLatched = true;
    }
  } else {
    pinchStreak = 0;
    pinchLatched = false;
  }

  // Magnitude target (smoothed)
  let target;
  if (g.name === 'fist') target = 2.2;
  else if (g.name === 'open_palm') target = 1.0;
  else target = smoothedMag; // pinch / unknown — hold

  smoothedMag = smoothedMag * 0.88 + target * 0.12;
  sceneObj.setCurrentMagnitude(smoothedMag);
}

bootstrap();
