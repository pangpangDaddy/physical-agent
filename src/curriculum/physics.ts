// ---------------------------------------------------------------------------
// 高中物理 知识图谱（高一/高二/高三必修 + 选修核心）
//
// 每个 Topic 节点：
//   id          ─ 全局唯一 id，存到 student.masteredTopics
//   labSlug     ─ 归属哪个实验室（mechanics / electromagnetism / optics / thermal）
//   title       ─ 中文显示名
//   summary     ─ 一句话讲清楚这个知识点
//   grade       ─ 高一/高二/高三标签（用于难度排序）
//   prereq      ─ 学习前需要先掌握的 topic id 列表
//
// 这棵图谱被注入到 TutorPanel 的 system prompt，让助教做到：
//   - 知道学生掌握了什么（recordQuiz → markTopicMastered）
//   - 推荐"下一个该学的"（在 prereq 已满足 + 自己未掌握的节点里选）
//   - 出题时围绕"当前正在学习的"知识点
// ---------------------------------------------------------------------------

export type LabSlug = 'mechanics' | 'electromagnetism' | 'optics' | 'thermal';
export type Grade = '高一' | '高二' | '高三';

export interface Topic {
  id: string;
  labSlug: LabSlug;
  title: string;
  summary: string;
  grade: Grade;
  prereq: string[];
}

