export interface Citation {
  page: number;
  blockId: string;
  label: string;
  snippet: string;
}

export type MessageSegment = string | { strong: string } | { cite: number };

export interface PromptAnswer {
  reasoning: string[];
  segments: MessageSegment[];
  citations: Citation[];
  confidence: number;
}

export interface PromptLibraryEntry {
  q: string;
  icon: string;
  a: PromptAnswer;
}

export interface UserMessage {
  id: string;
  role: 'user';
  text: string;
}

export interface AssistantMessage {
  id: string;
  role: 'assistant';
  reasoning: string[];
  reasoningShown: string[];
  segments: MessageSegment[];
  citations: Citation[];
  confidence: number;
  streaming: boolean;
  streamDone: boolean;
  streamedText?: string;
}

export type ChatMessage = UserMessage | AssistantMessage;