import { useCallback, useEffect, useState } from 'react';
import { Users, Maximize2, Minimize2, GraduationCap, BookOpen, FlaskConical } from 'lucide-react';
import { useBadgeCounts } from './hooks/useBadgeCounts';
import { useStudentStore } from '@/stores/student-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HudPanel = 'tutor' | 'team' | 'courses' | 'experiments';

interface GameHeaderProps {
  onPanelRequest?: (panel: HudPanel) => void;
  gameContainerRef?: React.RefObject<HTMLDivElement | null>;
  activePanel?: HudPanel | null;
  workingCount?: number;
  staffCount?: number;
  liveTaskCount?: number;
}

// ---------------------------------------------------------------------------
// Wood / parchment header theme
// ---------------------------------------------------------------------------

const HEADER = {
  bg: '#5C3D2E',           // dark wood
  bgLight: '#6B4C3B',      // lighter wood for hover
  text: '#F5ECD7',          // parchment text
  textDim: '#C4A265',       // gold/muted
  border: '#3D2B1F',        // dark border
  highlight: '#C4A265',     // gold highlight
  buttonBg: '#4A2F20',      // button background
  buttonActive: '#3D2B1F',  // pressed button
  buttonBorder: 'inset -1px -1px 0 0 #2A1A10, inset 1px 1px 0 0 #7A5A42',
  buttonBorderActive: 'inset 1px 1px 0 0 #2A1A10, inset -1px -1px 0 0 #7A5A42',
} as const;

// ---------------------------------------------------------------------------
// HudButton
// ---------------------------------------------------------------------------

interface HudButtonProps {
  icon: React.ReactNode;
  label: string;
  mobileLabel?: string;
  onClick: () => void;
  active?: boolean;
  ariaLabel: string;
  badge?: number;
  glow?: boolean;
}

function HudButton({ icon, label, mobileLabel, onClick, active, ariaLabel, badge, glow }: HudButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 font-mono text-[13px] sm:text-[12px] select-none transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      style={{
        backgroundColor: active ? HEADER.buttonActive : HEADER.buttonBg,
        color: active ? HEADER.highlight : HEADER.text,
        imageRendering: 'pixelated',
        borderRadius: '2px',
        boxShadow: [
          active ? HEADER.buttonBorderActive : HEADER.buttonBorder,
          glow ? `0 0 8px ${HEADER.highlight}40` : '',
        ].filter(Boolean).join(', '),
        ...(active ? { textShadow: `0 0 6px ${HEADER.highlight}40` } : {}),
      }}
    >
      <span aria-hidden="true" className="flex items-center">{icon}</span>
      {/* Desktop: full label, Mobile: short label if provided */}
      {label && <span className="hidden sm:inline">{label}</span>}
      {mobileLabel && <span className="sm:hidden">{mobileLabel}</span>}
      {badge !== undefined && badge > 0 && (
        <span
          className="ml-0.5 min-w-[18px] text-center px-1 rounded text-[10px] font-bold leading-tight"
          style={{
            backgroundColor: '#B83A2A',
            color: '#fff',
            boxShadow: 'inset -1px -1px 0 0 #8A2010, inset 1px 1px 0 0 #D05040',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GameHeader({ onPanelRequest, gameContainerRef, activePanel, workingCount = 0, staffCount = 0, liveTaskCount = 0 }: GameHeaderProps) {
  const badges = useBadgeCounts();
  const studentName = useStudentStore((s) => s.name);
  const totalPoints = useStudentStore((s) => s.totalPoints);

  // Fullscreen state + feature detection (iOS Safari lacks fullscreen API)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);

  useEffect(() => {
    setCanFullscreen(typeof document.fullscreenEnabled !== 'undefined' && document.fullscreenEnabled);
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      const el = gameContainerRef?.current ?? document.documentElement;
      el.requestFullscreen();
    }
  }, [gameContainerRef]);

  return (
    <header
      className="px-3 sm:px-4 py-1.5 flex items-center justify-between text-sm select-none"
      style={{
        backgroundColor: HEADER.bg,
        color: HEADER.text,
        imageRendering: 'pixelated',
        borderBottom: `2px solid ${HEADER.border}`,
        boxShadow: `inset 0 1px 0 0 ${HEADER.bgLight}`,
      }}
    >
      {/* Left: branding + student profile */}
      <div className="flex items-center gap-3">
        <span
          className="font-mono font-bold text-base tracking-tight"
          style={{ color: HEADER.highlight, textShadow: `0 1px 2px ${HEADER.border}` }}
        >
          物理实验室
        </span>
        <span
          className="h-2 w-2 rounded-full bg-emerald-400 inline-block"
          style={{ boxShadow: '0 0 4px #34d399' }}
          aria-label="Connected"
        />
        {studentName && (
          <span
            className="font-mono text-[12px] flex items-center gap-1.5 px-2 py-0.5"
            style={{
              backgroundColor: HEADER.buttonBg,
              color: HEADER.text,
              borderRadius: '2px',
              boxShadow: HEADER.buttonBorder,
            }}
            title={`已答 ${useStudentStore.getState().quizStats.attempted} 题, 答对 ${useStudentStore.getState().quizStats.correct} 题`}
          >
            <span>🎓</span>
            <span>{studentName}</span>
            <span style={{ color: HEADER.highlight }}>·</span>
            <span style={{ color: HEADER.highlight }}>⭐ {totalPoints}</span>
          </span>
        )}
      </div>

      {/* Right: Game-style buttons */}
      <div className="flex items-center gap-1.5">
        <HudButton
          icon={<GraduationCap className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
          label="助教"
          onClick={() => onPanelRequest?.('tutor')}
          active={activePanel === 'tutor'}
          ariaLabel="Physics tutor chat"
          glow={activePanel !== 'tutor'}
        />
        <HudButton
          icon={<Users className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
          label={`同学 ${staffCount}`}
          mobileLabel={`${staffCount}`}
          onClick={() => onPanelRequest?.('team')}
          active={activePanel === 'team'}
          ariaLabel="同学列表"
        />
        <HudButton
          icon={<BookOpen className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
          label="课程"
          onClick={() => onPanelRequest?.('courses')}
          active={activePanel === 'courses'}
          ariaLabel="人教版物理课程"
        />
        <HudButton
          icon={<FlaskConical className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
          label="实验"
          onClick={() => onPanelRequest?.('experiments')}
          active={activePanel === 'experiments'}
          ariaLabel="物理实验小程序"
        />
        {canFullscreen && (
          <HudButton
            icon={isFullscreen ? <Minimize2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> : <Maximize2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
            label=""
            onClick={toggleFullscreen}
            ariaLabel={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          />
        )}
      </div>
    </header>
  );
}
