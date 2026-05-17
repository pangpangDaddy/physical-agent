// ---------------------------------------------------------------------------
// ExperimentsPanel — browse scenario/ subdirectories. Click to launch a
// scenario in the iframe modal (wired up through the parent).
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { PARCHMENT, SectionHeader } from './panelUtils';

interface Experiment {
  slug: string;
  title: string;
  description: string;
}

interface Props {
  onLaunchScenario?: (slug: string) => void;
}

export default function ExperimentsPanel({ onLaunchScenario }: Props) {
  const [experiments, setExperiments] = useState<Experiment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/experiments')
      .then((r) => r.json())
      .then((data) => setExperiments(data.experiments ?? []))
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  if (experiments === null && !error) {
    return <div className="p-4 text-sm font-mono" style={{ color: PARCHMENT.textDim }}>扫描实验中…</div>;
  }
  if (error) {
    return <div className="p-4 text-sm font-mono text-red-700">出错了：{error}</div>;
  }

  return (
    <div className="space-y-4">
      <SectionHeader>🧪 物理实验</SectionHeader>
      {(experiments ?? []).length === 0 && (
        <div className="text-sm font-mono" style={{ color: PARCHMENT.textDim }}>
          scenario/ 里还没有实验小程序。
        </div>
      )}
      <div className="grid grid-cols-1 gap-2">
        {(experiments ?? []).map((ex) => (
          <button
            key={ex.slug}
            type="button"
            onClick={() => onLaunchScenario?.(ex.slug)}
            className="text-left p-3 transition-all hover:shadow-md"
            style={{
              backgroundColor: '#F5ECD7',
              border: `2px solid ${PARCHMENT.border}`,
              borderRadius: '4px',
              color: PARCHMENT.text,
            }}
          >
            <div className="font-bold text-[13px] font-mono mb-1" style={{ color: PARCHMENT.text }}>
              🧪 {ex.title}
            </div>
            {ex.description && (
              <div className="text-[11px] font-mono leading-relaxed" style={{ color: PARCHMENT.textDim }}>
                {ex.description}
              </div>
            )}
            <div className="text-[10px] font-mono mt-2" style={{ color: PARCHMENT.borderDark }}>
              点击进入实验 →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
