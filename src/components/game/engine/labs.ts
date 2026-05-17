// ---------------------------------------------------------------------------
// Physics Lab metadata — maps physical room zones to teaching subject domains.
// Used by the tutor chat to inject domain-specific system prompts and topic
// recommendations when a student enters a room.
// ---------------------------------------------------------------------------

import type { RoomZoneId } from './roomZones';

export interface PhysicsLab {
  zoneId: RoomZoneId;
  /** Short Chinese name for UI */
  name: string;
  /** Short English slug for URLs/identifiers */
  slug: string;
  /** Single-emoji icon for headers/badges */
  icon: string;
  /** One-line description shown in tooltip and chat header */
  tagline: string;
  /** Topic IDs (matches future curriculum tree) */
  topics: string[];
  /** Bundled scenario games available from this lab */
  scenarios: Array<{ id: string; title: string; description: string }>;
  /** System prompt seed — tutor persona for this subject */
  systemPrompt: string;
}

export const PHYSICS_LABS: Record<RoomZoneId, PhysicsLab> = {
  'ceo-office': {
    zoneId: 'ceo-office',
    name: '力学实验室',
    slug: 'mechanics',
    icon: '⚙️',
    tagline: '牛顿三定律 · 运动学 · 能量守恒',
    topics: ['kinematics', 'newton-laws', 'energy', 'momentum', 'circular-motion'],
    scenarios: [
      { id: 'traction-game', title: '越野车牵引力', description: '通过换挡操控越野车，理解牵引力 / 摩擦力 / 功率关系' },
    ],
    systemPrompt:
      '你是高中力学实验室的教学助手。专注于运动学、牛顿三定律、能量守恒、动量守恒、圆周运动等主题。\n' +
      '回答要点：\n' +
      '1. 用日常生活的例子帮助学生直观理解抽象概念\n' +
      '2. 数学公式用 LaTeX（行内 $...$，独立 $$...$$）\n' +
      '3. 解题时先画受力分析，再列方程\n' +
      '4. 遇到难点时主动提问检验理解，比如"你觉得这里为什么要用牛顿第二定律？"',
  },

  workspace: {
    zoneId: 'workspace',
    name: '电磁场实验室',
    slug: 'electromagnetism',
    icon: '🧲',
    tagline: '静电场 · 电流 · 磁场 · 电磁感应',
    topics: ['electrostatics', 'current', 'magnetic-field', 'em-induction', 'lenz-law', 'faraday-law'],
    scenarios: [
      { id: 'solenoid-ar', title: '螺线管电磁场 AR', description: '用摄像头识别手势，把螺线管 3D 电磁场叠加到手心，握拳增大电流，捏合反向' },
    ],
    systemPrompt:
      '你是高中电磁学实验室的教学助手。专注于电场、磁场、电磁感应、楞次定律、法拉第电磁感应定律等。\n' +
      '回答要点：\n' +
      '1. 涉及方向时务必说清"右手定则 / 左手定则"的具体握法\n' +
      '2. 公式用 LaTeX：行内 $\\vec{F} = q\\vec{v}\\times\\vec{B}$，独立公式用 $$...$$\n' +
      '3. 鼓励学生使用本实验室的"螺线管 AR"小程序动手感受磁场\n' +
      '4. 遇到电磁感应方向题，强调"磁通量先变多还是变少"的判断顺序',
  },

  meeting: {
    zoneId: 'meeting',
    name: '光学实验室',
    slug: 'optics',
    icon: '🔭',
    tagline: '几何光学 · 波动光学 · 光的本性',
    topics: ['reflection', 'refraction', 'lens-imaging', 'interference', 'diffraction', 'polarization'],
    scenarios: [],
    systemPrompt:
      '你是高中光学实验室的教学助手。专注于反射、折射、透镜成像、干涉、衍射等。\n' +
      '回答要点：\n' +
      '1. 透镜成像题先画光路图，再用 1/u + 1/v = 1/f 计算\n' +
      '2. 折射率题强调"光从光密 → 光疏才有全反射"\n' +
      '3. 干涉题强调"路程差 = nλ 加强，= (n+1/2)λ 减弱"\n' +
      '4. 公式用 LaTeX 渲染',
  },

  kitchen: {
    zoneId: 'kitchen',
    name: '热学实验室',
    slug: 'thermal',
    icon: '🌡️',
    tagline: '分子动理论 · 热力学定律 · 气体状态',
    topics: ['molecular-theory', 'ideal-gas', 'thermo-first-law', 'thermo-second-law', 'phase-change'],
    scenarios: [],
    systemPrompt:
      '你是高中热学实验室的教学助手。专注于分子动理论、理想气体状态方程、热力学第一/第二定律等。\n' +
      '回答要点：\n' +
      '1. 理想气体题先判断哪个量不变（等温/等压/等容），再列方程\n' +
      '2. 热力学第一定律 ΔU = Q + W，注意符号约定\n' +
      '3. 公式用 LaTeX',
  },

  'break-room': {
    zoneId: 'break-room',
    name: '休息区',
    slug: 'lounge',
    icon: '☕',
    tagline: '查看积分 · 跟同学聊天 · 切换实验室',
    topics: [],
    scenarios: [],
    systemPrompt:
      '你是物理学习助手，现在学生在休息区。可以：\n' +
      '1. 回答学生关于学习路径、章节关系的元问题\n' +
      '2. 推荐下一步该学什么\n' +
      '3. 闲聊式地讲讲物理学家小故事，提高兴趣',
  },
};

export function getLabByZone(zoneId: RoomZoneId): PhysicsLab {
  return PHYSICS_LABS[zoneId];
}

export function getLabBySlug(slug: string): PhysicsLab | undefined {
  return Object.values(PHYSICS_LABS).find((lab) => lab.slug === slug);
}

export const ALL_LABS = Object.values(PHYSICS_LABS);
