// ---------------------------------------------------------------------------
// StudentOnboarding — captures the student's name on first visit.
// Mounted at the top of GamePage; closes itself once profile is initialized.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useStudentStore } from '@/stores/student-store';

export default function StudentOnboarding() {
  const initialized = useStudentStore((s) => s.initialized);
  const setName = useStudentStore((s) => s.setName);
  const [draftName, setDraftName] = useState('');

  if (initialized) return null;

  const trimmed = draftName.trim();
  const canSubmit = trimmed.length >= 1 && trimmed.length <= 12;

  const submit = () => {
    if (!canSubmit) return;
    setName(trimmed);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    >
      <div
        className="rounded-md overflow-hidden p-6 font-mono"
        style={{
          width: 'min(90vw, 460px)',
          backgroundColor: '#F5ECD7',
          color: '#3D2B1F',
          border: '4px solid #5C3D2E',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6), inset 0 0 0 2px #C4A265',
        }}
      >
        <h2 className="text-lg font-bold mb-2" style={{ color: '#5C3D2E' }}>
          🎓 欢迎来到物理实验室！
        </h2>
        <p className="text-[12px] mb-4 leading-relaxed" style={{ color: '#4A3328' }}>
          这里有 4 个高中物理实验室：力学、电磁场、光学、热学。<br />
          每个实验室都有一位 AI 助教等着回答你的问题，还有像螺线管 AR 这样的实验小程序可以动手玩。
          <br /><br />
          先告诉我，你叫什么？
        </p>
        <input
          type="text"
          autoFocus
          value={draftName}
          maxLength={12}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="比如：小明 / Alex"
          className="w-full px-3 py-2 text-[13px] mb-3 outline-none"
          style={{
            backgroundColor: '#FFF8E6',
            border: '2px solid #C4A265',
            borderRadius: '2px',
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: '#8B6914' }}>
            12 字以内
          </span>
          <Button type="button" size="sm" onClick={submit} disabled={!canSubmit}>
            开始学习
          </Button>
        </div>
      </div>
    </div>
  );
}
