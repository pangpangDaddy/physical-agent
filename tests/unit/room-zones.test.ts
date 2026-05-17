import { describe, it, expect } from 'vitest'
import { getZoneAt, ROOM_ZONES, type RoomZoneId } from '../../src/components/game/engine/roomZones'

describe('engine/roomZones.ts — 区域判定', () => {
  // ── getZoneAt 中心点 ──────────────────────────────────────────────────────

  describe('getZoneAt 中心点', () => {
    it('力学实验室中心 (3, 5) 落在 ceo-office', () => {
      expect(getZoneAt(3, 5)).toBe('ceo-office')
    })

    it('电磁场实验室中心 (15, 6) 落在 workspace', () => {
      expect(getZoneAt(15, 6)).toBe('workspace')
    })

    it('光学实验室中心 (26, 5) 落在 meeting', () => {
      expect(getZoneAt(26, 5)).toBe('meeting')
    })

    it('热学实验室中心 (3, 15) 落在 kitchen', () => {
      expect(getZoneAt(3, 15)).toBe('kitchen')
    })

    it('休息区中心 (15, 16) 落在 break-room', () => {
      expect(getZoneAt(15, 16)).toBe('break-room')
    })
  })

  // ── getZoneAt 边界 ────────────────────────────────────────────────────────

  describe('getZoneAt 边界', () => {
    it('力学实验室边界内 (7, 11) 属于 ceo-office', () => {
      expect(getZoneAt(7, 11)).toBe('ceo-office')
    })

    it('力学实验室边界外 (8, 0) 属于 workspace', () => {
      expect(getZoneAt(8, 0)).toBe('workspace')
    })

    it('电磁场实验室右边界 (22, 5) 属于 workspace', () => {
      expect(getZoneAt(22, 5)).toBe('workspace')
    })

    it('光学实验室左边界 (23, 5) 属于 meeting', () => {
      expect(getZoneAt(23, 5)).toBe('meeting')
    })
  })

  // ── getZoneAt 无区域 ──────────────────────────────────────────────────────

  describe('getZoneAt 无区域', () => {
    it('超出所有 zone 范围返回 null', () => {
      expect(getZoneAt(-1, -1)).toBeNull()
      expect(getZoneAt(100, 100)).toBeNull()
    })
  })

  // ── ROOM_ZONES 完整性 ─────────────────────────────────────────────────────

  describe('ROOM_ZONES 完整性', () => {
    it('包含 5 个区域', () => {
      const zoneIds = Object.keys(ROOM_ZONES) as RoomZoneId[]
      expect(zoneIds).toHaveLength(5)
      expect(zoneIds).toContain('ceo-office')
      expect(zoneIds).toContain('workspace')
      expect(zoneIds).toContain('meeting')
      expect(zoneIds).toContain('kitchen')
      expect(zoneIds).toContain('break-room')
    })

    it('每个 zone 都有 label 和 bounds', () => {
      for (const zone of Object.values(ROOM_ZONES)) {
        expect(zone.label).toBeTruthy()
        expect(zone.bounds.minCol).toBeDefined()
        expect(zone.bounds.maxCol).toBeGreaterThanOrEqual(zone.bounds.minCol)
        expect(zone.bounds.maxRow).toBeGreaterThanOrEqual(zone.bounds.minRow)
      }
    })

    it('每个 zone 都有 waypoints', () => {
      for (const zone of Object.values(ROOM_ZONES)) {
        expect(zone.waypoints.length).toBeGreaterThan(0)
      }
    })

    it('waypoints 在 zone bounds 内', () => {
      for (const zone of Object.values(ROOM_ZONES)) {
        const b = zone.bounds
        zone.waypoints.forEach((wp) => {
          expect(wp.col).toBeGreaterThanOrEqual(b.minCol)
          expect(wp.col).toBeLessThanOrEqual(b.maxCol)
          expect(wp.row).toBeGreaterThanOrEqual(b.minRow)
          expect(wp.row).toBeLessThanOrEqual(b.maxRow)
        })
      }
    })
  })
})
