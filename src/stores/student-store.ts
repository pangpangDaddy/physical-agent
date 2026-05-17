// ---------------------------------------------------------------------------
// Student profile + score store. Persists to localStorage. Single-user MVP;
// multi-user presence will be added later by syncing via WebSocket.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface StudentProfile {
  name: string;
  /** Total points across all labs */
  totalPoints: number;
  /** Per-lab points & mastered topics */
  labs: Record<string, { points: number; masteredTopics: string[] }>;
  /** Free-form completed-scenario log: ["solenoid-ar", ...] */
  completedScenarios: string[];
  /** Quiz history: number of questions attempted, correct */
  quizStats: { attempted: number; correct: number };
}

interface StudentState extends StudentProfile {
  /** Whether onboarding (name capture) has been completed */
  initialized: boolean;
  setName(name: string): void;
  addPoints(labSlug: string, delta: number): void;
  markScenarioComplete(scenarioId: string, pointsAward: number): void;
  recordQuiz(correct: boolean, labSlug: string, pointsAward: number): void;
  markTopicMastered(labSlug: string, topicId: string): void;
  resetProfile(): void;
}

const DEFAULT_PROFILE: StudentProfile = {
  name: '',
  totalPoints: 0,
  labs: {},
  completedScenarios: [],
  quizStats: { attempted: 0, correct: 0 },
};

function ensureLab(labs: StudentProfile['labs'], slug: string) {
  if (!labs[slug]) labs[slug] = { points: 0, masteredTopics: [] };
  return labs[slug];
}

export const useStudentStore = create<StudentState>()(
  persist(
    (set) => ({
      ...DEFAULT_PROFILE,
      initialized: false,

      setName: (name) => set({ name, initialized: true }),

      addPoints: (labSlug, delta) =>
        set((state) => {
          const labs = { ...state.labs };
          ensureLab(labs, labSlug).points += delta;
          return {
            labs,
            totalPoints: state.totalPoints + delta,
          };
        }),

      markScenarioComplete: (scenarioId, pointsAward) =>
        set((state) => {
          if (state.completedScenarios.includes(scenarioId)) return state;
          return {
            completedScenarios: [...state.completedScenarios, scenarioId],
            totalPoints: state.totalPoints + pointsAward,
          };
        }),

      recordQuiz: (correct, labSlug, pointsAward) =>
        set((state) => {
          const labs = { ...state.labs };
          if (correct) ensureLab(labs, labSlug).points += pointsAward;
          return {
            labs,
            quizStats: {
              attempted: state.quizStats.attempted + 1,
              correct: state.quizStats.correct + (correct ? 1 : 0),
            },
            totalPoints: state.totalPoints + (correct ? pointsAward : 0),
          };
        }),

      markTopicMastered: (labSlug, topicId) =>
        set((state) => {
          const labs = { ...state.labs };
          const lab = ensureLab(labs, labSlug);
          if (lab.masteredTopics.includes(topicId)) return state;
          lab.masteredTopics = [...lab.masteredTopics, topicId];
          return { labs };
        }),

      resetProfile: () => set({ ...DEFAULT_PROFILE, initialized: false }),
    }),
    {
      name: 'physics-edu::student',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
