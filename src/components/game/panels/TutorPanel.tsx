// ---------------------------------------------------------------------------
// TutorPanel — streaming physics tutor chat. Subject is determined by the
// currently active lab (room zone). System prompt is injected from labs.ts.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Button } from '@/components/ui/button';
import { PARCHMENT, SectionHeader } from './panelUtils';
import { PHYSICS_LABS, type PhysicsLab } from '../engine/labs';
import type { RoomZoneId } from '../engine/roomZones';
import { useStudentStore } from '@/stores/student-store';
import {
  topicsForLab,
  suggestNextTopics,
  findTopic,
  type LabSlug,
} from '@/curriculum/physics';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** True while the assistant is still streaming */
  streaming?: boolean;
  /** Points awarded by this assistant message (parsed from [score:N]) */
  awardedPoints?: number;
}

// The tutor system prompt is augmented with quiz/mastery-protocol rules so the
// assistant can grade student answers and update mastery in a way the UI can parse.
const TUTOR_PROTOCOL = `

【出题 / 判分 / 掌握度协议 — 必须严格遵守】

A) 当用户说"考考我"或要求出题时：
1. 围绕"当前重点"或"下一步推荐"的知识点出一道难度适中的题（计算 / 选择 / 简答均可），题目用 Markdown 格式
2. 不要给出答案，只问题目
3. 最后单独一行写：[mode:question]

B) 当用户给出答案后，你需要：
1. 判断正误，给出鼓励性反馈
2. 如果答错，再讲解一遍正确思路
3. 最后单独一行写：[score:N] 其中 N 是本次得分整数：
   - 完全正确：30 分
   - 部分对：10-20 分
   - 完全错：0 分
4. [score:N] 必须独立一行，前后无其他字符（前端要解析它然后从界面隐藏）

C) 当你判断学生已经"掌握"了某个知识点（比如他完全答对一道关于该知识点的题、或者讲述清楚原理），
   除了 [score:N] 之外，再单独一行加：[mastered:<topic_id>]
   其中 topic_id 来自下面的"本实验室知识点列表"。
   不要乱发明 id；只能用列表里已存在的。
   多个掌握可以多行写。
`;

const POINTS_REGEX = /\[score:\s*(\d+)\s*\]/i;
const MASTERED_REGEX = /\[mastered:\s*([a-z0-9._-]+)\s*\]/gi;
const MODE_REGEX = /\[mode:\s*[a-z]+\s*\]/gi;

// Stable empty array reference — zustand selectors must return the same
// reference for unchanged state or React will detect a new value every render
// and infinite-loop.
const EMPTY_TOPICS: string[] = [];

/** Strip protocol markers ([score:N], [mastered:id], [mode:question]) from a message. */
function extractMarkers(content: string): { display: string; points: number; mastered: string[] } {
  const pointsMatch = content.match(POINTS_REGEX);
  const masteredMatches = Array.from(content.matchAll(MASTERED_REGEX));
  return {
    display: content
      .replace(POINTS_REGEX, '')
      .replace(MASTERED_REGEX, '')
      .replace(MODE_REGEX, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\n\s*$/g, ''),
    points: pointsMatch ? parseInt(pointsMatch[1], 10) : 0,
    mastered: masteredMatches.map((m) => m[1]),
  };
}

const STORAGE_PREFIX = 'tutor-chat::';

function loadHistory(labSlug: string): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + labSlug);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return [];
}

function saveHistory(labSlug: string, msgs: Message[]): void {
  try {
    // Strip streaming flag and cap history at 50 messages
    const persistable = msgs.slice(-50).map((m) => ({ id: m.id, role: m.role, content: m.content }));
    localStorage.setItem(STORAGE_PREFIX + labSlug, JSON.stringify(persistable));
  } catch {
    /* quota or disabled — silently ignore */
  }
}

interface TutorPanelProps {
  /** Which lab's tutor is currently active. Defaults to lounge. */
  activeZone?: RoomZoneId;
  /** When user clicks "进入实验" — invoked with scenario id; parent can open iframe. */
  onLaunchScenario?: (scenarioId: string) => void;
}

