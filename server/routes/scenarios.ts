import type http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const SCENARIOS_DIR = path.join(process.cwd(), 'scenario');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.wasm': 'application/wasm',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8',
};

/** Serve files under /scenarios/* from the scenario/ directory at repo root. */
export function handleScenarioStatic(url: URL, res: http.ServerResponse): boolean {
  if (!url.pathname.startsWith('/scenarios/')) return false;
  let rel = url.pathname.slice('/scenarios/'.length);
  if (rel.endsWith('/') || rel === '') rel += 'index.html';
  const filePath = path.normalize(path.join(SCENARIOS_DIR, rel));
  if (!filePath.startsWith(SCENARIOS_DIR)) {
    res.writeHead(403); res.end('forbidden'); return true;
  }
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      res.writeHead(404); res.end('not found'); return true;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404); res.end('not found');
  }
  return true;
}
