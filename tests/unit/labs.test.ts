import { describe, it, expect } from 'vitest'
import { PHYSICS_LABS, getLabByZone, getLabBySlug, ALL_LABS } from '../../src/components/game/engine/labs'
import type { RoomZoneId } from '../../src/components/game/engine/roomZones'

describe('engine/labs.ts — 实验室元数据', () => {
  // ── getLabByZone ──────────────────────────────────────────────────────────

  describe('getLabByZone', () => {
    it('力学实验室有正确的中文名称', () => {
      const lab = getLabByZone('ceo-office')
      expect(lab.name).toBe('力学实验室')
      expect(lab.slug).toBe('mechanics')
    })

    it('电磁场实验室有正确的中文名称', () => {
      const lab = getLabByZone('workspace')
      expect(lab.name).toBe('电磁场实验室')
      expect(lab.slug).toBe('electromagnetism')
    })

    it('光学实验室有正确的中文名称', () => {
      const lab = getLabByZone('meeting')
      expect(lab.name).toBe('光学实验室')
      expect(lab.slug).toBe('optics')
    })

    it('热学实验室有正确的中文名称', () => {
      const lab = getLabByZone('kitchen')
      expect(lab.name).toBe('热学实验室')
      expect(lab.slug).toBe('thermal')
    })

    it('休息区有正确的标签', () => {
      const lab = getLabByZone('break-room')
      expect(lab.name).toBe('休息区')
      expect(lab.slug).toBe('lounge')
    })
  })

  // ── getLabBySlug ──────────────────────────────────────────────────────────

  describe('getLabBySlug', () => {
    it('已知 slug 返回 lab', () => {
      expect(getLabBySlug('mechanics')).toBeDefined()
      expect(getLabBySlug('electromagnetism')).toBeDefined()
      expect(getLabBySlug('optics')).toBeDefined()
      expect(getLabBySlug('thermal')).toBeDefined()
      expect(getLabBySlug('lounge')).toBeDefined()
    })

    it('未知 slug 返回 undefined', () => {
      expect(getLabBySlug('fake-lab')).toBeUndefined()
    })
  })

  // ── ALL_LABS ──────────────────────────────────────────────────────────────

  describe('ALL_LABS', () => {
    it('包含 5 个实验室', () => {
      expect(ALL_LABS).toHaveLength(5)
    })

    it('每个实验室都有唯一 slug', () => {
      const slugs = ALL_LABS.map((l) => l.slug)
      expect(new Set(slugs).size).toBe(slugs.length)
    })
  })

  // ── systemPrompt ──────────────────────────────────────────────────────────

  describe('systemPrompt', () => {
    it('每个实验室 systemPrompt 非空', () => {
      ALL_LABS.forEach((lab) => {
        expect(lab.systemPrompt).toBeTruthy()
        expect(lab.systemPrompt.length).toBeGreaterThan(10)
      })
    })

    it('力学 systemPrompt 包含力学关键词', () => {
      const lab = getLabByZone('ceo-office')
      expect(lab.systemPrompt).toContain('牛顿')
    })

    it('电磁 systemPrompt 包含电磁关键词', () => {
      const lab = getLabByZone('workspace')
      expect(lab.systemPrompt).toContain('磁场')
    })

    it('光学 systemPrompt 包含光学关键词', () => {
      const lab = getLabByZone('meeting')
      expect(lab.systemPrompt).toContain('折射')
    })

    it('热学 systemPrompt 包含热学关键词', () => {
      const lab = getLabByZone('kitchen')
      expect(lab.systemPrompt).toContain('理想气体')
    })
  })

  // ── topics 列表 ───────────────────────────────────────────────────────────

  describe('topics', () => {
    it('4 个学术实验室都有 topics', () => {
      const academicZones: RoomZoneId[] = ['ceo-office', 'workspace', 'meeting', 'kitchen']
      academicZones.forEach((zoneId) => {
        const lab = getLabByZone(zoneId)
        expect(lab.topics.length).toBeGreaterThan(0)
      })
    })

    it('休息区 topics 为空', () => {
      const lab = getLabByZone('break-room')
      expect(lab.topics).toHaveLength(0)
    })
  })

  // ── scenarios ─────────────────────────────────────────────────────────────

  describe('scenarios', () => {
    it('力学实验室有越野车牵引力实验', () => {
      const lab = getLabByZone('ceo-office')
      expect(lab.scenarios.length).toBeGreaterThan(0)
      expect(lab.scenarios[0].id).toBe('traction-game')
    })

    it('电磁实验室有螺线管 AR 实验', () => {
      const lab = getLabByZone('workspace')
      expect(lab.scenarios.length).toBeGreaterThan(0)
      expect(lab.scenarios[0].id).toBe('solenoid-ar')
    })

    it('光学实验室暂无实验', () => {
      const lab = getLabByZone('meeting')
      expect(lab.scenarios).toHaveLength(0)
    })
  })
})
