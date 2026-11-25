/**
 * Provider-agnostic contract for server-side AI generation.
 *
 * Feature modules depend on this interface rather than a vendor SDK. This keeps
 * provider selection replaceable without changing parser or domain services.
 */

export type AiImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface AiImageInput {
  mediaType: AiImageMediaType;
  /** Base64-encoded image bytes. */
  data: string;
}

export interface AiGenerationRequest {
  systemPrompt: string;
  userPrompt: string;
  images?: AiImageInput[];
  maxOutputTokens?: number;
}

export interface AiGenerationResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface AiProvider {
  generate(request: AiGenerationRequest): Promise<string>;
  /** Optional metered generation path for providers that expose token usage. */
  generateWithUsage?(request: AiGenerationRequest): Promise<AiGenerationResult>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
