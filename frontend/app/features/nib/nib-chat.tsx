'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { createPortal } from 'react-dom';
import { BorderBeam } from 'border-beam';
import { AnimatePresence, motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { useSettings } from '../../settings/hooks/use-settings';
import { LogoLoader } from '../../components/logo-loader';
import { IndexingProgressBar } from '../../components/indexing-progress-bar';
import { useIndexingDisplay } from './hooks/use-indexing-display-progress';
import { NibLogo } from '../../components/nib-logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Icon } from './nib-viewer';
import { OcrBlockButton } from '../../../components/ui/layout-blocks';
import type { OcrBlock, OcrBlockType } from '../../../components/ui/layout-blocks';
import type {
  AssistantMessage,
  ConversationStarter,
  Citation,
  MessageSegment,
  PromptLibraryEntry,
  UserMessage,
} from './nib-types';
import type { ChatSession } from '../../../lib/api/chat';

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
        { number: 1, page: 3, blockId: 'p4-table1', label: 'Table 1', snippet: 'R6 · 8 × B200 · Peak 62.4 kW (commissioned Feb 28, 9-day window).' },
        { number: 2, page: 3, blockId: 'p4-discussion', label: '§3, p.4', snippet: 'R6 exceeds the original 32 kW per-rack design budget by 95%...' },
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
        { number: 1, page: 4, blockId: 'p5-figure3', label: 'Figure 3, p.5', snippet: 'Sustained training throughput as a function of secondary coolant flow rate. Knee at 2.4 L/min...' },
        { number: 2, page: 4, blockId: 'p5-recommendation', label: '§4, p.5', snippet: 'We adopt 2.4 L/min as the nominal setpoint for steady-state operation...' },
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
        { number: 1, page: 2, blockId: 'p3-arch', label: '§2, p.3', snippet: 'Primary facility loop carries water at 18–22 °C from rooftop dry coolers...' },
        { number: 2, page: 2, blockId: 'p3-figure1', label: 'Figure 1, p.3', snippet: 'Two-stage cooling loop. Facility water is isolated from the treated technology coolant at the CDU...' },
        { number: 3, page: 2, blockId: 'p3-splits', label: '§2.1, p.3', snippet: 'Under typical training workloads, 68–74% of total rack heat is removed via D2C...' },
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
          number: 1,
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

type SegmentLine = MessageSegment[];

type AnswerBlock =
  | { kind: 'paragraph'; segments: MessageSegment[] }
  | { kind: 'bullets'; items: MessageSegment[][] };

function isEmptyTextSegment(segment: MessageSegment): boolean {
  return typeof segment === 'string' && segment.length === 0;
}

function trimLineSegments(line: SegmentLine): SegmentLine {
  const trimmed = line.filter((segment) => !isEmptyTextSegment(segment));

  while (trimmed.length > 0 && typeof trimmed[0] === 'string' && trimmed[0].trim().length === 0) {
    trimmed.shift();
  }

  while (trimmed.length > 0) {
    const last = trimmed[trimmed.length - 1];
    if (typeof last !== 'string' || last.trim().length > 0) {
      break;
    }
    trimmed.pop();
  }

  if (trimmed.length > 0 && typeof trimmed[0] === 'string') {
    trimmed[0] = trimmed[0].replace(/^\s+/, '');
  }

  const lastIndex = trimmed.length - 1;
  if (lastIndex >= 0 && typeof trimmed[lastIndex] === 'string') {
    trimmed[lastIndex] = trimmed[lastIndex].replace(/\s+$/, '');
  }

  return trimmed.filter((segment) => !isEmptyTextSegment(segment));
}

function splitSegmentsIntoLines(segments: MessageSegment[]): SegmentLine[] {
  const lines: SegmentLine[] = [[]];

  segments.forEach((segment) => {
    if (typeof segment !== 'string') {
      lines[lines.length - 1].push(segment);
      return;
    }

    const parts = segment.split('\n');
    parts.forEach((part, index) => {
      if (index > 0) {
        lines.push([]);
      }
      if (part.length > 0) {
        lines[lines.length - 1].push(part);
      }
    });
  });

  return lines.map(trimLineSegments);
}

function stripBulletMarker(line: SegmentLine): { bullet: boolean; segments: MessageSegment[] } {
  const trimmed = trimLineSegments(line);
  if (trimmed.length === 0 || typeof trimmed[0] !== 'string') {
    return { bullet: false, segments: trimmed };
  }

  const withoutMarker = trimmed[0].replace(/^([-•]|\d+[.)])\s+/, '');
  if (withoutMarker === trimmed[0]) {
    return { bullet: false, segments: trimmed };
  }

  return {
    bullet: true,
    segments: trimLineSegments([withoutMarker, ...trimmed.slice(1)]),
  };
}

