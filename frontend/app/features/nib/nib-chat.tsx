'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSettings } from '../../settings/hooks/use-settings';
import { Icon } from './nib-viewer';
import type {
  AssistantMessage,
  Citation,
  MessageSegment,
  PromptAnswer,
  PromptLibraryEntry,
  UserMessage,
} from './nib-types';

/** Placeholder — suggestion picker only consumes `q`, but the type requires `a`. */
const EMPTY_ANSWER: PromptAnswer = { reasoning: [], segments: [], citations: [], confidence: 0 };

/**
 * Document-agnostic starter prompts shown when the chat is empty.
 *
 * These are pure question strings (no pre-baked reasoning/citations/segments) —
 * clicking one runs the prompt through the real RAG pipeline. We removed the
 * previous hardcoded "demo answers" because they masked when the backend was
 * actually broken (the UI would show fabricated citations regardless of what
 * the model returned) and only made sense for one specific cooling-research PDF.
 */
export const PROMPT_LIBRARY: PromptLibraryEntry[] = [
  { q: 'Summarize this document in 3 bullet points.', icon: 'sparkles', a: EMPTY_ANSWER },
  { q: 'What are the main topics covered?', icon: 'search', a: EMPTY_ANSWER },
  { q: 'List the key facts, numbers, or findings.', icon: 'search', a: EMPTY_ANSWER },
  { q: 'Explain the most important figure or table.', icon: 'sparkles', a: EMPTY_ANSWER },
];

function MessageSegments({
  segments,
  citations,
  onCiteHover,
  onCiteClick,
}: {
  segments: MessageSegment[];
  citations: Citation[];
  onCiteHover: (citation: Citation | null, anchor?: HTMLElement) => void;
  onCiteClick: (citation: Citation) => void;
}) {
  return (
    <>
      {segments.map((segment, index) => {
        if (typeof segment === 'string') {
          return <span key={index}>{segment}</span>;
        }

        if ('strong' in segment) {
          return <b key={index}>{segment.strong}</b>;
        }

        const citation = citations[segment.cite - 1];
        if (!citation) {
          return null;
        }

        return (
          <span
            key={index}
            className="cite-inline"
            onClick={() => onCiteClick(citation)}
            onMouseEnter={(event) => onCiteHover(citation, event.currentTarget)}
            onMouseLeave={() => onCiteHover(null)}
          >
            {segment.cite}
          </span>
        );
      })}
    </>
  );
}

function CitePreview({ data, anchor }: { data: Citation; anchor: HTMLElement }) {
  const rect = anchor.getBoundingClientRect();
  const top = Math.max(8, rect.top - 112);
  const left = Math.min(window.innerWidth - 280, Math.max(8, rect.left - 130));

  return createPortal(
    <div className="cite-preview" style={{ top, left }}>
      <div className="cite-preview-label">{data.label} · click to jump</div>
      <div className="cite-preview-body">{data.snippet}</div>
    </div>,
    document.body,
  );
}

