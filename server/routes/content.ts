import type http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// Resolve project root from server cwd; the dev server runs from repo root.
const PROJECT_ROOT = process.cwd();
const COURSES_DIR = path.join(PROJECT_ROOT, 'md_output');
const SCENARIOS_DIR = path.join(PROJECT_ROOT, 'scenario');

function safeJoin(root: string, rel: string): string | null {
  const normalized = path.normalize(rel).replace(/^[/\\]+/, '');
  const abs = path.join(root, normalized);
  if (!abs.startsWith(root)) return null;
  return abs;
}

function json(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

// ── /api/courses : list of textbook → chapter markdowns ─────────────────────
export function handleCoursesList(res: http.ServerResponse): void {
  try {
    if (!fs.existsSync(COURSES_DIR)) {
      json(res, 200, { textbooks: [] });
      return;
    }
    const textbooks = fs.readdirSync(COURSES_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((dir) => {
        const tbPath = path.join(COURSES_DIR, dir.name);
        const chapters = fs.readdirSync(tbPath, { withFileTypes: true })
          .filter((e) => e.isFile() && e.name.endsWith('.md'))
          .map((file) => {
            const title = file.name
              .replace(/\.md$/, '')
              .replace(/^精读_/, '')
              .replace(/_/g, ' ');
            return {
              title,
              filename: file.name,
              path: `${dir.name}/${file.name}`,
            };
          })
          .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
        return { name: dir.name, chapters };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    json(res, 200, { textbooks });
  } catch (err) {
    const e = err as Error;
    json(res, 500, { error: e.message });
  }
}

// ── /api/courses/file?path=... : read a single chapter markdown ─────────────
export function handleCourseFile(url: URL, res: http.ServerResponse): void {
  const rel = url.searchParams.get('path');
  if (!rel) {
    json(res, 400, { error: 'path query param required' });
    return;
  }
  const abs = safeJoin(COURSES_DIR, rel);
  if (!abs) {
    json(res, 400, { error: 'invalid path' });
    return;
  }
  fs.readFile(abs, 'utf-8', (err, data) => {
    if (err) {
      json(res, 404, { error: err.code === 'ENOENT' ? 'not found' : err.message });
      return;
    }
    json(res, 200, { path: rel, content: data });
  });
}

// ── /api/experiments : list of scenario/ subdirectories ─────────────────────
interface ExperimentMeta {
  slug: string;
  title: string;
  description: string;
  hasReadme: boolean;
  hasIndexHtml: boolean;
}

function deriveExperimentMeta(slug: string): ExperimentMeta {
  const dir = path.join(SCENARIOS_DIR, slug);
  const indexPath = path.join(dir, 'index.html');
  const readmePath = path.join(dir, 'README.md');
  const hasIndex = fs.existsSync(indexPath);
  const hasReadme = fs.existsSync(readmePath);

  let title = slug;
  let description = '';

  if (hasReadme) {
    try {
      const md = fs.readFileSync(readmePath, 'utf-8');
      const titleMatch = md.match(/^#\s+(.+?)\s*$/m);
      if (titleMatch) title = titleMatch[1];
      // first non-heading paragraph as description
      const firstPara = md
        .split('\n')
        .find((line) => line.trim() && !line.startsWith('#') && !line.startsWith('!'));
      if (firstPara) description = firstPara.trim();
    } catch { /* ignore */ }
  } else if (hasIndex) {
    // try to extract <title> from index.html
    try {
      const html = fs.readFileSync(indexPath, 'utf-8');
      const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (m) title = m[1].trim();
    } catch { /* ignore */ }
  }

  return { slug, title, description, hasReadme, hasIndexHtml: hasIndex };
}

export function handleExperimentsList(res: http.ServerResponse): void {
  try {
    if (!fs.existsSync(SCENARIOS_DIR)) {
      json(res, 200, { experiments: [] });
      return;
    }
    const experiments = fs.readdirSync(SCENARIOS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((dir) => deriveExperimentMeta(dir.name))
      .filter((e) => e.hasIndexHtml);
    json(res, 200, { experiments });
  } catch (err) {
    const e = err as Error;
    json(res, 500, { error: e.message });
  }
}
