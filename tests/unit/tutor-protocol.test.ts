import { describe, it, expect } from 'vitest'

// Mirror the regex patterns from TutorPanel.tsx for testing
const POINTS_REGEX = /\[score:\s*(\d+)\s*\]/i
const MASTERED_REGEX = /\[mastered:\s*([a-z0-9._-]+)\s*\]/gi
const MODE_REGEX = /\[mode:\s*[a-z]+\s*\]/gi

function extractMarkers(content: string): { display: string; points: number; mastered: string[] } {
  const pointsMatch = content.match(POINTS_REGEX)
  const masteredMatches = Array.from(content.matchAll(MASTERED_REGEX))
  return {
    display: content
      .replace(POINTS_REGEX, '')
      .replace(MASTERED_REGEX, '')
      .replace(MODE_REGEX, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\n\s*$/g, ''),
    points: pointsMatch ? parseInt(pointsMatch[1], 10) : 0,
    mastered: masteredMatches.map((m) => m[1]),
  }
}

describe('TutorPanel 协议解析（extractMarkers）', () => {
  // ── 纯文本 ────────────────────────────────────────────────────────────────

  describe('纯文本', () => {
    it('无 markers，points=0，display 不变', () => {
      const result = extractMarkers('这是一段普通的回答。')
      expect(result.points).toBe(0)
      expect(result.mastered).toHaveLength(0)
      expect(result.display).toBe('这是一段普通的回答。')
    })
  })

  // ── [score:N] ─────────────────────────────────────────────────────────────

  describe('[score:N]', () => {
    it('解析 [score:30]', () => {
      const result = extractMarkers('回答正确！\n\n[score:30]')
      expect(result.points).toBe(30)
      expect(result.display).toBe('回答正确！')
    })

    it('解析 [score:0]', () => {
      const result = extractMarkers('答错了。\n\n[score:0]')
      expect(result.points).toBe(0)
      // 注意：points=0 时 regex 匹配了但 parseInt 返回 0
    })

    it('解析 [score:20] 有空格', () => {
      const result = extractMarkers('部分正确。\n\n[score: 20]')
      expect(result.points).toBe(20)
    })

    it('不区分大小写', () => {
      const result = extractMarkers('[SCORE:15]')
      expect(result.points).toBe(15)
    })

    it('去除 marker 后 display 干净', () => {
      const result = extractMarkers('你的答案很好。\n\n[score:25]\n继续加油！')
      expect(result.display).toContain('你的答案很好。')
      expect(result.display).toContain('继续加油！')
      expect(result.display).not.toContain('[score')
    })
  })

  // ── [mastered:id] ─────────────────────────────────────────────────────────

  describe('[mastered:id]', () => {
    it('解析单个 [mastered:mech.newton-2]', () => {
      const result = extractMarkers('[mastered:mech.newton-2]')
      expect(result.mastered).toEqual(['mech.newton-2'])
      expect(result.display).toBe('')
    })

    it('解析多个 mastered', () => {
      const result = extractMarkers('[mastered:mech.newton-2]\n[mastered:mech.newton-3]')
      expect(result.mastered).toEqual(['mech.newton-2', 'mech.newton-3'])
    })

    it('解析带连字符的 id', () => {
      const result = extractMarkers('[mastered:em.right-hand-rule]')
      expect(result.mastered).toEqual(['em.right-hand-rule'])
    })

    it('解析带下划线的 id', () => {
      const result = extractMarkers('[mastered:th.ideal_gas]')
      expect(result.mastered).toEqual(['th.ideal_gas'])
    })
  })

  // ── [mode:question] ──────────────────────────────────────────────────────

  describe('[mode:question]', () => {
    it('去除 mode marker', () => {
      const result = extractMarkers('请问：一个物体从 10m 高处自由落体...\n\n[mode:question]')
      expect(result.display).not.toContain('[mode')
      expect(result.display).toContain('请问')
    })
  })

  // ── 混合内容 ──────────────────────────────────────────────────────────────

  describe('混合内容', () => {
    it('同时有 score + mastered + mode', () => {
      const content = '回答正确！\n\n[score:30]\n[mastered:mech.newton-2]\n[mode:question]'
      const result = extractMarkers(content)
      expect(result.points).toBe(30)
      expect(result.mastered).toEqual(['mech.newton-2'])
      expect(result.display).toBe('回答正确！')
    })

    it('score 和 mastered 之间有其他文本', () => {
      const content = '你做得很好！\n\n[score:25]\n\n[mastered:em.coulomb]\n继续保持！'
      const result = extractMarkers(content)
      expect(result.points).toBe(25)
      expect(result.mastered).toEqual(['em.coulomb'])
      expect(result.display).toContain('你做得很好！')
      expect(result.display).toContain('继续保持！')
    })
  })
})
