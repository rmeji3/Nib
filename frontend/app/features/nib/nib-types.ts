export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Citation {
  /** 1-based index shown in inline chips and source cards */
  number: number;
  /** 0-indexed page */
  page: number;
  blockId: string;
  /** Short label shown in the chip and card (e.g. "Page 2") */
  label: string;
  /** Legacy field — kept for the existing text-layer search fallback when bbox is unavailable */
  snippet: string;
  /** Text-block excerpt for the evidence drawer; null when no usable text block. Optional for demo data. */
  textExcerpt?: string | null;

  /** Bbox on the page (top-left origin, PDF user units); null for legacy blocks. Optional for demo data. */
  bbox?: BBox | null;
  /** Page dimensions in the same units as bbox; null when bbox is null. Optional for demo data. */
  pageWidth?: number | null;
  pageHeight?: number | null;
}

export type MessageSegment = string | { strong: string } | { cite: number }; // cite is 1-based

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

export interface ConversationStarter {
  q: string;
  icon: string;
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
  confidence: number | null;
  reported?: boolean;
  streaming: boolean;
  streamDone: boolean;
  queued?: boolean;
  streamedText?: string;
  animate?: boolean;
}

export type ChatMessage = UserMessage | AssistantMessage;