export const PHYSICS_CURRICULUM: Topic[] = [
  // ── 力学 ──────────────────────────────────────────────────────────────
  { id: 'mech.kinematics-uniform',  labSlug: 'mechanics', title: '匀速直线运动',  summary: 'v = s/t；速度、位移、时间的关系',  grade: '高一', prereq: [] },
  { id: 'mech.kinematics-uniform-acc', labSlug: 'mechanics', title: '匀变速直线运动', summary: 'v = v0 + at；位移公式 s = v0·t + ½at²；速度-位移公式 v² - v0² = 2as', grade: '高一', prereq: ['mech.kinematics-uniform'] },
  { id: 'mech.free-fall',           labSlug: 'mechanics', title: '自由落体',      summary: '初速度为 0 的匀加速运动，a = g ≈ 9.8 m/s²',         grade: '高一', prereq: ['mech.kinematics-uniform-acc'] },
  { id: 'mech.projectile',          labSlug: 'mechanics', title: '抛体运动',      summary: '水平方向匀速 + 竖直方向自由落体，独立分解',         grade: '高一', prereq: ['mech.kinematics-uniform-acc', 'mech.free-fall'] },
  { id: 'mech.force-analysis',      labSlug: 'mechanics', title: '受力分析',      summary: '隔离法画自由体图：重力、支持力、摩擦力、张力',     grade: '高一', prereq: [] },
  { id: 'mech.newton-1',            labSlug: 'mechanics', title: '牛顿第一定律',  summary: '惯性定律：不受力或合力为 0 时保持原状态',          grade: '高一', prereq: ['mech.force-analysis'] },
  { id: 'mech.newton-2',            labSlug: 'mechanics', title: '牛顿第二定律',  summary: 'F = ma，合力方向 = 加速度方向',                    grade: '高一', prereq: ['mech.force-analysis', 'mech.kinematics-uniform-acc'] },
  { id: 'mech.newton-3',            labSlug: 'mechanics', title: '牛顿第三定律',  summary: '作用力 = -反作用力，等大反向同种性质',             grade: '高一', prereq: ['mech.newton-2'] },
  { id: 'mech.friction',            labSlug: 'mechanics', title: '摩擦力',        summary: '静摩擦 / 滑动摩擦；f = μN',                         grade: '高一', prereq: ['mech.force-analysis'] },
  { id: 'mech.circular',            labSlug: 'mechanics', title: '匀速圆周运动',  summary: '向心力 F = mv²/r = mω²r；向心加速度方向指向圆心',  grade: '高一', prereq: ['mech.newton-2'] },
  { id: 'mech.work-energy',         labSlug: 'mechanics', title: '功与动能定理',  summary: 'W = Fs·cosθ；W合 = ½mv² - ½mv0²',                  grade: '高一', prereq: ['mech.newton-2'] },
  { id: 'mech.energy-conservation', labSlug: 'mechanics', title: '机械能守恒',    summary: '只有重力/弹力做功时，动能 + 势能 = 常量',          grade: '高一', prereq: ['mech.work-energy'] },
  { id: 'mech.momentum',            labSlug: 'mechanics', title: '动量与冲量',    summary: 'p = mv；冲量 I = Ft = Δp',                          grade: '高二', prereq: ['mech.newton-2'] },
  { id: 'mech.momentum-conservation', labSlug: 'mechanics', title: '动量守恒',    summary: '系统不受外力时总动量保持不变；碰撞 / 反冲',         grade: '高二', prereq: ['mech.momentum'] },
  { id: 'mech.gravitation',         labSlug: 'mechanics', title: '万有引力',      summary: 'F = G·m₁m₂/r²；卫星、第一宇宙速度',                grade: '高一', prereq: ['mech.circular', 'mech.newton-2'] },

  // ── 电磁 ──────────────────────────────────────────────────────────────
  { id: 'em.coulomb',               labSlug: 'electromagnetism', title: '库仑定律',     summary: 'F = k·q₁q₂/r²；同性相斥异性相吸',         grade: '高二', prereq: [] },
  { id: 'em.electric-field',        labSlug: 'electromagnetism', title: '电场与电场强度', summary: 'E = F/q；点电荷 E = kQ/r²；场线方向 = 正电荷受力方向', grade: '高二', prereq: ['em.coulomb'] },
  { id: 'em.potential',             labSlug: 'electromagnetism', title: '电势与电势差', summary: 'U = W电场力/q；沿电场线方向电势降低',     grade: '高二', prereq: ['em.electric-field'] },
  { id: 'em.capacitor',             labSlug: 'electromagnetism', title: '电容器',       summary: 'C = Q/U；平行板 C = εS/(4πkd)',           grade: '高二', prereq: ['em.potential'] },
  { id: 'em.ohm',                   labSlug: 'electromagnetism', title: '欧姆定律',     summary: 'I = U/R；R = ρL/S',                       grade: '高二', prereq: [] },
  { id: 'em.circuit',               labSlug: 'electromagnetism', title: '串并联与电功率', summary: 'P = UI = I²R；串联分压、并联分流',       grade: '高二', prereq: ['em.ohm'] },
  { id: 'em.magnetic-field',        labSlug: 'electromagnetism', title: '磁场与磁感应强度', summary: 'B 的方向 = N→S；通电导线、运动电荷在磁场中受力',  grade: '高二', prereq: [] },
  { id: 'em.right-hand-rule',       labSlug: 'electromagnetism', title: '右手定则',     summary: '判断通电螺线管 N 极、感应电流方向的关键工具', grade: '高二', prereq: ['em.magnetic-field'] },
  { id: 'em.left-hand-rule',        labSlug: 'electromagnetism', title: '左手定则',     summary: '判断通电导线 / 运动电荷在磁场中受力方向',  grade: '高二', prereq: ['em.magnetic-field'] },
  { id: 'em.ampere-force',          labSlug: 'electromagnetism', title: '安培力',       summary: 'F = BIL·sinθ',                            grade: '高二', prereq: ['em.left-hand-rule'] },
  { id: 'em.lorentz',               labSlug: 'electromagnetism', title: '洛伦兹力',     summary: 'F = qvB·sinθ；带电粒子在磁场中做圆周运动', grade: '高二', prereq: ['em.left-hand-rule', 'mech.circular'] },
  { id: 'em.faraday',               labSlug: 'electromagnetism', title: '法拉第电磁感应', summary: 'ε = -dΦ/dt；产生感应电动势的条件',       grade: '高二', prereq: ['em.magnetic-field'] },
  { id: 'em.lenz',                  labSlug: 'electromagnetism', title: '楞次定律',     summary: '感应电流的磁场总是"阻碍"原磁通量的变化',  grade: '高二', prereq: ['em.faraday', 'em.right-hand-rule'] },
  { id: 'em.ac',                    labSlug: 'electromagnetism', title: '交流电',       summary: '正弦交流 e = Em·sin(ωt)；有效值 U = Um/√2', grade: '高二', prereq: ['em.faraday'] },

  // ── 光学 ──────────────────────────────────────────────────────────────
  { id: 'opt.reflection',           labSlug: 'optics', title: '光的反射',       summary: '入射角 = 反射角；镜面反射 vs 漫反射',           grade: '高一', prereq: [] },
  { id: 'opt.refraction',           labSlug: 'optics', title: '光的折射',       summary: 'n = sin θ₁ / sin θ₂；从光疏到光密折射角变小',   grade: '高一', prereq: ['opt.reflection'] },
  { id: 'opt.total-reflection',     labSlug: 'optics', title: '全反射',         summary: '从光密射向光疏 + 入射角 > 临界角时发生',         grade: '高一', prereq: ['opt.refraction'] },
  { id: 'opt.lens',                 labSlug: 'optics', title: '透镜成像',       summary: '凸透镜成像规律；1/u + 1/v = 1/f',               grade: '高一', prereq: ['opt.refraction'] },
  { id: 'opt.interference',         labSlug: 'optics', title: '光的干涉',       summary: '路程差 = nλ 加强，= (n+½)λ 减弱；双缝实验',     grade: '高三', prereq: ['opt.refraction'] },
  { id: 'opt.diffraction',          labSlug: 'optics', title: '光的衍射',       summary: '波遇到障碍物时绕过的现象；单缝衍射图样',         grade: '高三', prereq: ['opt.interference'] },
  { id: 'opt.polarization',         labSlug: 'optics', title: '光的偏振',       summary: '横波特性；自然光通过偏振片后变为线偏振光',       grade: '高三', prereq: ['opt.interference'] },

  // ── 热学 ──────────────────────────────────────────────────────────────
  { id: 'th.molecular',             labSlug: 'thermal', title: '分子动理论',     summary: '物质由分子组成；分子永不停息地热运动；分子间有引力和斥力', grade: '高二', prereq: [] },
  { id: 'th.temperature',           labSlug: 'thermal', title: '温度与内能',     summary: '温度是分子平均动能的标志；内能 = 分子动能 + 分子势能',  grade: '高二', prereq: ['th.molecular'] },
  { id: 'th.ideal-gas-isothermal',  labSlug: 'thermal', title: '等温变化 (玻意耳定律)', summary: 'pV = 常量',                              grade: '高二', prereq: ['th.molecular'] },
  { id: 'th.ideal-gas-isobaric',    labSlug: 'thermal', title: '等压变化 (盖·吕萨克定律)', summary: 'V/T = 常量',                          grade: '高二', prereq: ['th.molecular'] },
  { id: 'th.ideal-gas-isochoric',   labSlug: 'thermal', title: '等容变化 (查理定律)', summary: 'p/T = 常量',                              grade: '高二', prereq: ['th.molecular'] },
  { id: 'th.ideal-gas-combined',    labSlug: 'thermal', title: '理想气体状态方程', summary: 'pV/T = 常量；适用于一定质量的理想气体',         grade: '高二', prereq: ['th.ideal-gas-isothermal', 'th.ideal-gas-isobaric', 'th.ideal-gas-isochoric'] },
  { id: 'th.first-law',             labSlug: 'thermal', title: '热力学第一定律', summary: 'ΔU = Q + W；正负号约定要记牢',                  grade: '高二', prereq: ['th.temperature'] },
  { id: 'th.second-law',            labSlug: 'thermal', title: '热力学第二定律', summary: '热量不能自发地从低温物体传向高温物体；熵增原理', grade: '高二', prereq: ['th.first-law'] },
];

