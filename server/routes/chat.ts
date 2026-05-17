import type http from 'node:http';
import { streamChat, getLlmConfig, type ChatRequest } from '../llm/dashscope.js';

interface ChatBody {
  messages: ChatRequest['messages'];
  system?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export async function handleChat(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  let parsed: ChatBody;
  try {
    const raw = await readBody(req);
    parsed = JSON.parse(raw) as ChatBody;
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    return;
  }

  if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'messages[] required' }));
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const stream = await streamChat({
      messages: parsed.messages,
      system: parsed.system,
      model: parsed.model,
      maxTokens: parsed.maxTokens,
      temperature: parsed.temperature,
    });

    stream.on('text', (delta) => send('delta', { text: delta }));
    stream.on('error', (err) => {
      console.error('[chat] stream error:', err);
      send('error', { message: String(err?.message ?? err) });
    });

    const final = await stream.finalMessage();
    send('done', {
      stopReason: final.stop_reason,
      usage: final.usage,
      model: final.model,
    });
    res.end();
  } catch (err) {
    const e = err as { status?: number; message?: string };
    console.error('[chat] request failed:', e?.message ?? err);
    send('error', { message: e?.message ?? 'LLM request failed', status: e?.status });
    res.end();
  }
}

export function handleChatHealth(res: http.ServerResponse): void {
  const cfg = getLlmConfig();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: cfg.hasKey, baseURL: cfg.baseURL, model: cfg.defaultModel }));
}
