import { describe, it, expect } from 'vitest'
import {
  PHYSICS_CURRICULUM,
  topicsForLab,
  findTopic,
  suggestNextTopics,
  TOTAL_TOPIC_COUNT,
  type Topic,
} from '../../src/curriculum/physics'

describe('curriculum/physics.ts — 知识图谱', () => {
  // ── topicsForLab ──────────────────────────────────────────────────────────

  describe('topicsForLab', () => {
    it('力学实验室包含知识点', () => {
      const topics = topicsForLab('mechanics')
      expect(topics.length).toBeGreaterThan(0)
      expect(topics.every((t) => t.labSlug === 'mechanics')).toBe(true)
    })

    it('电磁实验室包含知识点', () => {
      const topics = topicsForLab('electromagnetism')
      expect(topics.length).toBeGreaterThan(0)
      expect(topics.every((t) => t.labSlug === 'electromagnetism')).toBe(true)
    })

    it('光学实验室包含知识点', () => {
      const topics = topicsForLab('optics')
      expect(topics.length).toBeGreaterThan(0)
    })

    it('热学实验室包含知识点', () => {
      const topics = topicsForLab('thermal')
      expect(topics.length).toBeGreaterThan(0)
    })

    it('不混入其他实验室的知识点', () => {
      const mechanics = topicsForLab('mechanics')
      const em = topicsForLab('electromagnetism')
      const mechanicsIds = new Set(mechanics.map((t) => t.id))
      expect(em.some((t) => mechanicsIds.has(t.id))).toBe(false)
    })
  })

  // ── findTopic ─────────────────────────────────────────────────────────────

  describe('findTopic', () => {
    it('存在的 topic 返回对象', () => {
      const topic = findTopic('mech.newton-2')
      expect(topic).toBeDefined()
      expect(topic!.title).toBe('牛顿第二定律')
    })

    it('不存在的 topic 返回 undefined', () => {
      expect(findTopic('fake.topic')).toBeUndefined()
    })
  })

  // ── suggestNextTopics ─────────────────────────────────────────────────────

  describe('suggestNextTopics', () => {
    it('零基础力学 → 推荐零前置的基础知识点', () => {
      const next = suggestNextTopics('mechanics', [])
      expect(next.length).toBeGreaterThan(0)
      next.forEach((t) => {
        expect(t.prereq).toHaveLength(0)
      })
    })

    it('掌握匀速直线运动 → 推荐匀变速直线运动', () => {
      const next = suggestNextTopics('mechanics', ['mech.kinematics-uniform'])
      const ids = next.map((t) => t.id)
      expect(ids).toContain('mech.kinematics-uniform-acc')
    })

    it('前置未满足 → 不推荐', () => {
      const next = suggestNextTopics('mechanics', [])
      const ids = next.map((t) => t.id)
      // 牛顿第二定律需要 force-analysis + kinematics-uniform-acc，零基础不应推荐
      expect(ids).not.toContain('mech.newton-2')
    })

    it('按年级排序：高一 < 高二 < 高三', () => {
      const next = suggestNextTopics('mechanics', ['mech.newton-2'])
      const grades = next.map((t) => t.grade)
      // 验证高一在前面
      const firstG1Idx = grades.indexOf('高一')
      const firstG2Idx = grades.indexOf('高二')
      if (firstG1Idx !== -1 && firstG2Idx !== -1) {
        expect(firstG1Idx).toBeLessThan(firstG2Idx)
      }
    })

    it('全掌握 → 返回空数组', () => {
      const allMech = topicsForLab('mechanics')
      const mastered = allMech.map((t) => t.id)
      const next = suggestNextTopics('mechanics', mastered)
      expect(next).toHaveLength(0)
    })

    it('跨实验室前置依赖：洛伦兹力需要力学圆周运动', () => {
      const topic = findTopic('em.lorentz')!
      expect(topic.prereq).toContain('mech.circular')
      // 没掌握 mech.circular 时，不应推荐 em.lorentz
      const next = suggestNextTopics('electromagnetism', ['em.left-hand-rule'])
      const ids = next.map((t) => t.id)
      expect(ids).not.toContain('em.lorentz')
    })

    it('limit 参数生效', () => {
      const next = suggestNextTopics('mechanics', [], 2)
      expect(next.length).toBeLessThanOrEqual(2)
    })
  })

  // ── 数据完整性 ────────────────────────────────────────────────────────────

  describe('PHYSICS_CURRICULUM 完整性', () => {
    it('四个实验室都有知识点', () => {
      const slugs = new Set(PHYSICS_CURRICULUM.map((t) => t.labSlug))
      expect(slugs.has('mechanics')).toBe(true)
      expect(slugs.has('electromagnetism')).toBe(true)
      expect(slugs.has('optics')).toBe(true)
      expect(slugs.has('thermal')).toBe(true)
    })

    it('每个 topic 都有必填字段', () => {
      PHYSICS_CURRICULUM.forEach((t) => {
        expect(t.id).toBeTruthy()
        expect(t.title).toBeTruthy()
        expect(t.summary).toBeTruthy()
        expect(t.grade).toBeTruthy()
        expect(Array.isArray(t.prereq)).toBe(true)
      })
    })

    it('前置依赖引用的 id 必须存在（无孤立引用）', () => {
      const allIds = new Set(PHYSICS_CURRICULUM.map((t) => t.id))
      PHYSICS_CURRICULUM.forEach((t) => {
        t.prereq.forEach((p) => {
          expect(allIds.has(p)).toBe(true)
        })
      })
    })

    it('无重复 id', () => {
      const ids = PHYSICS_CURRICULUM.map((t) => t.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('TOTAL_TOPIC_COUNT 与实际一致', () => {
      expect(TOTAL_TOPIC_COUNT).toBe(PHYSICS_CURRICULUM.length)
    })
  })
})
