import { GoogleGenAI } from '@google/genai';
import { AIProvider } from '@/types';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiRouterRequest {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  systemInstruction?: string;
  messages: ChatMessage[];
  temperature?: number;
}

export interface AiRouterResponse {
  success: boolean;
  reply: string;
  data?: unknown;
  provider: AIProvider;
  model: string;
  error?: string;
  errorCode?: 'INVALID_KEY' | 'RATE_LIMIT' | 'SERVICE_DOWNTIME' | 'MODEL_ERROR' | 'UNKNOWN';
}

/**
 * Parses JSON blocks from text replies safely
 */
export function extractStructuredJson<T = unknown>(text: string): T | null {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]) as T;
    } catch {
      // ignore
    }
  }

  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Strips code fences from reply text for clean display
 */
export function cleanReplyText(text: string): string {
  return text.replace(/```(?:json)?\s*[\s\S]*?\s*```/g, '').trim();
}

/**
 * Multi-Provider Model Router for Google Gemini, OpenRouter, and Mistral
 */
export async function executeAiRouter(req: AiRouterRequest): Promise<AiRouterResponse> {
  const provider = req.provider || 'gemini';
  const temperature = req.temperature ?? 0.4;
  const systemInstruction = req.systemInstruction || 'You are LottoBet AI Betting Assistant.';

  // 1. Resolve API Key: client key (per-request, paid users) takes priority,
// then server env var (app owner's credentials). Never hardcode.
  let apiKey = (req.apiKey || '').trim();
  if (!apiKey) {
    switch (provider) {
      case 'gemini':
        apiKey = (process.env.GEMINI_API_KEY || '').trim();
        break;
      case 'openrouter':
        apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
        break;
      case 'mistral':
        apiKey = (process.env.MISTRAL_API_KEY || '').trim();
        break;
    }
  }

  if (!apiKey) {
    const providerName = provider === 'gemini' ? 'Google Gemini' : provider === 'openrouter' ? 'OpenRouter' : 'Mistral';
    return {
      success: false,
      reply: '',
      provider,
      model: req.model || '',
      error: `No API key configured for ${providerName}. Add your key in Settings (BYOK) or contact the administrator to enable server-side AI.`,
      errorCode: 'INVALID_KEY',
    };
  }

  // 2. Google Gemini Routing
  if (provider === 'gemini') {
    const model = req.model && req.model.trim() ? req.model.trim() : 'gemini-2.5-flash';
    try {
      const ai = new GoogleGenAI({ apiKey });

      // Format conversation contents adhering to Gemini API alternation
      const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
      const userAndAssistant = req.messages.filter((m) => m.role !== 'system');

      if (userAndAssistant.length === 0) {
        contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
      } else {
        for (const m of userAndAssistant) {
          const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';
          if (contents.length > 0 && contents[contents.length - 1].role === role) {
            contents[contents.length - 1].parts[0].text += `\n\n${m.content}`;
          } else {
            contents.push({
              role,
              parts: [{ text: m.content }],
            });
          }
        }
      }

      if (contents.length > 0 && contents[0].role !== 'user') {
        contents.unshift({ role: 'user', parts: [{ text: 'Hello' }] });
      }

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature,
        },
      });

      const replyText = response.text || '';
      const structuredData = extractStructuredJson(replyText);
      const cleanDisplay = cleanReplyText(replyText) || replyText;

      return {
        success: true,
        reply: cleanDisplay,
        data: structuredData,
        provider,
        model,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Gemini API execution error:', msg);

      if (msg.includes('API_KEY_INVALID') || msg.includes('403') || msg.includes('Forbidden') || msg.includes('unregistered')) {
        return {
          success: false,
          reply: '',
          provider,
          model,
          error: 'Your Google Gemini API Key is invalid or expired. Please verify your key in the Settings Panel.',
          errorCode: 'INVALID_KEY',
        };
      }

      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota')) {
        return {
          success: false,
          reply: '',
          provider,
          model,
          error: 'Google Gemini quota or rate limit exceeded (HTTP 429). Please wait a moment or switch to OpenRouter/Mistral in Settings.',
          errorCode: 'RATE_LIMIT',
        };
      }

      if (msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('502') || msg.includes('Overloaded')) {
        return {
          success: false,
          reply: '',
          provider,
          model,
          error: 'Google Gemini service is temporarily unavailable (HTTP 503). Please switch provider in Settings or retry shortly.',
          errorCode: 'SERVICE_DOWNTIME',
        };
      }

      return {
        success: false,
        reply: '',
        provider,
        model,
        error: `Gemini API Error: ${msg}. Please check your API key in Settings.`,
        errorCode: 'MODEL_ERROR',
      };
    }
  }

  // 3. OpenRouter Routing (https://openrouter.ai/api/v1/chat/completions)
  if (provider === 'openrouter') {
    const model = req.model && req.model.trim() ? req.model.trim() : 'openai/gpt-4o-mini';
    try {
      const openRouterMessages = [
        { role: 'system', content: systemInstruction },
        ...req.messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
          content: m.content,
        })),
      ];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://lottobet.app',
          'X-Title': 'LottoBet Sports Predictor',
        },
        body: JSON.stringify({
          model,
          messages: openRouterMessages,
          temperature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return {
            success: false,
            reply: '',
            provider,
            model,
            error: 'Invalid OpenRouter API Key (HTTP 401/403). Please check or update your key in the Settings Panel.',
            errorCode: 'INVALID_KEY',
          };
        }
        if (res.status === 429) {
          return {
            success: false,
            reply: '',
            provider,
            model,
            error: 'OpenRouter rate limit or credit balance exhausted (HTTP 429). Please check your OpenRouter credits or switch provider in Settings.',
            errorCode: 'RATE_LIMIT',
          };
        }
        if (res.status === 503 || res.status === 502 || res.status === 504) {
          return {
            success: false,
            reply: '',
            provider,
            model,
            error: 'OpenRouter or model host is experiencing service downtime (HTTP 503). Try switching to Google Gemini or Mistral in Settings.',
            errorCode: 'SERVICE_DOWNTIME',
          };
        }
        const errorDetail = data?.error?.message || `HTTP ${res.status} error from OpenRouter`;
        return {
          success: false,
          reply: '',
          provider,
          model,
          error: `OpenRouter Error: ${errorDetail}`,
          errorCode: 'MODEL_ERROR',
        };
      }

      const replyText = data?.choices?.[0]?.message?.content || '';
      const structuredData = extractStructuredJson(replyText);
      const cleanDisplay = cleanReplyText(replyText) || replyText;

      return {
        success: true,
        reply: cleanDisplay,
        data: structuredData,
        provider,
        model,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        reply: '',
        provider,
        model,
        error: `Failed to connect to OpenRouter (${msg}). Please verify your network and Settings.`,
        errorCode: 'UNKNOWN',
      };
    }
  }

  // 4. Mistral Routing (https://api.mistral.ai/v1/chat/completions)
  if (provider === 'mistral') {
    const model = req.model && req.model.trim() ? req.model.trim() : 'mistral-small-latest';
    try {
      const mistralMessages = [
        { role: 'system', content: systemInstruction },
        ...req.messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
          content: m.content,
        })),
      ];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: mistralMessages,
          temperature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return {
            success: false,
            reply: '',
            provider,
            model,
            error: 'Invalid Mistral API Key (HTTP 401/403). Please verify your Mistral API key in Settings.',
            errorCode: 'INVALID_KEY',
          };
        }
        if (res.status === 429) {
          return {
            success: false,
            reply: '',
            provider,
            model,
            error: 'Mistral rate limit exceeded (HTTP 429). Please wait a moment or switch to Gemini in Settings.',
            errorCode: 'RATE_LIMIT',
          };
        }
        if (res.status === 503 || res.status === 502 || res.status === 504) {
          return {
            success: false,
            reply: '',
            provider,
            model,
            error: 'Mistral AI service is temporarily unavailable (HTTP 503). Please switch provider in Settings.',
            errorCode: 'SERVICE_DOWNTIME',
          };
        }
        const errorDetail = data?.message || data?.error?.message || `HTTP ${res.status} from Mistral`;
        return {
          success: false,
          reply: '',
          provider,
          model,
          error: `Mistral Error: ${errorDetail}`,
          errorCode: 'MODEL_ERROR',
        };
      }

      const replyText = data?.choices?.[0]?.message?.content || '';
      const structuredData = extractStructuredJson(replyText);
      const cleanDisplay = cleanReplyText(replyText) || replyText;

      return {
        success: true,
        reply: cleanDisplay,
        data: structuredData,
        provider,
        model,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        reply: '',
        provider,
        model,
        error: `Failed to connect to Mistral API (${msg}). Please verify your Settings.`,
        errorCode: 'UNKNOWN',
      };
    }
  }

  return {
    success: false,
    reply: '',
    provider,
    model: req.model || '',
    error: `Unsupported provider: ${provider}`,
    errorCode: 'UNKNOWN',
  };
}
