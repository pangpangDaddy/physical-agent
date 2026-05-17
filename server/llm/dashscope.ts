import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

const apiKey = process.env.DASHSCOPE_API_KEY;
const baseURL = process.env.DASHSCOPE_BASE_URL ?? 'https://coding.dashscope.aliyuncs.com/apps/anthropic';
const defaultModel = process.env.DASHSCOPE_MODEL ?? 'claude-sonnet-4-5';

if (!apiKey) {
  console.warn('[llm] DASHSCOPE_API_KEY is not set — /api/chat will fail until you populate .env');
}

const client = new Anthropic({ apiKey: apiKey ?? 'missing', baseURL });

export interface ChatRequest {
  messages: MessageParam[];
  system?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function streamChat(req: ChatRequest) {
  return client.messages.stream({
    model: req.model ?? defaultModel,
    max_tokens: req.maxTokens ?? 2048,
    temperature: req.temperature ?? 0.7,
    system: req.system,
    messages: req.messages,
  });
}

export function getLlmConfig() {
  return { baseURL, defaultModel, hasKey: !!apiKey };
}
