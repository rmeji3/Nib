import { useCallback, useState } from 'react';
import { PROMPT_LIBRARY } from '../nib-chat';
import type { AssistantMessage, ChatMessage, PromptAnswer, PromptLibraryEntry, UserMessage } from '../nib-types';

function nextId() {
  return crypto.randomUUID();
}

function seedMessages(): ChatMessage[] {
  const answer = PROMPT_LIBRARY[0].a;
  return [
    { id: nextId(), role: 'user', text: PROMPT_LIBRARY[0].q },
    {
      id: nextId(),
      role: 'assistant',
      reasoning: answer.reasoning,
      reasoningShown: answer.reasoning,
      segments: answer.segments,
      citations: answer.citations,
      confidence: answer.confidence,
      streaming: false,
      streamDone: true,
      streamedText: answer.segments.map((segment) => typeof segment === 'string' ? segment : 'strong' in segment ? segment.strong : '').join(''),
    },
  ];
}

function genericAnswer(): PromptAnswer {
  return {
    reasoning: [
      'Embedding query...',
      'Retrieving top-k chunks from 24 indexed blocks.',
      'Reranking by relevance + extraction confidence.',
      'Drafting grounded response.',
    ],
    segments: [
      'I could not find a strong direct match for that in the indexed document. The whitepaper covers the cooling architecture (§2, p.3), per-rack thermal envelopes (Table 1, p.4), throughput vs. flow rate (Figure 3, p.5), and the adaptive flow policy',
      { cite: 1 },
      '. Try one of the suggested questions below, or rephrase to point at a specific section.',
    ],
    citations: [
      { page: 0, blockId: 'p1-abstract', label: 'Abstract, p.1', snippet: 'Modern accelerator deployments routinely exceed 40 kW per rack...' },
    ],
    confidence: 0.45,
  };
}

export function useNibChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => seedMessages());
  const [busy, setBusy] = useState(false);

  const sendPrompt = useCallback((text: string) => {
    const userMessage: UserMessage = { id: nextId(), role: 'user', text };
    const matchedPrompt = PROMPT_LIBRARY.find((prompt) => prompt.q.toLowerCase() === text.toLowerCase())
      ?? PROMPT_LIBRARY.find((prompt) =>
        text.toLowerCase().split(/\s+/).filter((word) => word.length > 3).some((word) => prompt.q.toLowerCase().includes(word)),
      );
    const answer = matchedPrompt?.a ?? genericAnswer();
    const assistantId = nextId();
    const assistantMessage: AssistantMessage = {
      id: assistantId,
      role: 'assistant',
      reasoning: answer.reasoning,
      reasoningShown: [],
      segments: answer.segments,
      citations: answer.citations,
      confidence: answer.confidence,
      streaming: true,
      streamDone: false,
      streamedText: '',
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setBusy(true);

    let stepIndex = 0;
    const stepInterval = window.setInterval(() => {
      stepIndex += 1;
      setMessages((current) => current.map((message) => {
        if (message.id !== assistantId || message.role !== 'assistant') {
          return message;
        }
        return { ...message, reasoningShown: answer.reasoning.slice(0, stepIndex) };
      }));

      if (stepIndex < answer.reasoning.length) {
        return;
      }

      window.clearInterval(stepInterval);
      const fullText = answer.segments.map((segment) => typeof segment === 'string' ? segment : 'strong' in segment ? segment.strong : '').join('');
      let streamedLength = 0;
      const chunk = Math.max(2, Math.floor(fullText.length / 35));

      const textInterval = window.setInterval(() => {
        streamedLength = Math.min(fullText.length, streamedLength + chunk);

        setMessages((current) => current.map((message) => {
          if (message.id !== assistantId || message.role !== 'assistant') {
            return message;
          }
          return { ...message, streamedText: fullText.slice(0, streamedLength) };
        }));

        if (streamedLength < fullText.length) {
          return;
        }

        window.clearInterval(textInterval);
        setMessages((current) => current.map((message) => {
          if (message.id !== assistantId || message.role !== 'assistant') {
            return message;
          }
          return { ...message, streaming: false, streamDone: true };
        }));
        setBusy(false);

      }, 35);
    }, 320);
  }, []);

  const onPickSuggestion = useCallback((prompt: PromptLibraryEntry | { reset: true }) => {
    if ('reset' in prompt) {
      setMessages([]);
      setBusy(false);
      return;
    }
    sendPrompt(prompt.q);
  }, [sendPrompt]);

  return {
    messages,
    busy,
    sendPrompt,
    onPickSuggestion,
  };
}
