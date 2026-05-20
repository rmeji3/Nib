'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './nib-viewer';
import type {
  AssistantMessage,
  Citation,
  MessageSegment,
  PromptLibraryEntry,
  UserMessage,
} from './nib-types';

export const PROMPT_LIBRARY: PromptLibraryEntry[] = [
  {
    q: 'What\'s the highest peak thermal load reported?',
    icon: 'search',
    a: {
      reasoning: [
        'Searching across 6 pages, 24 text blocks, 1 table.',
        'Top hits: Table 1 (p.4), Conclusion (p.6), §3 discussion (p.4).',
        'Cross-checking values against §3 prose.',
      ],
      segments: [
        'Across the six characterized racks, ',
        'Rack R6 (8 × B200) reaches the highest peak load at ',
        { strong: '62.4 kW' },
        ' under sustained training',
        { cite: 1 },
        '. This exceeds the original 32 kW per-rack design budget by 95%. The H200-class racks top out at ',
        { strong: '38.2 kW' },
        ' on R4',
        { cite: 1 },
        ', which is still 4 °C inside the silicon throttle threshold',
        { cite: 2 },
        '.',
      ],
      citations: [
        { page: 3, blockId: 'p4-table1', label: 'Table 1', snippet: 'R6 · 8 × B200 · Peak 62.4 kW (commissioned Feb 28, 9-day window).' },
        { page: 3, blockId: 'p4-discussion', label: '§3, p.4', snippet: 'R6 exceeds the original 32 kW per-rack design budget by 95%...' },
      ],
      confidence: 0.92,
    },
  },
  {
    q: 'Explain Figure 3.',
    icon: 'sparkles',
    a: {
      reasoning: [
        'Locating Figure 3 on page 5.',
        'Parsing axes: x = flow rate (L/min), y = tokens/s/GPU.',
        'Extracting the knee inflection point and caption.',
      ],
      segments: [
        'Figure 3 plots sustained training throughput against secondary coolant flow rate, swept from 1.0 to 3.6 L/min at a 27 °C inlet',
        { cite: 1 },
        '. The throughput curve shows a sharp ',
        { strong: 'knee at 2.4 L/min' },
        ': below it, throughput is flow-limited; above it, additional flow yields diminishing returns while pump power continues to rise super-linearly',
        { cite: 1 },
        '. Based on this, the paper adopts 2.4 L/min as the steady-state setpoint with transient surges allowed up to 3.0 L/min',
        { cite: 2 },
        '.',
      ],
      citations: [
        { page: 4, blockId: 'p5-figure3', label: 'Figure 3, p.5', snippet: 'Sustained training throughput as a function of secondary coolant flow rate. Knee at 2.4 L/min...' },
        { page: 4, blockId: 'p5-recommendation', label: '§4, p.5', snippet: 'We adopt 2.4 L/min as the nominal setpoint for steady-state operation...' },
      ],
      confidence: 0.95,
    },
  },
  {
    q: 'How is the cooling system architected?',
    icon: 'search',
    a: {
      reasoning: [
        'Reading §2 System Architecture (p.3).',
        'Cross-referencing Figure 1 diagram blocks.',
        'Validating temperature ranges against caption.',
      ],
      segments: [
        'The system is a ',
        { strong: 'two-stage loop' },
        '. A primary facility loop carries water at 18–22 °C from rooftop dry coolers to a row-end CDU',
        { cite: 1 },
        '. The CDU isolates the facility side from a treated propylene-glycol secondary loop that feeds the racks at 25–28 °C and returns at 38–42 °C under load',
        { cite: 1 },
        '. At the rack, RDHx panels handle ambient-air heat shed and direct-to-chip cold plates handle GPU and NVSwitch die-level extraction',
        { cite: 2 },
        '. The split is intentionally undersized for D2C (68-74% goes through cold plates, the rest through RDHx) to preserve redundancy if a hose disconnects during service',
        { cite: 3 },
        '.',
      ],
      citations: [
        { page: 2, blockId: 'p3-arch', label: '§2, p.3', snippet: 'Primary facility loop carries water at 18–22 °C from rooftop dry coolers...' },
        { page: 2, blockId: 'p3-figure1', label: 'Figure 1, p.3', snippet: 'Two-stage cooling loop. Facility water is isolated from the treated technology coolant at the CDU...' },
        { page: 2, blockId: 'p3-splits', label: '§2.1, p.3', snippet: 'Under typical training workloads, 68–74% of total rack heat is removed via D2C...' },
      ],
      confidence: 0.91,
    },
  },
  {
    q: 'What flow rate do they recommend?',
    icon: 'sparkles',
    a: {
      reasoning: [
        'Locating recommendation in §4 (p.5).',
        'Confirming with Figure 3 caption.',
      ],
      segments: [
        'The recommended steady-state setpoint is ',
        { strong: '2.4 L/min per chassis' },
        ', chosen at the throughput–flow knee shown in Figure 3',
        { cite: 1 },
        '. The adaptive controller is permitted to surge to ',
        { strong: '3.0 L/min for up to 90 s' },
        ' during transient thermal events; above 3.0 L/min the additional pump-power cost crosses the savings threshold versus the air-cooled baseline',
        { cite: 1 },
        '.',
      ],
      citations: [
        {
          page: 4,
          blockId: 'p5-recommendation',
          label: '§4, p.5',
          snippet: 'We adopt 2.4 L/min as the nominal setpoint for steady-state operation...',
        },
      ],
      confidence: 0.97,
    },
  },
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

function ConfidenceBar({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  return (
    <div className={`confidence${value < 0.7 ? ' low' : ''}`}>
      <div className="confidence-bar"><i style={{ width: `${percent}%` }} /></div>
      <span>{percent}% confidence · grounded</span>
    </div>
  );
}

function AssistantMessageView({
  msg,
  onCiteHover,
  onCiteClick,
}: {
  msg: AssistantMessage;
  onCiteHover: (citation: Citation | null, anchor?: HTMLElement) => void;
  onCiteClick: (citation: Citation) => void;
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
      {!msg.streaming ? (
        <div className="cite-cards-wrap">
          {msg.citations.map((citation, index) => (
            <button
              key={`${citation.label}-${index}`}
              type="button"
              className="cite-card group relative overflow-hidden transition-all hover:border-[var(--citation-line)] hover:[box-shadow:0_0_16px_-4px_var(--citation)]"
              onClick={() => onCiteClick(citation)}
              onMouseEnter={(event) => onCiteHover(citation, event.currentTarget)}
              onMouseLeave={() => onCiteHover(null)}
            >
              <span className="cite-card-idx">{index + 1}</span>
              <span className="cite-card-body">
                <span className="cite-card-where">{citation.label}</span>
                <span className="cite-card-snippet">{citation.snippet}</span>
              </span>
              <Icon name="arrow-right" />
            </button>
          ))}
        </div>
      ) : null}
      {!msg.streaming ? <ConfidenceBar value={msg.confidence} /> : null}
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

export function ChatPanel({
  messages,
  onSendPrompt,
  onPickSuggestion,
  onCiteClick,
  busy,
  onToggleMinimize,
}: {
  messages: Array<UserMessage | AssistantMessage>;
  onSendPrompt: (value: string) => void;
  onPickSuggestion: (prompt: PromptLibraryEntry | { reset: true }) => void;
  onCiteClick: (citation: Citation) => void;
  busy: boolean;
  onToggleMinimize: () => void;
}) {
  const [hover, setHover] = useState<{ citation: Citation; anchor: HTMLElement } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (body) {
      body.scrollTop = body.scrollHeight;
    }
  }, [messages]);

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
            <span className={`chat-title-dot${busy ? ' thinking' : ''}`} />
            {busy ? 'Thinking…' : 'Ask this document'}
          </div>
          <div className="chat-subtitle mt-0.5 text-[11px] text-[var(--text-faint)]">Grounded in 6 pages · 24 blocks indexed · 2 figures · 1 table</div>
        </div>
        <div className="chat-header-actions flex items-center gap-1">
          <button className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-dim)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]" type="button" title="New conversation" onClick={() => onPickSuggestion({ reset: true })}><Icon name="clear" /></button>
          <button className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-dim)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]" type="button" title="Minimize chat" onClick={onToggleMinimize}><Icon name="close" /></button>
        </div>
      </div>

      <div className="chat-body relative z-[1] flex flex-col gap-[18px] overflow-y-auto p-4" ref={bodyRef}>
        {isEmpty ? (
          <div className="chat-empty flex flex-col gap-4">
            <div className="chat-welcome pb-3">
              <h2 className="mb-1 text-base font-semibold">Hi, ask about the cooling whitepaper</h2>
              <p className="text-[12.5px] leading-[1.45] text-[var(--text-dim)]">
                Nib has indexed every paragraph, the table on page 4, and both figures. Every answer is grounded with page-level citations you can click to jump to.
              </p>
            </div>
            <Suggestions onPick={(prompt) => onPickSuggestion(prompt)} />
          </div>
        ) : null}

        {messages.map((message) => (
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
            />
          )
        ))}

        {!isEmpty && !busy ? <Suggestions onPick={(prompt) => onPickSuggestion(prompt)} /> : null}
      </div>

      <Composer onSend={onSendPrompt} disabled={busy} />
      {hover ? <CitePreview data={hover.citation} anchor={hover.anchor} /> : null}
    </div>
  );
}