export function topicsForLab(labSlug: LabSlug): Topic[] {
  return PHYSICS_CURRICULUM.filter((t) => t.labSlug === labSlug);
}

export function findTopic(id: string): Topic | undefined {
  return PHYSICS_CURRICULUM.find((t) => t.id === id);
}

/**
 * Suggest next topics for a student in a given lab.
 * Returns topics whose prereqs are all mastered but the topic itself is not yet mastered.
 * Sorted by grade (高一 < 高二 < 高三) so foundations come first.
 */
export function suggestNextTopics(
  labSlug: LabSlug,
  masteredTopics: string[],
  limit = 5,
): Topic[] {
  const masteredSet = new Set(masteredTopics);
  const gradeOrder = { '高一': 0, '高二': 1, '高三': 2 } as const;
  return topicsForLab(labSlug)
    .filter((t) => !masteredSet.has(t.id))
    .filter((t) => t.prereq.every((p) => masteredSet.has(p)))
    .sort((a, b) => gradeOrder[a.grade] - gradeOrder[b.grade])
    .slice(0, limit);
}

/** Topics the student has mastered across all labs. */
export function masteredTopicCount(labs: Record<string, { masteredTopics: string[] }>): number {
  return Object.values(labs).reduce((sum, lab) => sum + (lab.masteredTopics?.length ?? 0), 0);
}

export const TOTAL_TOPIC_COUNT = PHYSICS_CURRICULUM.length;
