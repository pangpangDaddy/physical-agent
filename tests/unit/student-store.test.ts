import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage for zustand persist
const storage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value },
  removeItem: (key: string) => { delete storage[key] },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]) },
  length: 0,
  key: () => null,
})

// Import after mocking
import { useStudentStore } from '../../src/stores/student-store'

describe('stores/student-store.ts — 学生档案', () => {
  beforeEach(() => {
    // Reset store and mock storage between tests
    useStudentStore.getState().resetProfile()
    Object.keys(storage).forEach((k) => delete storage[k])
  })

  // ── setName ───────────────────────────────────────────────────────────────

  describe('setName', () => {
    it('设置名字并标记 initialized', () => {
      useStudentStore.getState().setName('小明')
      const state = useStudentStore.getState()
      expect(state.name).toBe('小明')
      expect(state.initialized).toBe(true)
    })
  })

  // ── addPoints ─────────────────────────────────────────────────────────────

  describe('addPoints', () => {
    it('累加 totalPoints 和对应实验室 points', () => {
      const store = useStudentStore.getState()
      store.addPoints('mechanics', 10)
      store.addPoints('mechanics', 20)

      const state = useStudentStore.getState()
      expect(state.totalPoints).toBe(30)
      expect(state.labs['mechanics']?.points).toBe(30)
    })

    it('不同实验室独立计分', () => {
      const store = useStudentStore.getState()
      store.addPoints('mechanics', 10)
      store.addPoints('optics', 15)

      const state = useStudentStore.getState()
      expect(state.totalPoints).toBe(25)
      expect(state.labs['mechanics']?.points).toBe(10)
      expect(state.labs['optics']?.points).toBe(15)
    })

    it('自动创建新实验室记录', () => {
      const store = useStudentStore.getState()
      store.addPoints('thermal', 5)

      const state = useStudentStore.getState()
      expect(state.labs['thermal']).toBeDefined()
      expect(state.labs['thermal']?.points).toBe(5)
    })
  })

  // ── markScenarioComplete ──────────────────────────────────────────────────

  describe('markScenarioComplete', () => {
    it('加入 completedScenarios 并加分', () => {
      const store = useStudentStore.getState()
      store.markScenarioComplete('traction-game', 50)

      const state = useStudentStore.getState()
      expect(state.completedScenarios).toContain('traction-game')
      expect(state.totalPoints).toBe(50)
    })

    it('重复完成不重复加分', () => {
      const store = useStudentStore.getState()
      store.markScenarioComplete('traction-game', 50)
      store.markScenarioComplete('traction-game', 50)

      const state = useStudentStore.getState()
      expect(state.completedScenarios).toHaveLength(1)
      expect(state.totalPoints).toBe(50)
    })
  })

  // ── recordQuiz ────────────────────────────────────────────────────────────

  describe('recordQuiz', () => {
    it('答对 → correct+1, totalPoints+award', () => {
      const store = useStudentStore.getState()
      store.recordQuiz(true, 'mechanics', 30)

      const state = useStudentStore.getState()
      expect(state.quizStats.attempted).toBe(1)
      expect(state.quizStats.correct).toBe(1)
      expect(state.totalPoints).toBe(30)
    })

    it('答错 → attempted+1, 不加 points', () => {
      const store = useStudentStore.getState()
      store.recordQuiz(false, 'mechanics', 0)

      const state = useStudentStore.getState()
      expect(state.quizStats.attempted).toBe(1)
      expect(state.quizStats.correct).toBe(0)
      expect(state.totalPoints).toBe(0)
    })

    it('多次答题累加', () => {
      const store = useStudentStore.getState()
      store.recordQuiz(true, 'mechanics', 30)
      store.recordQuiz(false, 'mechanics', 0)
      store.recordQuiz(true, 'mechanics', 20)

      const state = useStudentStore.getState()
      expect(state.quizStats.attempted).toBe(3)
      expect(state.quizStats.correct).toBe(2)
      expect(state.totalPoints).toBe(50)
    })
  })

  // ── markTopicMastered ─────────────────────────────────────────────────────

  describe('markTopicMastered', () => {
    it('加入 masteredTopics', () => {
      const store = useStudentStore.getState()
      store.markTopicMastered('mechanics', 'mech.newton-2')

      const state = useStudentStore.getState()
      expect(state.labs['mechanics']?.masteredTopics).toContain('mech.newton-2')
    })

    it('重复标记不重复添加', () => {
      const store = useStudentStore.getState()
      store.markTopicMastered('mechanics', 'mech.newton-2')
      store.markTopicMastered('mechanics', 'mech.newton-2')

      const state = useStudentStore.getState()
      expect(state.labs['mechanics']?.masteredTopics).toHaveLength(1)
    })

    it('多个知识点', () => {
      const store = useStudentStore.getState()
      store.markTopicMastered('mechanics', 'mech.newton-2')
      store.markTopicMastered('mechanics', 'mech.newton-3')

      const state = useStudentStore.getState()
      expect(state.labs['mechanics']?.masteredTopics).toEqual(['mech.newton-2', 'mech.newton-3'])
    })
  })

  // ── resetProfile ──────────────────────────────────────────────────────────

  describe('resetProfile', () => {
    it('重置所有数据', () => {
      const store = useStudentStore.getState()
      store.setName('小明')
      store.addPoints('mechanics', 100)
      store.markTopicMastered('mechanics', 'mech.newton-2')
      store.markScenarioComplete('traction-game', 50)

      store.resetProfile()

      const state = useStudentStore.getState()
      expect(state.name).toBe('')
      expect(state.initialized).toBe(false)
      expect(state.totalPoints).toBe(0)
      expect(state.labs).toEqual({})
      expect(state.completedScenarios).toHaveLength(0)
      expect(state.quizStats.attempted).toBe(0)
    })
  })
})
