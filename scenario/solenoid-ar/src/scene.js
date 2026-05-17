import * as THREE from 'three';

const COIL_LENGTH = 4.0;
const COIL_RADIUS = 0.9;
const COIL_TURNS = 10;
const CAMERA_Z = 10;
const CAMERA_FOV = 45;

export class SolenoidScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = null; // transparent — video is behind

    this.camera = new THREE.PerspectiveCamera(
      CAMERA_FOV, canvas.clientWidth / canvas.clientHeight, 0.1, 100
    );
    this.camera.position.set(0, 0, CAMERA_Z);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true, premultipliedAlpha: false,
    });
    this.renderer.setClearColor(0x000000, 0); // fully transparent clear
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(4, 6, 8);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x66aaff, 0.5);
    rim.position.set(-6, -2, 4);
    this.scene.add(rim);

    // Solenoid lives inside an anchor group whose pose is set by hand tracking
    this.anchor = new THREE.Group();
    this.scene.add(this.anchor);

    this.solenoid = new THREE.Group();
    this.anchor.add(this.solenoid);

    this._buildSolenoid();
    this._buildPoles();
    this._buildFieldLines();

    this.currentDirection = 1;
    this.currentMagnitude = 1.0;
    this.time = 0;
    this.anchor.visible = false; // hide until hand detected

    window.addEventListener('resize', () => this._onResize());
  }

  _buildSolenoid() {
    const segPerTurn = 80;
    const totalSeg = COIL_TURNS * segPerTurn;
    const points = [];
    for (let i = 0; i <= totalSeg; i++) {
      const t = i / segPerTurn;
      const x = (i / totalSeg) * COIL_LENGTH - COIL_LENGTH / 2;
      const y = Math.cos(t * Math.PI * 2) * COIL_RADIUS;
      const z = Math.sin(t * Math.PI * 2) * COIL_RADIUS;
      points.push(new THREE.Vector3(x, y, z));
    }
    this.coilCurve = new THREE.CatmullRomCurve3(points);
    const tubeGeom = new THREE.TubeGeometry(this.coilCurve, totalSeg, 0.07, 14, false);
    this.coilMat = new THREE.MeshStandardMaterial({
      color: 0xff8844, metalness: 0.7, roughness: 0.25,
      emissive: new THREE.Color(0x331100),
    });
    this.coil = new THREE.Mesh(tubeGeom, this.coilMat);
    this.solenoid.add(this.coil);

    // Cone arrows flowing along the helix — bigger + brighter for palm scale
    this.currentArrows = new THREE.Group();
    const arrowCount = 8;
    for (let i = 0; i < arrowCount; i++) {
      const geom = new THREE.ConeGeometry(0.16, 0.46, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xfff066, emissive: 0xffaa22, emissiveIntensity: 1.5,
        metalness: 0.4, roughness: 0.25,
      });
      const m = new THREE.Mesh(geom, mat);
      m.userData.phase = i / arrowCount;
      this.currentArrows.add(m);
    }
    this.solenoid.add(this.currentArrows);

    // Big C-shaped circulation arrows wrapping around the coil at 3 places —
    // primary "this is the current direction" cue, very visible at small scale
    this.circulationArrows = new THREE.Group();
    const arcFrac = 0.82;
    const ringR = COIL_RADIUS + 0.22;
    const positionsX = [-1.3, 0, 1.3];
    for (const px of positionsX) {
      const ring = this._makeCirculationArrow(ringR, arcFrac);
      ring.position.x = px;
      this.circulationArrows.add(ring);
    }
    this.solenoid.add(this.circulationArrows);
  }

  _makeCirculationArrow(majorR, arcFrac) {
    const group = new THREE.Group();
    const seg = 64;
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const t = (i / seg) * Math.PI * 2 * arcFrac;
      pts.push(new THREE.Vector3(0, Math.cos(t) * majorR, Math.sin(t) * majorR));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeom = new THREE.TubeGeometry(curve, seg, 0.07, 12, false);
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0xfff066, emissive: 0xffbb33, emissiveIntensity: 1.5,
      metalness: 0.3, roughness: 0.3,
    });
    const tube = new THREE.Mesh(tubeGeom, ribbonMat);
    group.add(tube);

    const endT = Math.PI * 2 * arcFrac;
    const endPos = new THREE.Vector3(0, Math.cos(endT) * majorR, Math.sin(endT) * majorR);
    const endTan = new THREE.Vector3(0, -Math.sin(endT), Math.cos(endT)).normalize();
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.42, 16),
      new THREE.MeshStandardMaterial({
        color: 0xfff066, emissive: 0xffbb33, emissiveIntensity: 1.8,
        metalness: 0.3, roughness: 0.3,
      })
    );
    cone.position.copy(endPos);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), endTan);
    group.add(cone);

    return group;
  }

  _buildPoles() {
    const nGeom = new THREE.SphereGeometry(0.30, 24, 24);
    this.nMesh = new THREE.Mesh(
      nGeom,
      new THREE.MeshStandardMaterial({ color: 0xff3344, emissive: 0x551111, roughness: 0.4 })
    );
    this.nMesh.position.x = COIL_LENGTH / 2 + 0.5;
    this.solenoid.add(this.nMesh);

    this.sMesh = new THREE.Mesh(
      nGeom.clone(),
      new THREE.MeshStandardMaterial({ color: 0x3399ff, emissive: 0x113355, roughness: 0.4 })
    );
    this.sMesh.position.x = -COIL_LENGTH / 2 - 0.5;
    this.solenoid.add(this.sMesh);

    this.nLabel = this._makeTextSprite('N', '#ff7788');
    this.nLabel.position.set(COIL_LENGTH / 2 + 0.5, 0.8, 0);
    this.solenoid.add(this.nLabel);

    this.sLabel = this._makeTextSprite('S', '#77aaff');
    this.sLabel.position.set(-COIL_LENGTH / 2 - 0.5, 0.8, 0);
    this.solenoid.add(this.sLabel);
  }

  _makeTextSprite(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = 'bold 180px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
    ctx.fillText(text, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.85, 0.85, 1);
    sprite.userData.canvas = canvas;
    sprite.userData.ctx = ctx;
    return sprite;
  }

  _setSpriteText(sprite, text, color) {
    const canvas = sprite.userData.canvas;
    const ctx = sprite.userData.ctx;
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = color;
    ctx.font = 'bold 180px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
    ctx.fillText(text, 128, 128);
    sprite.material.map.needsUpdate = true;
  }

  _buildFieldLines() {
    this.fieldGroup = new THREE.Group();
    this.solenoid.add(this.fieldGroup);

    // External magnetic field loops at various angles and radii
    const lineCountPerRing = 12;
    const angles = [];
    for (let i = 0; i < lineCountPerRing; i++) {
      angles.push((i / lineCountPerRing) * Math.PI * 2);
    }
    const radii = [1.3, 1.8, 2.4];

    this.fieldLines = [];
    for (const r of radii) {
      for (const a of angles) {
        const pts = this._loopPoints(r, a);
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({
          color: 0x66ccff, transparent: true,
          opacity: 0.45 - (r - 1.3) * 0.08,
        });
        const line = new THREE.Line(geom, mat);
        line.userData.radius = r;
        this.fieldGroup.add(line);
        this.fieldLines.push(line);
      }
    }

    // Inside axial field lines
    this.innerLines = [];
    const innerCount = 6;
    for (let i = 0; i < innerCount; i++) {
      const a = (i / innerCount) * Math.PI * 2;
      const rr = 0.4;
      const y = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      const pts = [
        new THREE.Vector3(-COIL_LENGTH / 2 - 0.7, y, z),
        new THREE.Vector3(COIL_LENGTH / 2 + 0.7, y, z),
      ];
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: 0x88ddff, transparent: true, opacity: 0.55,
      });
      const line = new THREE.Line(geom, mat);
      this.fieldGroup.add(line);
      this.innerLines.push(line);
    }

    // Particles flowing along the axis
    this.particles = new THREE.Group();
    const partCount = 60;
    const pGeom = new THREE.SphereGeometry(0.04, 8, 8);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xaaeeff, transparent: true });
    for (let i = 0; i < partCount; i++) {
      const p = new THREE.Mesh(pGeom, pMat.clone());
      p.userData.phase = i / partCount;
      p.userData.angle = (i / partCount) * Math.PI * 2 * 3;
      this.particles.add(p);
    }
    this.solenoid.add(this.particles);
  }

  _loopPoints(ringRadius, axisAngle) {
    const pts = [];
    const seg = 96;
    const a = COIL_LENGTH / 2 + 0.7;
    for (let i = 0; i <= seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      const x = Math.cos(t) * a;
      const r = Math.sin(t) * ringRadius;
      const y = Math.cos(axisAngle) * r;
      const z = Math.sin(axisAngle) * r;
      pts.push(new THREE.Vector3(x, y, z));
    }
    return pts;
  }

  /**
   * Anchor the solenoid to a hand pose.
   * @param {THREE.Vector3} worldPos  — center of the palm in world space
   * @param {THREE.Vector3} axisDir   — unit vector along the hand (wrist→middle MCP)
   * @param {number} scale            — uniform scale (palm-size driven)
   */
  setHandAnchor(worldPos, axisDir, scale) {
    this.anchor.visible = true;
    this.anchor.position.copy(worldPos);
    // Orient so solenoid's +X axis aligns with hand axis
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(1, 0, 0),
      axisDir.clone().normalize()
    );
    this.anchor.quaternion.copy(q);
    this.anchor.scale.setScalar(scale);
  }

  hideAnchor() {
    this.anchor.visible = false;
  }

  // World-plane dimensions at z=0 (used by main.js for screen→world mapping)
  getWorldPlaneSize() {
    const halfH = CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
    const halfW = halfH * this.camera.aspect;
    return { halfW, halfH };
  }

  setCurrentMagnitude(mag) {
    this.currentMagnitude = Math.max(0.1, Math.min(2.5, mag));
    for (const l of this.fieldLines) {
      const base = 0.45 - (l.userData.radius - 1.3) * 0.08;
      l.material.opacity = Math.min(1, base + (this.currentMagnitude - 1) * 0.15);
    }
    for (const l of this.innerLines) {
      l.material.opacity = Math.min(1, 0.4 + this.currentMagnitude * 0.25);
    }
    this.coilMat.emissive.setRGB(
      Math.min(1, this.currentMagnitude * 0.5),
      Math.min(1, this.currentMagnitude * 0.18),
      0
    );
  }

  flipCurrent() {
    this.currentDirection *= -1;
    const nIsNorth = this.currentDirection === 1;
    this.nMesh.material.color.set(nIsNorth ? 0xff3344 : 0x3399ff);
    this.nMesh.material.emissive.set(nIsNorth ? 0x551111 : 0x113355);
    this.sMesh.material.color.set(nIsNorth ? 0x3399ff : 0xff3344);
    this.sMesh.material.emissive.set(nIsNorth ? 0x113355 : 0x551111);
    this._setSpriteText(this.nLabel, nIsNorth ? 'N' : 'S', nIsNorth ? '#ff7788' : '#77aaff');
    this._setSpriteText(this.sLabel, nIsNorth ? 'S' : 'N', nIsNorth ? '#77aaff' : '#ff7788');
  }

  update(dt) {
    this.time += dt * Math.max(0.2, this.currentMagnitude) * this.currentDirection;

    // Current arrows flowing along the coil
    const arrows = this.currentArrows.children;
    const flowSpeed = 0.075;
    for (let i = 0; i < arrows.length; i++) {
      const arrow = arrows[i];
      let u = (arrow.userData.phase + this.time * flowSpeed) % 1;
      if (u < 0) u += 1;
      const pos = this.coilCurve.getPointAt(u);
      const tangent = this.coilCurve.getTangentAt(u);
      if (this.currentDirection < 0) tangent.negate();
      arrow.position.copy(pos);
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), tangent.clone().normalize()
      );
      arrow.quaternion.copy(q);
    }

    // Circulation arrows spin around the coil axis — this.time already carries
    // the current direction sign, so reversing current naturally flips spin
    if (this.circulationArrows) {
      const spin = this.time * 0.3;
      const arrows = this.circulationArrows.children;
      for (const a of arrows) a.rotation.x = spin;
    }

    // Axial-flow particles
    const particles = this.particles.children;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      let u = (p.userData.phase + this.time * 0.18) % 1;
      if (u < 0) u += 1;
      const x = u * (COIL_LENGTH + 1.4) - (COIL_LENGTH / 2 + 0.7);
      const r = 0.32;
      const ang = p.userData.angle + this.time * 0.4;
      p.position.set(x, Math.cos(ang) * r, Math.sin(ang) * r);
      const fade = Math.sin(u * Math.PI);
      p.material.opacity = (0.25 + fade * 0.55) * Math.min(1, this.currentMagnitude);
    }

    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }
}
