import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

export interface MoneyCopilotMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useMoneyCopilotChat() {
  return useMutation({
    mutationFn: (input: { message: string; history: MoneyCopilotMessage[] }) =>
      apiFetch<{ answer: string; readOnly: true; asOf: string | null }>(
        '/api/money-copilot/chat',
        { method: 'POST', body: JSON.stringify(input) },
      ),
  });
}
