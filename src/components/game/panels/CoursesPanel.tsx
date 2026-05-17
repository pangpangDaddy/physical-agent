// ---------------------------------------------------------------------------
// CoursesPanel — browse md_output/ textbook chapters. Click a chapter to
// open it in a side reader, with full Markdown + KaTeX rendering.
// ---------------------------------------------------------------------------

import { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { PARCHMENT, SectionHeader } from './panelUtils';
import { Button } from '@/components/ui/button';

interface Chapter {
  title: string;
  filename: string;
  path: string; // "<textbook>/<filename.md>"
}
interface Textbook {
  name: string;
  chapters: Chapter[];
}

export default function CoursesPanel() {
  const [textbooks, setTextbooks] = useState<Textbook[] | null>(null);
  const [openChapter, setOpenChapter] = useState<Chapter | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/courses')
      .then((r) => r.json())
      .then((data) => setTextbooks(data.textbooks ?? []))
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  const openFile = useCallback(async (chapter: Chapter) => {
    setOpenChapter(chapter);
    setLoading(true);
    setContent('');
    setError(null);
    try {
      const r = await fetch(`/api/courses/file?path=${encodeURIComponent(chapter.path)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setContent(data.content ?? '');
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  if (textbooks === null && !error) {
    return <div className="p-4 text-sm font-mono" style={{ color: PARCHMENT.textDim }}>读取教材中…</div>;
  }
  if (error && !openChapter) {
    return <div className="p-4 text-sm font-mono text-red-700">出错了：{error}</div>;
  }

  if (openChapter) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpenChapter(null)}>
            ← 返回目录
          </Button>
          <span className="text-[11px] font-mono truncate" style={{ color: PARCHMENT.textDim }}>
            {openChapter.path.split('/')[0]}
          </span>
        </div>
        <h3 className="text-base font-bold font-mono" style={{ color: PARCHMENT.text }}>
          {openChapter.title}
        </h3>
        {loading && <div className="text-sm font-mono" style={{ color: PARCHMENT.textDim }}>加载中…</div>}
        {error && <div className="text-sm font-mono text-red-700">出错了：{error}</div>}
        {!loading && !error && (
          <div
            className="markdown-body text-[13px] leading-relaxed font-mono"
            style={{ color: PARCHMENT.text }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader>📚 课程目录</SectionHeader>
      {(textbooks ?? []).length === 0 && (
        <div className="text-sm font-mono" style={{ color: PARCHMENT.textDim }}>
          md_output/ 暂时没有课程，把人教版 PDF 解析成 markdown 放进去就行。
        </div>
      )}
      {(textbooks ?? []).map((tb) => (
        <div key={tb.name} className="space-y-1">
          <div
            className="text-[13px] font-bold font-mono px-2 py-1"
            style={{
              color: PARCHMENT.text,
              backgroundColor: '#E8D5B0',
              border: `1px solid ${PARCHMENT.border}`,
              borderRadius: '2px',
            }}
          >
            📖 {tb.name}
          </div>
          <ul className="space-y-1">
            {tb.chapters.map((ch) => (
              <li key={ch.path}>
                <button
                  type="button"
                  onClick={() => openFile(ch)}
                  className="w-full text-left text-[12px] font-mono px-2 py-1.5 transition-colors hover:bg-amber-100/50"
                  style={{
                    color: PARCHMENT.text,
                    border: `1px solid ${PARCHMENT.border}`,
                    borderRadius: '2px',
                    backgroundColor: '#F5ECD7',
                  }}
                >
                  {ch.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