function lineHasContent(line: SegmentLine): boolean {
  return line.some((segment) => {
    if (typeof segment === 'string') return segment.trim().length > 0;
    if ('strong' in segment) return segment.strong.trim().length > 0;
    return true;
  });
}

function buildAnswerBlocks(segments: MessageSegment[]): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  let pendingBullets: MessageSegment[][] = [];

  const flushBullets = () => {
    if (pendingBullets.length > 0) {
      blocks.push({ kind: 'bullets', items: pendingBullets });
      pendingBullets = [];
    }
  };

  splitSegmentsIntoLines(segments).forEach((line) => {
    if (!lineHasContent(line)) {
      flushBullets();
      return;
    }

    const parsed = stripBulletMarker(line);
    if (parsed.bullet) {
      pendingBullets.push(parsed.segments);
      return;
    }

    flushBullets();
    blocks.push({ kind: 'paragraph', segments: parsed.segments });
  });

  flushBullets();
  return blocks;
}

function countSegmentsText(segments: MessageSegment[]): number {
  return segments.reduce((total, segment) => {
    if (typeof segment === 'string') return total + segment.length;
    if ('strong' in segment) return total + segment.strong.length;
    return total;
  }, 0);
}

function segmentsToPlainText(segments: MessageSegment[], citations: Citation[]): string {
  return segments
    .map((segment) => {
      if (typeof segment === 'string') return segment;
      if ('strong' in segment) return segment.strong;
      const citation = citations[segment.cite - 1];
      return citation ? ` [${citation.label}]` : '';
    })
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function answerWithCitationList(msg: AssistantMessage): string {
  const answer = msg.streamedText?.trim() || segmentsToPlainText(msg.segments, msg.citations);
  if (msg.citations.length === 0) return answer;

  const sources = msg.citations
    .map((citation) => {
      const evidence = citation.textExcerpt || citation.snippet;
      return `${citation.number}. ${citation.label}${evidence ? ` - ${evidence}` : ''}`;
    })
    .join('\n');

  return `${answer}\n\nSources:\n${sources}`;
}

function countBlockText(block: AnswerBlock): number {
  if (block.kind === 'paragraph') {
    return countSegmentsText(block.segments);
  }
  return block.items.reduce((total, item) => total + countSegmentsText(item), 0);
}

function RenderSegmentsWithBudget({
  segments,
  citations,
  charBudget,
  onCiteHover,
  onCiteClick,
}: {
  segments: MessageSegment[];
  citations: Citation[];
  charBudget: number;
  onCiteHover: (citation: Citation | null, anchor?: HTMLElement) => void;
  onCiteClick: (citation: Citation) => void;
}) {
  let consumed = 0;

  return (
    <>
      {segments.map((segment, index) => {
        if (typeof segment === 'string') {
          const visibleChars = Math.max(0, Math.min(segment.length, charBudget - consumed));
          consumed += segment.length;
          if (visibleChars <= 0) return null;
          return <span key={index}>{segment.slice(0, visibleChars)}</span>;
        }

        if ('strong' in segment) {
          const visibleChars = Math.max(0, Math.min(segment.strong.length, charBudget - consumed));
          consumed += segment.strong.length;
          if (visibleChars <= 0) return null;
          return <b key={index}>{segment.strong.slice(0, visibleChars)}</b>;
        }

        const citation = citations[segment.cite - 1];
        if (!citation || charBudget < consumed) {
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

function AnswerBlocks({
  segments,
  citations,
  animate,
  animationKey,
  onAnimationDone,
  onCiteHover,
  onCiteClick,
}: {
  segments: MessageSegment[];
  citations: Citation[];
  animate: boolean;
  animationKey: string;
  onAnimationDone: () => void;
  onCiteHover: (citation: Citation | null, anchor?: HTMLElement) => void;
  onCiteClick: (citation: Citation) => void;
}) {
  const blocks = buildAnswerBlocks(segments);
  const totalChars = blocks.reduce((total, block) => total + countBlockText(block), 0);
  const [visibleChars, setVisibleChars] = useState(animate ? 0 : totalChars);
  const onDoneRef = useRef(onAnimationDone);

  useEffect(() => {
    onDoneRef.current = onAnimationDone;
  }, [onAnimationDone]);

  useEffect(() => {
    if (!animate || totalChars === 0) {
      setVisibleChars(totalChars);
      onDoneRef.current();
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisibleChars(totalChars);
      onDoneRef.current();
      return;
    }

    let current = 0;
    let timer: number | undefined;
    setVisibleChars(0);

    const tick = () => {
      current = Math.min(totalChars, current + 5);
      setVisibleChars(current);
      if (current >= totalChars) {
        onDoneRef.current();
        return;
      }
      timer = window.setTimeout(tick, 16);
    };

    timer = window.setTimeout(tick, 90);
    return () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [animate, animationKey, totalChars]);

  let consumedBeforeBlock = 0;
  return (
    <div className={`answer-blocks${animate ? ' is-typing' : ''}`}>
      {blocks.map((block, blockIndex) => {
        const blockTextLength = countBlockText(block);
        const blockBudget = animate
          ? Math.max(0, Math.min(blockTextLength, visibleChars - consumedBeforeBlock))
          : blockTextLength;
        const blockStarted = blockBudget > 0 || (!animate && blockTextLength === 0);
        const blockTyping = animate && blockBudget > 0 && blockBudget < blockTextLength;
        consumedBeforeBlock += blockTextLength;

        if (!blockStarted) {
          return null;
        }

        if (block.kind === 'paragraph') {
          return (
            <p key={`p-${blockIndex}`} className="answer-paragraph answer-reveal-block">
              <RenderSegmentsWithBudget
                segments={block.segments}
                citations={citations}
                charBudget={blockBudget}
                onCiteHover={onCiteHover}
                onCiteClick={onCiteClick}
              />
              {blockTyping ? <span className="typing-caret">▍</span> : null}
            </p>
          );
        }

        let consumedBeforeItem = 0;
        return (
          <ul key={`b-${blockIndex}`} className="answer-list answer-reveal-block">
            {block.items.map((item, itemIndex) => {
              const itemTextLength = countSegmentsText(item);
              const itemBudget = animate
                ? Math.max(0, Math.min(itemTextLength, blockBudget - consumedBeforeItem))
                : itemTextLength;
              const itemStarted = itemBudget > 0 || (!animate && itemTextLength === 0);
              const itemTyping = animate && itemBudget > 0 && itemBudget < itemTextLength;
              consumedBeforeItem += itemTextLength;

              if (!itemStarted) {
                return null;
              }

              return (
                <li key={`${blockIndex}-${itemIndex}`} className="answer-list-item answer-reveal-item">
                  <RenderSegmentsWithBudget
                    segments={item}
                    citations={citations}
                    charBudget={itemBudget}
                    onCiteHover={onCiteHover}
                    onCiteClick={onCiteClick}
                  />
                  {itemTyping ? <span className="typing-caret">▍</span> : null}
                </li>
              );
            })}
          </ul>
        );
      })}
    </div>
  );
}

function CitePreview({ data, anchor }: { data: Citation; anchor: HTMLElement }) {
  const rect = anchor.getBoundingClientRect();
  const top = Math.max(8, rect.top - 112);
  const left = Math.min(window.innerWidth - 280, Math.max(8, rect.left - 130));

  return createPortal(
    <div className="cite-preview" style={{ top, left }}>
      <div className="cite-preview-label">
        <span className="cite-preview-number">{data.number}</span>
        {data.label} · click to jump
      </div>
      <div className="cite-preview-body">{data.snippet}</div>
    </div>,
    document.body,
  );
}

function ThinkingText({ label = 'Thinking' }: { label?: string }) {
  return (
    <div className="thinking-text" role="status" aria-label={`${label}...`} aria-live="polite">
      <span className="thinking-label" aria-hidden="true">{label}</span>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number | null }) {
  if (value === null) {
    return null;
  }
  const percent = Math.round(value * 100);
  return (
    <div className={`confidence${value < 0.7 ? ' low' : ''}`}>
      <div className="confidence-bar"><i style={{ width: `${percent}%` }} /></div>
      <span>{percent}% answer confidence</span>
    </div>
  );
}

function AssistantMessageView({
  msg,
  onCiteHover,
  onCiteClick,
  onEvidenceOpen,
  onRegenerate,
  onDelete,
  onReport,
  showConfidence,
}: {
  msg: AssistantMessage;
  onCiteHover: (citation: Citation | null, anchor?: HTMLElement) => void;
  onCiteClick: (citation: Citation) => void;
  onEvidenceOpen: (citations: Citation[], focusedBlockId: string | null) => void;
  onRegenerate: (messageId: string) => void;
  onDelete: (messageId: string) => Promise<void>;
  onReport: (messageId: string) => Promise<void>;
  showConfidence: boolean;
}) {
  const shouldAnimateAnswer = Boolean(msg.animate && !msg.streaming);
  const [answerSettled, setAnswerSettled] = useState(!shouldAnimateAnswer);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [menuCopyState, setMenuCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [reported, setReported] = useState(Boolean(msg.reported));
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuCopyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAnswerSettled(!shouldAnimateAnswer);
  }, [msg.id, shouldAnimateAnswer, msg.streamedText]);

  useEffect(() => {
    setReported(Boolean(msg.reported));
  }, [msg.id, msg.reported]);

  const copyText = async (
    answerText: string,
    setState: (state: 'idle' | 'copied' | 'failed') => void,
    resetRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  ) => {
    if (!answerText) return;

    try {
      await navigator.clipboard.writeText(answerText);
      setState('copied');
    } catch {
      setState('failed');
    }

    if (resetRef.current) {
      clearTimeout(resetRef.current);
    }
    resetRef.current = setTimeout(() => setState('idle'), 1400);
  };

  const copyAnswer = () => {
    const answerText = msg.streamedText?.trim() || segmentsToPlainText(msg.segments, msg.citations);
    void copyText(answerText, setCopyState, copyResetRef);
  };

  const copyAnswerWithCitations = () => {
    void copyText(answerWithCitationList(msg), setMenuCopyState, menuCopyResetRef);
  };

  const reportAnswer = async () => {
    if (reported) return;
    await onReport(msg.id);
    setReported(true);
  };

  return (
    <div className={`msg msg-assistant${msg.streaming ? ' is-streaming' : ''}${msg.queued ? ' is-queued' : ''}`}>
      <div className="msg-byline flex items-center gap-2 text-[11.5px] text-[var(--text-faint)]">
        <span className="msg-byline-logo" aria-hidden="true">
          {msg.streaming ? (
            <LogoLoader size={14} color="#FFFFFF" />
          ) : (
            <NibLogo size={12} />
          )}
        </span>
        Nib Assistant
        {msg.queued ? <span className="queued-pill">Waiting in queue</span> : null}
      </div>
      {msg.streaming ? (
        <div className="msg-bubble">
          <ThinkingText label={msg.queued ? 'Queued' : 'Thinking'} />
          {msg.queued ? <div className="queued-helper">This prompt will run after the current answer finishes.</div> : null}
        </div>
      ) : (
        <div className="msg-bubble">
          <AnswerBlocks
            segments={msg.segments}
            citations={msg.citations}
            animate={shouldAnimateAnswer}
            animationKey={msg.id}
            onAnimationDone={() => setAnswerSettled(true)}
            onCiteHover={onCiteHover}
            onCiteClick={onCiteClick}
          />
        </div>
      )}
      {!msg.streaming && answerSettled && msg.citations.length > 0 ? (
        <div className="flex flex-col gap-2 mt-4 answer-after-reveal">
          {msg.citations.map((citation, index) => {
            const block: OcrBlock = {
              id: citation.blockId || String(index),
              type: (citation.blockType === 'table' ? 'table' : citation.blockType === 'list' ? 'list' : citation.blockType === 'chart' || citation.blockType === 'figure' || citation.blockType === 'visual_summary' ? 'figure' : 'paragraph') as OcrBlockType,
              text: citation.textExcerpt || citation.snippet || "",
              page: (citation.page || 0) + 1,
              pageWidth: citation.pageWidth || 1,
              pageHeight: citation.pageHeight || 1,
              confidence: 0.99,
              boundingBox: citation.bbox ? {
                left: citation.bbox.x,
                top: citation.bbox.y,
                right: citation.bbox.x + citation.bbox.width,
                bottom: citation.bbox.y + citation.bbox.height
              } : undefined
            };

            return (
              <OcrBlockButton
                key={`${citation.label}-${index}`}
                block={block}
                sourceNumber={citation.number}
                isActive={false}
                onFocusBlock={() => onCiteHover(citation, undefined)}
                onMouseLeave={() => onCiteHover(null)}
                onClick={() => onCiteClick(citation)}
              />
            );
          })}
        </div>
      ) : null}
      {!msg.streaming && answerSettled && showConfidence ? <ConfidenceBar value={msg.confidence} /> : null}
      {!msg.streaming && answerSettled ? (
        <div className="assistant-actions answer-after-reveal mt-2 flex gap-1">
          <button
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-faint)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]"
            type="button"
            title={copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy answer'}
            aria-label={copyState === 'copied' ? 'Copied answer' : copyState === 'failed' ? 'Copy failed' : 'Copy answer'}
            onClick={copyAnswer}
          >
            <Icon name={copyState === 'copied' ? 'check' : 'copy'} />
          </button>
          <button
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-faint)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]"
            type="button"
            title="Regenerate"
            aria-label="Regenerate answer"
            onClick={() => onRegenerate(msg.id)}
          >
            <Icon name="regenerate" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-faint)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]"
                type="button"
                title="More"
                aria-label="More answer actions"
              >
                <Icon name="more" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 border border-white/10 bg-[var(--bg-surface)] text-[var(--text)] shadow-xl"
            >
              <DropdownMenuItem
                className="gap-2 text-[12px] focus:bg-[var(--bg-elevated)] focus:text-[var(--text)]"
                onSelect={copyAnswerWithCitations}
              >
                <Icon name={menuCopyState === 'copied' ? 'check' : 'copy'} />
                <span>{menuCopyState === 'copied' ? 'Copied citations' : menuCopyState === 'failed' ? 'Copy failed' : 'Copy with citations'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 text-[12px] focus:bg-[var(--bg-elevated)] focus:text-[var(--text)]"
                disabled={msg.citations.length === 0}
                onSelect={() => onEvidenceOpen(msg.citations, msg.citations[0]?.blockId ?? null)}
              >
                <Icon name="search" />
                <span>Open evidence</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 text-[12px] focus:bg-[var(--bg-elevated)] focus:text-[var(--text)]"
                disabled={reported}
                onSelect={() => {
                  void reportAnswer();
                }}
              >
                <Icon name={reported ? 'check' : 'flag'} />
                <span>{reported ? 'Reported' : 'Report answer'}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                variant="destructive"
                className="gap-2 text-[12px] focus:bg-red-500/10 focus:text-red-100"
                onSelect={() => {
                  void onDelete(msg.id);
                }}
              >
                <Icon name="trash" />
                <span>Delete message</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

function Suggestions({
  prompts,
  onPick,
}: {
  prompts: ConversationStarter[];
  onPick: (prompt: ConversationStarter) => void;
}) {
  if (prompts.length === 0) {
    return null;
  }

  return (
    <div className="suggestions flex flex-col gap-2">
      <div className="suggestions-label text-xs text-[var(--text-faint)]">Try asking</div>
      {prompts.map((prompt) => (
        <button key={prompt.q} type="button" className="suggestion-card group relative flex items-center gap-2.5 overflow-hidden rounded-lg bg-[var(--bg-elevated)] px-3 py-2.5 text-left text-[13px] text-[var(--text)] transition hover:bg-[var(--chat-accent)]" onClick={() => onPick(prompt)}>
          <div className="absolute inset-0 rounded-lg opacity-0 transition-opacity group-hover:opacity-100" style={{ boxShadow: '0 0 16px -4px var(--chat-accent-glow)' }} />
          <span className="suggestion-icon inline-flex h-[22px] w-[22px] items-center justify-center rounded-md bg-[var(--bg-elevated)] text-[var(--text-dim)] group-hover:text-[var(--accent-text)]"><Icon name={prompt.icon} /></span>
          <span>{prompt.q}</span>
        </button>
      ))}
    </div>
  );
}

function formatSessionTime(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return 'Recently';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function ChatSessionsView({
  sessions,
  activeSessionId,
  deletingSessionId,
  canCreateNewChat,
  onNewChat,
  onSelectSession,
  onDeleteSession,
}: {
  sessions: ChatSession[];
  activeSessionId: string | null;
  deletingSessionId: string | null;
  canCreateNewChat: boolean;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
}) {
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
  const deletePending = sessionToDelete?.id === deletingSessionId;

  // Empty (unsent) chats are hidden from history until they have a message.
  const visibleSessions = sessions.filter((session) => session.messageCount > 0);

  const confirmDelete = async () => {
    if (!sessionToDelete || deletePending) return;
    try {
      await onDeleteSession(sessionToDelete.id);
      setSessionToDelete(null);
    } catch {
      // The hook surfaces the API error in the chat panel.
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[var(--bg-base)] p-3">
        <div>
          <div className="text-[13px] font-semibold text-[var(--text)]">Conversations</div>
          <div className="mt-0.5 text-[11px] text-[var(--text-faint)]">
            {visibleSessions.length === 0
              ? 'No chats for this document yet'
              : visibleSessions.length === 1
                ? '1 chat for this document'
                : `${visibleSessions.length} chats for this document`}
          </div>
        </div>
        <button
          type="button"
          disabled={!canCreateNewChat}
          onClick={onNewChat}
          title={canCreateNewChat ? 'Start a new chat' : 'Please wait…'}
          className="inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-[12px] font-medium text-[var(--text-dim)] transition hover:bg-[var(--chat-accent)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-[var(--text-dim)]"
        >
          <Icon name="new-chat" />
          <span>New</span>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {visibleSessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/12 px-3 py-6 text-center">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-[var(--text-dim)]">
              <Icon name="new-chat" />
            </div>
            <div className="text-[13px] font-medium text-[var(--text)]">Start the first chat</div>
            <p className="mx-auto mt-1 max-w-[230px] text-[11.5px] leading-relaxed text-[var(--text-faint)]">
              Create a chat here or go back to Chat and ask your first question.
            </p>
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {visibleSessions.map((session) => {
            const active = session.id === activeSessionId;
            const deleting = session.id === deletingSessionId;
            const label = session.title?.trim() || 'New chat';
            const messageCopy = session.messageCount === 0
              ? 'Empty'
              : `${session.messageCount} message${session.messageCount === 1 ? '' : 's'}`;
            return (
              <motion.div
                key={session.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={`group flex items-center gap-2 overflow-hidden rounded-lg border px-2.5 py-2.5 transition ${
                  active
                    ? 'border-transparent bg-[var(--chat-accent)] text-[var(--text)]'
                    : 'border-white/10 bg-[var(--bg-base)] text-[var(--text-dim)] hover:border-white/20 hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]'
                } ${deleting ? 'pointer-events-none opacity-65' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => onSelectSession(session.id)}
                  disabled={deleting}
                  className="min-w-0 flex-1 text-left outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]"
                  title={label}
                >
                  <span className="block truncate text-[13px] font-medium">{label}</span>
                  <span className="mt-1 block text-[11px] text-[var(--text-faint)]">
                    {messageCopy} · {formatSessionTime(session.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSessionToDelete(session)}
                  disabled={deleting}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-faint)] transition hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/50 disabled:cursor-wait"
                  title={`Delete ${label}`}
                  aria-label={`Delete ${label}`}
                >
                  {deleting ? <NibLogo size={15} className="animate-spin text-white" /> : <Icon name="trash" />}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <Dialog.Root
        open={sessionToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deletePending) setSessionToDelete(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(360px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-[var(--bg-surface)] p-4 text-[var(--text)] shadow-2xl focus:outline-none">
            <Dialog.Title className="text-[14px] font-semibold">Delete chat?</Dialog.Title>
            <Dialog.Description className="mt-2 text-[12px] leading-relaxed text-[var(--text-dim)]">
              This removes &quot;{sessionToDelete?.title?.trim() || 'New chat'}&quot; from this document&apos;s chat history.
            </Dialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={deletePending}
                  className="inline-flex h-8 items-center rounded-md border border-white/10 px-3 text-[12px] font-medium text-[var(--text-dim)] transition hover:bg-white/5 hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={() => {
                  void confirmDelete();
                }}
                disabled={deletePending}
                className="inline-flex h-8 min-w-20 items-center justify-center gap-2 rounded-md bg-red-600 px-3 text-[12px] font-semibold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-80"
              >
                {deletePending ? <NibLogo size={15} className="animate-spin text-white" /> : <Icon name="trash" />}
                <span>{deletePending ? 'Deleting' : 'Delete'}</span>
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function useThinkingPreviewEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEnabled(process.env.NODE_ENV === 'development' && params.has('previewThinking'));
  }, []);

  return enabled;
}

function Composer({
  onSend,
  disabled,
  thinking,
}: {
  onSend: (value: string) => void;
  disabled: boolean;
  thinking: boolean;
}) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasText = value.trim().length > 0;
  const canSend = hasText && !disabled;

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
    <div className="border-t border-[var(--border-faint)] bg-[linear-gradient(180deg,var(--bg-elevated)_0%,var(--bg-surface)_60%)] px-3.5 pb-3.5 pt-3">
      <div className="composer-inner group">
        <BorderBeam
          active={thinking}
          borderRadius={12}
          brightness={1.35}
          className="composer-input-beam-frame"
          colorVariant="colorful"
          duration={2.3}
          size="pulse-outside"
          strength={thinking ? 0.9 : 0}
          theme="dark"
        >
          <div className="composer-input-box relative rounded-xl border border-[var(--border-strong)] bg-[var(--bg-base)] transition-all focus-within:border-[var(--chat-accent-line)] focus-within:[box-shadow:0_0_0_3px_var(--chat-accent),0_0_24px_-4px_var(--chat-accent-glow)]">
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
            <button
              className={`send-btn absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg transition ${
                canSend
                  ? 'bg-[var(--text)] text-[var(--bg-base)] shadow-sm hover:opacity-90'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-faint)]'
              }`}
              type="button"
              disabled={!canSend}
              onClick={submit}
              title="Send (Enter)"
            >
              <Icon name="send" />
            </button>
          </div>
        </BorderBeam>
        <div className="composer-bar px-2.5 pt-1.5">
          <div className="composer-hint flex items-center gap-1 text-[11px] text-[var(--text-faint)]">
            <kbd className="rounded border border-[var(--border-faint)] bg-[var(--bg-elevated)] px-1 font-mono text-[10px]">↵</kbd>
            <span>send ·</span>
            <kbd className="rounded border border-[var(--border-faint)] bg-[var(--bg-elevated)] px-1 font-mono text-[10px]">⇧↵</kbd>
            <span>newline · answers cite document</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function IndexingBanner({
  pagesProcessed,
  pagesTotal,
}: {
  pagesProcessed: number;
  pagesTotal: number | null;
}) {
  const { percent, pagesProcessed: displayPages } = useIndexingDisplay(
    pagesProcessed,
    pagesTotal,
    false,
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
        </span>
        <span className="text-[13.5px] font-semibold text-[var(--text)]">Indexing document…</span>
      </div>

      {pagesTotal !== null && pagesTotal > 0 ? (
        <IndexingProgressBar
          display={percent}
          pagesProcessed={displayPages}
          pagesTotal={pagesTotal}
          className="w-52"
        />
      ) : null}

      <p className="max-w-[220px] text-[12px] leading-relaxed text-[var(--text-faint)]">
        Embedding text into pgvector so you can ask questions. This usually takes under a minute.
      </p>
    </div>
  );
}

export function ChatPanel({
  sessions,
  activeSessionId,
  starters,
  messages,
  chatError,
  isLoadingMessages,
  canSubmitPrompt,
  deletingSessionId,
  onSendPrompt,
  onPickSuggestion,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onRegenerateResponse,
  onRemoveMessage,
  onReportMessage,
  canCreateNewChat,
  onCiteClick,
  onEvidenceOpen,
  busy,
  isWaitingForResponse,
  onToggleMinimize,
  isIndexing,
  progress,
  pagesProcessed,
  pagesTotal,
}: {
  sessions: ChatSession[];
  activeSessionId: string | null;
  starters: ConversationStarter[];
  messages: Array<UserMessage | AssistantMessage>;
  chatError: string | null;
  isLoadingMessages: boolean;
  canSubmitPrompt: boolean;
  deletingSessionId: string | null;
  onSendPrompt: (value: string) => void;
  onPickSuggestion: (prompt: ConversationStarter | { reset: true }) => void;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onRegenerateResponse: (messageId: string) => void;
  onRemoveMessage: (messageId: string) => Promise<void>;
  onReportMessage: (messageId: string) => Promise<void>;
  canCreateNewChat: boolean;
  onCiteClick: (citation: Citation) => void;
  onEvidenceOpen: (citations: Citation[], focusedBlockId: string | null) => void;
  busy: boolean;
  isWaitingForResponse: boolean;
  onToggleMinimize: () => void;
  isIndexing: boolean;
  progress: number;
  pagesProcessed: number;
  pagesTotal: number | null;
}) {
  const { settings } = useSettings();
  const [hover, setHover] = useState<{ citation: Citation; anchor: HTMLElement } | null>(null);
  // Open straight into a (new, empty) chat when a document is opened.
  const [activeView, setActiveView] = useState<'chat' | 'sessions'>('chat');
  const previewThinking = useThinkingPreviewEnabled();
  const bodyRef = useRef<HTMLDivElement>(null);
  const showChatView = activeView === 'chat';

  const subtitle = isIndexing
    ? `Indexing… ${pagesProcessed}${pagesTotal !== null ? `/${pagesTotal}` : ''} pages`
    : pagesTotal !== null && pagesTotal > 0
      ? `${pagesTotal} pages indexed · answers grounded in source`
      : 'Answers grounded in document source';

  const thinkingPreviewMessage: AssistantMessage = useMemo(
    () => ({
      id: 'thinking-preview',
      role: 'assistant',
      reasoning: [],
      reasoningShown: [],
      segments: [],
      citations: [],
      confidence: 0.8,
      streaming: true,
      streamDone: false,
      streamedText: '',
      animate: false,
    }),
    [],
  );
  const isThinking = isWaitingForResponse || previewThinking;
  const displayedMessages: Array<UserMessage | AssistantMessage> = useMemo(
    () =>
      previewThinking && showChatView
        ? [...messages.filter((message) => message.id !== thinkingPreviewMessage.id), thinkingPreviewMessage]
        : messages,
    [messages, previewThinking, showChatView, thinkingPreviewMessage],
  );

  useEffect(() => {
    const body = bodyRef.current;
    if (body && settings.autoScrollOnAnswer) {
      body.scrollTop = body.scrollHeight;
    }
  }, [displayedMessages, settings.autoScrollOnAnswer]);

  const isEmpty = displayedMessages.length === 0;
  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const activeSessionTitle = activeSession?.title?.trim() || 'New chat';

  const handleNewChat = () => {
    if (!canCreateNewChat) {
      return;
    }
    onNewChat();
    setActiveView('chat');
  };

  const handleSelectSession = (nextSessionId: string) => {
    onSelectSession(nextSessionId);
    setActiveView('chat');
  };

  return (
    <BorderBeam
      active={isThinking}
      borderRadius={0}
      brightness={1.25}
      className="chat-beam-frame"
      colorVariant="colorful"
      duration={2.3}
      size="pulse-inner"
      strength={isThinking ? 0.95 : 0}
      theme="dark"
    >
      <div className={`chat relative grid h-full min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden border-l border-white/10 bg-[var(--bg-surface)]${isThinking ? ' is-thinking' : ''}`}>
        <div className="chat-header relative z-[1] flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <div className="chat-title flex items-center gap-2 text-[13px] font-semibold">
              {isIndexing ? 'Indexing…' : 'Ask this document'}
            </div>
            <div className="chat-subtitle mt-0.5 truncate text-[11px] text-[var(--text-faint)]">
              {showChatView ? subtitle : activeSessionTitle}
            </div>
          </div>
          <div className="chat-header-actions flex shrink-0 items-center gap-1">
            <div className="flex rounded-lg bg-[var(--bg-base)] p-1" role="tablist" aria-label="Chat views">
              <button
                type="button"
                role="tab"
                aria-selected={showChatView}
                onClick={() => setActiveView('chat')}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                  showChatView
                    ? 'bg-[var(--bg-elevated)] text-[var(--text)]'
                    : 'text-[var(--text-faint)] hover:bg-white/5 hover:text-[var(--text-dim)]'
                }`}
              >
                Chat
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!showChatView}
                onClick={() => setActiveView('sessions')}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                  !showChatView
                    ? 'bg-[var(--bg-elevated)] text-[var(--text)]'
                    : 'text-[var(--text-faint)] hover:bg-white/5 hover:text-[var(--text-dim)]'
                }`}
              >
                Chats
              </button>
            </div>
            <button
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-dim)] transition hover:bg-[var(--chat-accent)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--text-dim)]"
              type="button"
              title={canCreateNewChat ? 'New conversation' : 'Please wait…'}
              onClick={handleNewChat}
              disabled={!canCreateNewChat}
            >
              <Icon name="new-chat" />
            </button>
            <button className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-dim)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]" type="button" title="Minimize chat" onClick={onToggleMinimize}><Icon name="close" /></button>
          </div>
        </div>

      <div className="chat-body relative z-[1] flex flex-col gap-[18px] overflow-y-auto p-4" ref={bodyRef}>
        {chatError ? (
          <div className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-[12px] leading-relaxed text-red-100">
            {chatError}
          </div>
        ) : null}

        {!showChatView ? (
          <ChatSessionsView
            sessions={sessions}
            activeSessionId={activeSessionId}
            deletingSessionId={deletingSessionId}
            canCreateNewChat={canCreateNewChat}
            onNewChat={handleNewChat}
            onSelectSession={handleSelectSession}
            onDeleteSession={onDeleteSession}
          />
        ) : isIndexing ? (
          <IndexingBanner
            pagesProcessed={pagesProcessed}
            pagesTotal={pagesTotal}
          />
        ) : isLoadingMessages ? (
          <div className="chat-loading-state flex min-h-full flex-1 items-center justify-center py-16">
            <LogoLoader size={46} color="#FFFFFF" />
            <span className="sr-only">Loading chat</span>
          </div>
        ) : (
          <>
            {isEmpty ? (
              <div className="chat-empty flex flex-col gap-4">
                <div className="chat-welcome pb-3">
                  <h2 className="mb-1 text-base font-semibold">Ask anything about this document</h2>
                  <p className="text-[12.5px] leading-[1.45] text-[var(--text-dim)]">
                    Every answer is grounded in the indexed pages and includes clickable page-level citations.
                  </p>
                </div>
                <Suggestions prompts={starters} onPick={(prompt) => onPickSuggestion(prompt)} />
              </div>
            ) : null}

            {displayedMessages.map((message) =>
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
                  onRegenerate={onRegenerateResponse}
                  onDelete={onRemoveMessage}
                  onReport={onReportMessage}
                  showConfidence={settings.showConfidence}
                />
              ),
            )}

          </>
        )}
      </div>

      {showChatView ? (
        <Composer onSend={onSendPrompt} disabled={!canSubmitPrompt || isIndexing || previewThinking} thinking={isThinking} />
      ) : (
        <div className="relative z-[1] border-t border-white/10 bg-[var(--bg-surface)] px-4 py-3 text-[11px] text-[var(--text-faint)]">
          Select a conversation to continue, or ask in the current chat before starting another.
        </div>
      )}
      {/* hover ? <CitePreview data={hover.citation} anchor={hover.anchor} /> : null */}
    </div>
    </BorderBeam>
  );
}