function ReasoningPanel({ steps, done }: { steps: string[]; done: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`reasoning${open ? ' open' : ''}`}>
      <div className="reasoning-header" onClick={() => setOpen((value) => !value)}>
        {done ? <Icon name="chevron-right" /> : <div className="reasoning-spin" />}
        <span className="reasoning-headline">
          {done ? `Reviewed ${steps.length} sources · ${(0.4 + steps.length * 0.3).toFixed(1)}s` : steps[steps.length - 1] || 'Searching document...'}
        </span>
        {done ? <span className="reasoning-toggle">{open ? 'hide' : 'show'}</span> : null}
      </div>
      <div className="reasoning-body">
        {steps.map((step, index) => (
          <div key={`${step}-${index}`} className={`reasoning-step${done || index < steps.length - 1 ? ' done' : ''}`}>
            <span className="dot" />
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Real confidence indicator driven by the backend signals from Phase 3.
 * - `value` is the backend's retrieval confidence in [0,1].
 * - `groundedness` is the fraction of sentences carrying a [Page N] citation.
 *
 * Bands: ≥0.7 ok, 0.4–0.7 medium (faded), <0.4 low (red-tinted) — these match
 * the refusal threshold (0.25) and serve as a UX warning before refusal.
 */
function ConfidenceBar({ value, groundedness }: { value: number; groundedness?: number }) {
  const percent = Math.round(value * 100);
  const groundedPercent =
    groundedness !== undefined ? Math.round(groundedness * 100) : null;
  const band = value < 0.4 ? ' low' : value < 0.7 ? ' medium' : '';
  const label = value < 0.4 ? 'low confidence' : value < 0.7 ? 'medium confidence' : 'high confidence';
  return (
    <div className={`confidence${band}`}>
      <div className="confidence-bar"><i style={{ width: `${percent}%` }} /></div>
      <span>
        {percent}% · {label}
        {groundedPercent !== null ? ` · ${groundedPercent}% grounded` : ''}
      </span>
    </div>
  );
}

function LowConfidenceBanner({ refused }: { refused: boolean }) {
  return (
    <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] leading-snug text-amber-200">
      <div className="flex items-start gap-2">
        <span aria-hidden className="mt-0.5 text-amber-300">⚠</span>
        <div>
          {refused ? (
            <>
              <span className="font-medium">No grounded answer.</span> Retrieval similarity
              was below the refusal threshold, so the model was not asked. Try a more
              specific question about content that appears in this document.
            </>
          ) : (
            <>
              <span className="font-medium">Treat this answer with caution.</span> Retrieval
              confidence was low — the indexed pages may not strongly match your question,
              so some claims could be wrong or incomplete.
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AssistantMessageView({
  msg,
  onCiteHover,
  onCiteClick,
  onEvidenceOpen,
  showConfidence,
}: {
  msg: AssistantMessage;
  onCiteHover: (citation: Citation | null, anchor?: HTMLElement) => void;
  onCiteClick: (citation: Citation) => void;
  onEvidenceOpen: (citations: Citation[], focusedBlockId: string | null) => void;
  showConfidence: boolean;
}) {
  return (
    <div className={`msg msg-assistant${msg.streaming ? ' is-streaming' : ''}`}>
      <div className="msg-byline flex items-center gap-2 text-[11.5px] text-[var(--text-faint)]">
        <span className="msg-byline-dot" />
        Nib Assistant
      </div>
      <ReasoningPanel steps={msg.reasoningShown} done={msg.streamDone} />
      <div className="msg-bubble">
        {msg.streaming ? (
          <span className="streaming-text">{msg.streamedText}<span className="caret">▍</span></span>
        ) : (
          <MessageSegments
            segments={msg.segments}
            citations={msg.citations}
            onCiteHover={onCiteHover}
            onCiteClick={onCiteClick}
          />
        )}
      </div>
      {!msg.streaming && msg.citations.length > 0 ? (
        <div className="cite-cards-wrap">
          {msg.citations.map((citation, index) => (
            <button
              key={`${citation.label}-${index}`}
              type="button"
              className="cite-card group relative overflow-hidden transition-all hover:border-[var(--citation-line)] hover:[box-shadow:0_0_16px_-4px_var(--citation)]"
              onClick={() => onEvidenceOpen(msg.citations, citation.blockId)}
              onMouseEnter={(event) => onCiteHover(citation, event.currentTarget)}
              onMouseLeave={() => onCiteHover(null)}
              title="Open evidence"
            >
              <span className="cite-card-idx">{index + 1}</span>
              <span className="cite-card-body">
                <span className="cite-card-where">{citation.label}</span>
              </span>
              <Icon name="arrow-right" />
            </button>
          ))}
        </div>
      ) : null}
      {!msg.streaming && showConfidence ? <ConfidenceBar value={msg.confidence} /> : null}
      {!msg.streaming ? (
        <div className="assistant-actions mt-2 flex gap-1">
          <button className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-faint)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]" type="button" title="Copy"><Icon name="copy" /></button>
          <button className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-faint)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]" type="button" title="Regenerate"><Icon name="regenerate" /></button>
          <button className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-faint)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]" type="button" title="More"><Icon name="more" /></button>
        </div>
      ) : null}
    </div>
  );
}

function UserMessageView({ msg }: { msg: UserMessage }) {
  return (
    <div className="msg msg-user">
      <div className="msg-bubble">{msg.text}</div>
    </div>
  );
}

function DocumentUpdatedBanner({
  onStartFresh,
}: {
  onStartFresh: () => void;
}) {
  return (
    <div className="mx-1 mb-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3.5 py-3 text-[12.5px] leading-snug text-sky-200">
      <div className="flex items-start gap-2.5">
        <span aria-hidden className="mt-0.5 text-sky-300">&#x21bb;</span>
        <div className="flex-1">
          <span className="font-medium text-sky-100">Document re-indexed.</span>{' '}
          Previous answers may reference outdated content.
          <button
            type="button"
            onClick={onStartFresh}
            className="ml-2 inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-0.5 text-[11.5px] font-medium text-sky-100 transition hover:bg-sky-500/30"
          >
            Start fresh
          </button>
        </div>
      </div>
    </div>
  );
}

function Suggestions({ onPick }: { onPick: (prompt: PromptLibraryEntry) => void }) {
  return (
    <div className="suggestions flex flex-col gap-2">
      <div className="suggestions-label text-xs text-[var(--text-faint)]">Try asking</div>
      {PROMPT_LIBRARY.map((prompt) => (
        <button key={prompt.q} type="button" className="suggestion-card group relative flex items-center gap-2.5 overflow-hidden rounded-lg border border-white/10 px-3 py-2.5 text-left text-[13px] text-[var(--text)] transition hover:border-[var(--accent-line)] hover:bg-[var(--accent-soft)]" onClick={() => onPick(prompt)}>
          <div className="absolute inset-0 rounded-lg opacity-0 transition-opacity group-hover:opacity-100" style={{ boxShadow: 'inset 0 0 0 1px var(--accent-line), 0 0 16px -4px var(--accent)' }} />
          <span className="suggestion-icon inline-flex h-[22px] w-[22px] items-center justify-center rounded-md bg-[var(--bg-elevated)] text-[var(--text-dim)] group-hover:text-[var(--accent-text)]"><Icon name={prompt.icon} /></span>
          <span>{prompt.q}</span>
        </button>
      ))}
    </div>
  );
}

function Composer({ onSend, disabled }: { onSend: (value: string) => void; disabled: boolean }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="border-t border-white/10 bg-[linear-gradient(180deg,rgba(17,20,26,0.7)_0%,var(--bg-surface)_60%)] px-3.5 pb-3.5 pt-3">
      <div className="composer-inner group relative rounded-xl border border-white/15 bg-[var(--bg-base)] transition-all focus-within:border-[var(--accent-line)] focus-within:[box-shadow:0_0_0_3px_var(--accent-soft),0_0_24px_-4px_var(--accent)]">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Ask anything about this document…"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            event.target.style.height = 'auto';
            event.target.style.height = `${Math.min(160, event.target.scrollHeight)}px`;
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          className="max-h-40 w-full resize-none bg-transparent px-3.5 pb-2 pr-11 pt-3 text-[13.5px] leading-[1.4] text-[var(--text)] outline-none"
        />
        <button className="send-btn absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-[#0a1220] disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-faint)]" type="button" disabled={!value.trim() || disabled} onClick={submit} title="Send (Enter)">
          <Icon name="send" />
        </button>
        <div className="composer-bar px-2.5 pb-1.5">
          <div className="composer-hint flex items-center gap-1 text-[11px] text-[var(--text-faint)]">
            <kbd className="rounded border border-white/10 bg-white/5 px-1 font-mono text-[10px]">↵</kbd>
            <span>send ·</span>
            <kbd className="rounded border border-white/10 bg-white/5 px-1 font-mono text-[10px]">⇧↵</kbd>
            <span>newline · answers cite document</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Live indexing banner. The backend updates pagesProcessed after each vision
 * task completes (see IngestionRunner#updateProgress), so the bar reflects real
 * work. The stage label is inferred from progress:
 *  - 0%: Reading PDF (no pages reported yet)
 *  - 1–99%: Analyzing page X of Y (vision)
 *  - 100% but still PROCESSING: Embedding + storing (final batch step)
 */
function IndexingBanner({
  progress,
  pagesProcessed,
  pagesTotal,
}: {
  progress: number;
  pagesProcessed: number;
  pagesTotal: number | null;
}) {
  const stage =
    pagesTotal === null || pagesTotal === 0
      ? { title: 'Reading PDF', detail: 'Parsing pages and extracting text…' }
      : pagesProcessed >= pagesTotal
        ? { title: 'Embedding & indexing', detail: 'Storing embeddings in pgvector. Almost done.' }
        : {
            title: `Analyzing page ${pagesProcessed + 1} of ${pagesTotal}`,
            detail: 'Running Gemini Vision on each page in parallel — extracting tables, charts, and figures.',
          };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
        </span>
        <span className="text-[13.5px] font-semibold text-[var(--text)]">{stage.title}</span>
      </div>

      {pagesTotal !== null && pagesTotal > 0 && (
        <div className="w-56">
          <div className="mb-2 flex justify-between text-[11px] text-[var(--text-faint)]">
            <span>{pagesProcessed} of {pagesTotal} pages</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <p className="max-w-[240px] text-[12px] leading-relaxed text-[var(--text-faint)]">
        {stage.detail}
      </p>
    </div>
  );
}

export function ChatPanel({
  messages,
  onSendPrompt,
  onPickSuggestion,
  onCiteClick,
  onEvidenceOpen,
  busy,
  onToggleMinimize,
  isIndexing,
  progress,
  pagesProcessed,
  pagesTotal,
  isSessionStale = false,
  onDismissStale,
}: {
  messages: Array<UserMessage | AssistantMessage>;
  onSendPrompt: (value: string) => void;
  onPickSuggestion: (prompt: PromptLibraryEntry | { reset: true }) => void;
  onCiteClick: (citation: Citation) => void;
  onEvidenceOpen: (citations: Citation[], focusedBlockId: string | null) => void;
  busy: boolean;
  onToggleMinimize: () => void;
  isIndexing: boolean;
  progress: number;
  pagesProcessed: number;
  pagesTotal: number | null;
  isSessionStale?: boolean;
  onDismissStale?: () => void;
}) {
  const { settings } = useSettings();
  const [hover, setHover] = useState<{ citation: Citation; anchor: HTMLElement } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const subtitle = isIndexing
    ? `Indexing… ${pagesProcessed}${pagesTotal !== null ? `/${pagesTotal}` : ''} pages`
    : pagesTotal !== null && pagesTotal > 0
      ? `${pagesTotal} pages indexed · answers grounded in source`
      : 'Answers grounded in document source';

  useEffect(() => {
    const body = bodyRef.current;
    if (body && settings.autoScrollOnAnswer) {
      body.scrollTop = body.scrollHeight;
    }
  }, [messages, settings.autoScrollOnAnswer]);

  const isEmpty = messages.length === 0;

  return (
    <div className={`chat relative grid h-full min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden border-l border-white/10 bg-[var(--bg-surface)]${busy ? ' is-thinking' : ''}`}>
      <div className="chat-glow" aria-hidden="true">
        <div className="chat-glow-blob a" />
        <div className="chat-glow-blob b" />
        <div className="chat-glow-blob c" />
      </div>
      <div className="chat-glow-seam" aria-hidden="true" />
      <div className="chat-header relative z-[1] flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <div className="chat-title flex items-center gap-2 text-[13px] font-semibold">
            <span className={`chat-title-dot${busy ? ' thinking' : isIndexing ? ' thinking' : ''}`} />
            {busy ? 'Thinking…' : isIndexing ? 'Indexing…' : 'Ask this document'}
          </div>
          <div className="chat-subtitle mt-0.5 text-[11px] text-[var(--text-faint)]">{subtitle}</div>
        </div>
        <div className="chat-header-actions flex items-center gap-1">
          <button className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-dim)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]" type="button" title="New conversation" onClick={() => onPickSuggestion({ reset: true })}><Icon name="clear" /></button>
          <button className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-dim)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]" type="button" title="Minimize chat" onClick={onToggleMinimize}><Icon name="close" /></button>
        </div>
      </div>

      <div className="chat-body relative z-[1] flex flex-col gap-[18px] overflow-y-auto p-4" ref={bodyRef}>
        {isIndexing ? (
          <IndexingBanner
            progress={progress}
            pagesProcessed={pagesProcessed}
            pagesTotal={pagesTotal}
          />
        ) : (
          <>
            {isSessionStale && !isEmpty && (
              <DocumentUpdatedBanner
                onStartFresh={() => {
                  onPickSuggestion({ reset: true });
                  onDismissStale?.();
                }}
              />
            )}

            {isEmpty ? (
              <div className="chat-empty flex flex-col gap-4">
                <div className="chat-welcome pb-3">
                  <h2 className="mb-1 text-base font-semibold">Ask anything about this document</h2>
                  <p className="text-[12.5px] leading-[1.45] text-[var(--text-dim)]">
                    Every answer is grounded in the indexed pages and includes clickable page-level citations.
                  </p>
                </div>
                <Suggestions onPick={(prompt) => onPickSuggestion(prompt)} />
              </div>
            ) : null}

            {messages.map((message) =>
              message.role === 'user' ? (
                <UserMessageView key={message.id} msg={message} />
              ) : (
                <AssistantMessageView
                  key={message.id}
                  msg={message}
                  onCiteHover={(citation, anchor) => {
                    if (!citation || !anchor) {
                      setHover(null);
                      return;
                    }
                    setHover({ citation, anchor });
                  }}
                  onCiteClick={onCiteClick}
                  onEvidenceOpen={onEvidenceOpen}
                  showConfidence={settings.showConfidence}
                />
              ),
            )}

            {!isEmpty && !busy ? <Suggestions onPick={(prompt) => onPickSuggestion(prompt)} /> : null}
          </>
        )}
      </div>

      <Composer onSend={onSendPrompt} disabled={busy || isIndexing} />
      {hover ? <CitePreview data={hover.citation} anchor={hover.anchor} /> : null}
    </div>
  );
}
