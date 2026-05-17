import {
  HandLandmarker,
  FilesetResolver,
  DrawingUtils,
} from '@mediapipe/tasks-vision';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.10/wasm';

const MISS_TOLERANCE_FRAMES = 8; // ~130ms at 60fps — bridge brief detection drops

export class HandTracker {
  constructor(video, overlay) {
    this.video = video;
    this.overlay = overlay;
    this.ctx = overlay.getContext('2d');
    this.landmarker = null;
    this.drawer = null;

    this.lastVideoTime = -1;
    this.lastLandmarks = null;     // cached landmarks from most recent fresh frame
    this.lastRaw = null;           // raw MediaPipe result for drawing
    this.missCount = 0;            // consecutive frames with no detection
  }

  async init() {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    this.drawer = new DrawingUtils(this.ctx);
  }

  async startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false,
    });
    this.video.srcObject = stream;
    await new Promise((res) => { this.video.onloadedmetadata = () => res(); });
    await this.video.play();
    this.overlay.width = this.video.videoWidth;
    this.overlay.height = this.video.videoHeight;
  }

  /**
   * Run detection. Returns one of:
   *   { status: 'noVideo',   landmarks: null }
   *   { status: 'stale',     landmarks: <cached> }   — same video frame as last call
   *   { status: 'fresh',     landmarks: <new> }      — new detection succeeded
   *   { status: 'tolerated', landmarks: <cached> }   — new frame but no hand; within miss tolerance
   *   { status: 'lost',      landmarks: null }       — sustained loss
   */
  detect(timestamp) {
    if (!this.landmarker || !this.video.videoWidth) {
      return { status: 'noVideo', landmarks: null, raw: null };
    }

    // No new video frame — keep last result, do NOT invalidate
    if (this.video.currentTime === this.lastVideoTime) {
      return { status: 'stale', landmarks: this.lastLandmarks, raw: this.lastRaw };
    }
    this.lastVideoTime = this.video.currentTime;

    const result = this.landmarker.detectForVideo(this.video, timestamp);
    if (result.landmarks && result.landmarks.length > 0) {
      this.lastLandmarks = result.landmarks[0];
      this.lastRaw = result;
      this.missCount = 0;
      return { status: 'fresh', landmarks: this.lastLandmarks, raw: result };
    }

    // No detection this frame — tolerate for a short burst before declaring loss
    this.missCount++;
    if (this.missCount <= MISS_TOLERANCE_FRAMES && this.lastLandmarks) {
      return { status: 'tolerated', landmarks: this.lastLandmarks, raw: this.lastRaw };
    }
    this.lastLandmarks = null;
    this.lastRaw = null;
    return { status: 'lost', landmarks: null, raw: result };
  }

  draw(result) {
    const w = this.overlay.width, h = this.overlay.height;
    this.ctx.clearRect(0, 0, w, h);
    if (!result || !result.raw || !result.raw.landmarks) return;
    for (const lm of result.raw.landmarks) {
      this.drawer.drawConnectors(lm, HandLandmarker.HAND_CONNECTIONS, {
        color: '#6cf', lineWidth: 3,
      });
      this.drawer.drawLandmarks(lm, { color: '#ffeb3b', lineWidth: 1, radius: 3 });
    }
  }
}

// ---- Gesture helpers (operate on a single hand's 21-point landmark array) ----

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function fingerExtended(lm, tip, pip) {
  return dist(lm[0], lm[tip]) > dist(lm[0], lm[pip]) * 1.15;
}

function thumbExtended(lm) {
  return dist(lm[4], lm[2]) > dist(lm[3], lm[2]) * 1.15;
}

export function classifyGesture(lm) {
  if (!lm) return { name: 'none' };

  const fingers = [
    fingerExtended(lm, 8, 6),   // index
    fingerExtended(lm, 12, 10), // middle
    fingerExtended(lm, 16, 14), // ring
    fingerExtended(lm, 20, 18), // pinky
  ];
  const tExt = thumbExtended(lm);
  const fingerCount = fingers.filter(Boolean).length + (tExt ? 1 : 0);

  const palmSize = Math.max(1e-4, dist(lm[0], lm[9]));
  const pinchDist = dist(lm[4], lm[8]) / palmSize;

  // Stricter pinch: thumb & index close, index curled in, middle still flexible
  const isPinch = pinchDist < 0.28 && fingers[0] === false;

  const palmIdx = [0, 5, 9, 13, 17];
  let px = 0, py = 0;
  for (const i of palmIdx) { px += lm[i].x; py += lm[i].y; }
  px /= palmIdx.length;
  py /= palmIdx.length;

  let name = 'unknown';
  if (isPinch) name = 'pinch';
  else if (fingerCount >= 4) name = 'open_palm';
  else if (fingerCount <= 1) name = 'fist';

  return { name, palm: { x: px, y: py }, fingerCount, pinchDist };
}