export default function TutorPanel({ activeZone = 'break-room', onLaunchScenario }: TutorPanelProps) {
  const lab: PhysicsLab = useMemo(() => PHYSICS_LABS[activeZone], [activeZone]);
  const recordQuiz = useStudentStore((s) => s.recordQuiz);
  const markTopicMastered = useStudentStore((s) => s.markTopicMastered);
  const studentName = useStudentStore((s) => s.name);
  const labPoints = useStudentStore((s) => s.labs[lab.slug]?.points ?? 0);
  const masteredTopics = useStudentStore((s) => s.labs[lab.slug]?.masteredTopics ?? EMPTY_TOPICS);

  // Build a per-lab curriculum context for the system prompt.
  // The lounge has no academic curriculum — it can use general lab tips.
  const curriculumContext = useMemo(() => {
    if (lab.slug === 'lounge') return '';
    const allTopics = topicsForLab(lab.slug as LabSlug);
    const next = suggestNextTopics(lab.slug as LabSlug, masteredTopics, 5);
    const masteredList = masteredTopics
      .map((id) => findTopic(id))
      .filter((t): t is NonNullable<typeof t> => !!t);
    return `

【本实验室知识点列表（共 ${allTopics.length} 个，按从易到难排）】
${allTopics.map((t) => `- ${t.id} | ${t.title}（${t.grade}）：${t.summary}`).join('\n')}

【学生掌握情况】
${masteredList.length === 0 ? '尚未掌握任何知识点 — 从最基础的开始教起。' : masteredList.map((t) => `✓ ${t.id} ${t.title}`).join('\n')}

【建议的下一步学习路径（前置已满足、自己还没掌握）】
${next.length === 0 ? '所有知识点都已掌握，可以考查综合题或拓展话题。' : next.map((t) => `→ ${t.id} ${t.title}：${t.summary}`).join('\n')}

回答和出题时优先围绕"建议的下一步"或学生刚问到的知识点；不要重复教已掌握的内容。`;
  }, [lab.slug, masteredTopics]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Load history when lab changes
  useEffect(() => {
    setMessages(loadHistory(lab.slug));
    // cancel any in-flight stream from prior lab
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
  }, [lab.slug]);

  // Persist on change
  useEffect(() => {
    if (messages.length > 0) saveHistory(lab.slug, messages);
  }, [messages, lab.slug]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    const asstId = `a-${Date.now()}`;
    const asstMsg: Message = { id: asstId, role: 'assistant', content: '', streaming: true };

    setMessages((prev) => [...prev, userMsg, asstMsg]);
    setSending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const studentLine = studentName ? `当前学生：${studentName}。` : '';

      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: history,
          system: `${studentLine}${lab.systemPrompt}${curriculumContext}${TUTOR_PROTOCOL}`,
          maxTokens: 2048,
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          // each SSE event is "event: <name>\ndata: <json>"
          const lines = part.split('\n');
          let eventName = 'message';
          let dataLine = '';
          for (const line of lines) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLine = line.slice(5).trim();
          }
          if (!dataLine) continue;
          let payload: { text?: string; message?: string } = {};
          try {
            payload = JSON.parse(dataLine);
          } catch {
            continue;
          }
          if (eventName === 'delta' && payload.text) {
            const chunk = payload.text;
            setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, content: m.content + chunk } : m)));
          } else if (eventName === 'error') {
            const errText = `\n\n_⚠️ ${payload.message ?? 'LLM error'}_`;
            setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, content: m.content + errText } : m)));
          }
        }
      }
    } catch (err) {
      const e = err as Error;
      if (e.name !== 'AbortError') {
        setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, content: m.content + `\n\n_⚠️ ${e.message}_` } : m)));
      }
    } finally {
      // Parse [score:N] and [mastered:id] markers, award points & mastery.
      setMessages((prev) => prev.map((m) => {
        if (m.id !== asstId) return m;
        const { display, points, mastered } = extractMarkers(m.content);
        if (points > 0) {
          recordQuiz(true, lab.slug, points);
        } else if (POINTS_REGEX.test(m.content)) {
          recordQuiz(false, lab.slug, 0);
        }
        for (const topicId of mastered) {
          // Only accept ids belonging to a valid topic — ignore hallucinated ids
          const topic = findTopic(topicId);
          if (topic) markTopicMastered(topic.labSlug, topic.id);
        }
        return { ...m, content: display, streaming: false, awardedPoints: points > 0 ? points : undefined };
      }));
      setSending(false);
      abortRef.current = null;
    }
  }, [sending, messages, lab.systemPrompt, lab.slug, studentName, recordQuiz, markTopicMastered, curriculumContext]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    void sendMessage(text);
  }, [input, sendMessage]);

  const askQuiz = useCallback(() => {
    if (sending) return;
    void sendMessage('考考我吧！出一道这个实验室的题。');
  }, [sending, sendMessage]);

  const askNextTopic = useCallback(() => {
    if (sending) return;
    void sendMessage('我接下来该学什么？根据我的学习状态推荐一个具体的小知识点，并简短解释一下重点。');
  }, [sending, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void send();
      }
    },
    [send],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_PREFIX + lab.slug);
    } catch {
      /* ignore */
    }
  }, [lab.slug]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2" style={{ borderBottom: `1px solid ${PARCHMENT.border}` }}>
        <SectionHeader>{lab.icon} {lab.name}</SectionHeader>
        <div className="text-[11px] font-mono mt-1 flex items-center justify-between gap-2" style={{ color: PARCHMENT.textDim }}>
          <span>{lab.tagline}</span>
          {lab.slug !== 'lounge' && (
            <span style={{ color: PARCHMENT.borderDark }}>
              已掌握 {masteredTopics.length}/{topicsForLab(lab.slug as LabSlug).length}
            </span>
          )}
        </div>
        {lab.scenarios.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {lab.scenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onLaunchScenario?.(s.id)}
                title={s.description}
                className="text-[11px] font-mono px-2 py-0.5 transition-colors"
                style={{
                  backgroundColor: '#C4A265',
                  color: '#2A1A0E',
                  border: `1px solid ${PARCHMENT.border}`,
                  borderRadius: '2px',
                }}
              >
                🧪 {s.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3 text-[13px]">
        {messages.length === 0 && (
          <div className="text-center text-[12px] font-mono py-8" style={{ color: PARCHMENT.textDim }}>
            👋 你好！我是 {lab.name} 的助教。<br />
            想学什么？或者问我任何关于{lab.name.replace('实验室', '')}的问题。
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className="max-w-[88%] px-3 py-2 font-mono"
              style={{
                backgroundColor: m.role === 'user' ? '#E5C896' : '#F5ECD7',
                color: PARCHMENT.text,
                border: `1px solid ${PARCHMENT.border}`,
                borderRadius: '4px',
                whiteSpace: 'normal',
              }}
            >
              <div className="markdown-body text-[13px] leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {m.content || (m.streaming ? '…' : '')}
                </ReactMarkdown>
              </div>
              {m.streaming && (
                <div className="inline-block animate-pulse mt-1 text-[10px]" style={{ color: PARCHMENT.textDim }}>
                  ▌
                </div>
              )}
              {m.awardedPoints !== undefined && m.awardedPoints > 0 && !m.streaming && (
                <div
                  className="mt-2 inline-block px-2 py-0.5 text-[11px] font-bold"
                  style={{
                    backgroundColor: '#C4A265',
                    color: '#2A1A0E',
                    borderRadius: '2px',
                    border: `1px solid ${PARCHMENT.borderDark}`,
                  }}
                >
                  +{m.awardedPoints} ⭐
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 py-2 flex flex-col gap-2" style={{ borderTop: `1px solid ${PARCHMENT.border}` }}>
        {/* Quick action chips — quiz, recommend next topic */}
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={askQuiz}
            disabled={sending}
            className="text-[11px] font-mono px-2 py-1 transition-colors disabled:opacity-40"
            style={{
              backgroundColor: '#FFE08A',
              color: '#5C3D2E',
              border: `1px solid ${PARCHMENT.borderDark}`,
              borderRadius: '2px',
            }}
          >
            🎯 考考我
          </button>
          <button
            type="button"
            onClick={askNextTopic}
            disabled={sending}
            className="text-[11px] font-mono px-2 py-1 transition-colors disabled:opacity-40"
            style={{
              backgroundColor: '#D5E8C8',
              color: '#3D2B1F',
              border: `1px solid ${PARCHMENT.borderDark}`,
              borderRadius: '2px',
            }}
          >
            🗺 我接下来学啥
          </button>
          <span
            className="text-[11px] font-mono ml-auto self-center"
            style={{ color: PARCHMENT.textDim }}
            title={`本实验室得分`}
          >
            ⭐ {labPoints}
          </span>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={sending ? '正在思考…' : '提问、求解、让助教出题 (Enter 发送, Shift+Enter 换行)'}
          disabled={sending}
          className="w-full p-2 font-mono text-[12px] resize-none focus:outline-none"
          style={{
            backgroundColor: '#FFF8E6',
            color: PARCHMENT.text,
            border: `1px solid ${PARCHMENT.border}`,
            borderRadius: '2px',
          }}
        />
        <div className="flex gap-2 items-center">
          {sending ? (
            <Button type="button" variant="outline" size="sm" onClick={stop}>停止</Button>
          ) : (
            <Button type="button" size="sm" onClick={() => void send()} disabled={!input.trim()}>发送</Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={clear} title="清空当前实验室对话">🗑</Button>
          <span className="text-[10px] font-mono ml-auto" style={{ color: PARCHMENT.textDim }}>
            qwen3-coder-plus
          </span>
        </div>
      </div>
    </div>
  );
}
