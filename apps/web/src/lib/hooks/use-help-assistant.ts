import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

export interface HelpAssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface HelpAssistantSource {
  title: string;
  section: string | null;
  source: string;
  route: string | null;
}

export interface HelpAssistantReply {
  answer: string;
  sources: HelpAssistantSource[];
  navigation: { label: string; route: string } | null;
}

export function useHelpAssistantChat() {
  return useMutation({
    mutationFn: (input: { message: string; history: HelpAssistantMessage[] }) =>
      apiFetch<HelpAssistantReply>('/api/help-assistant/chat', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
}
